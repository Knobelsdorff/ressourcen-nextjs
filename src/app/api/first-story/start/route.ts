/**
 * Startet die erste Power Story (Engel-Flow) serverseitig.
 *
 * Neuer Entwurf:   { email, questionAnswers }
 * Link erneut / andere Adresse: { draftId, key, email? }
 *
 * Ist die Person bereits eingeloggt, wird keine E-Mail verschickt; der Entwurf
 * gehört sofort ihrem Account und erscheint im Dashboard, sobald er fertig ist.
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { sendFirstStoryLinkEmail } from '@/lib/email';
import { FIRST_STORY_VOICE_ID, isFirstStoryServerFlowEnabled } from '@/lib/first-story/config';
import {
  attachDraftToUser,
  claimFirstStoryDraft,
  clientIp,
  createFirstStoryLink,
  createResumeKey,
  findFirstStoryForUser,
  findUserIdByEmail,
  getFirstStoryFigure,
  getSessionUser,
  linkBaseUrl,
  loadDraft,
  normalizeEmail,
  processFirstStoryDraft,
  resumeKeyMatches,
  sanitizeQuestionAnswers,
} from '@/lib/first-story/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_DRAFTS_PER_EMAIL_PER_DAY = 3;
const MAX_DRAFTS_PER_IP_PER_DAY = 10;

function error(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: NextRequest) {
  if (!isFirstStoryServerFlowEnabled()) {
    return error('Nicht verfügbar', 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return error('Ungültige Anfrage', 400);
  }

  try {
    const admin = await createServerAdminClient();
    const baseUrl = linkBaseUrl(request);

    // -----------------------------------------------------------------------
    // Link erneut senden (optional an eine andere Adresse)
    // -----------------------------------------------------------------------
    if (typeof body.draftId === 'string') {
      const draft = await loadDraft(admin, body.draftId);
      if (!draft || !resumeKeyMatches(body.key, draft.resume_key_hash)) {
        return error('Dieser Entwurf ist nicht mehr verfügbar.', 404, { code: 'draft_not_found' });
      }

      // Inzwischen eingeloggt (z.B. Link im selben Browser geöffnet): Entwurf
      // übernehmen statt einen neuen anzulegen. Nur mit derselben Adresse.
      if (body.adopt === true) {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser?.email) return error('Nicht angemeldet', 401);
        if (sessionUser.email.toLowerCase() !== draft.email) {
          return error(`Der Link wurde an ${draft.email} geschickt. Öffne ihn, um deine Story diesem Account zuzuordnen.`, 409, { code: 'account_mismatch' });
        }
        if (!draft.user_id) await attachDraftToUser(admin, draft.id, sessionUser.id);
        const storyId = await claimFirstStoryDraft(draft.id);
        if (!storyId) after(() => processFirstStoryDraft(draft.id));
        return NextResponse.json({ draftId: draft.id, signedIn: true });
      }

      const email = body.email === undefined ? draft.email : normalizeEmail(body.email);
      if (!email) return error('Bitte gib eine gültige E-Mail-Adresse ein.', 400);

      if (email !== draft.email) {
        // Wurde der Link schon geöffnet, gehört der Entwurf bereits einem Account.
        if (draft.user_id) {
          return error('Deine Power Story ist bereits einem Account zugeordnet.', 409, { code: 'email_locked' });
        }
        const { error: updateError } = await (admin as any)
          .from('first_story_drafts')
          .update({ email })
          .eq('id', draft.id)
          .is('user_id', null);
        if (updateError) throw new Error(updateError.message);
      }

      if (draft.last_email_sent_at) {
        const waited = (Date.now() - new Date(draft.last_email_sent_at).getTime()) / 1000;
        if (waited < RESEND_COOLDOWN_SECONDS) {
          const retryAfter = Math.ceil(RESEND_COOLDOWN_SECONDS - waited);
          return error('Bitte warte kurz, bevor du einen neuen Link anforderst.', 429, { retryAfter });
        }
      }

      const link = createFirstStoryLink(draft.id, baseUrl);
      const sent = await sendFirstStoryLinkEmail({ to: email, link: link.url, expiresAt: link.expiresAt });
      if (!sent.success) return error('Der Link konnte nicht gesendet werden. Bitte versuche es erneut.', 502);

      await (admin as any)
        .from('first_story_drafts')
        .update({ last_email_sent_at: new Date().toISOString() })
        .eq('id', draft.id);

      after(() => processFirstStoryDraft(draft.id));
      return NextResponse.json({ draftId: draft.id, email, emailSent: true });
    }

    // -----------------------------------------------------------------------
    // Neuer Entwurf
    // -----------------------------------------------------------------------
    const questionAnswers = sanitizeQuestionAnswers(body.questionAnswers);
    if (!questionAnswers) return error('Deine Antworten fehlen. Bitte beantworte die Fragen erneut.', 400);

    const figure = getFirstStoryFigure();
    const { key, hash } = createResumeKey();
    const ip = clientIp(request);
    const baseRow = {
      figure_name: figure.name,
      voice_id: FIRST_STORY_VOICE_ID,
      question_answers: questionAnswers,
      resume_key_hash: hash,
      request_ip: ip,
    };

    const sessionUser = await getSessionUser(request);
    if (sessionUser?.email) {
      const existingStoryId = await findFirstStoryForUser(admin, sessionUser.id);
      if (existingStoryId) {
        return NextResponse.json({ signedIn: true, alreadyHasFirstStory: true });
      }

      const { data: draft, error: insertError } = await (admin as any)
        .from('first_story_drafts')
        .insert({ ...baseRow, email: sessionUser.email.toLowerCase(), user_id: sessionUser.id })
        .select('id')
        .single();
      if (insertError || !draft) throw new Error(insertError?.message ?? 'Entwurf konnte nicht angelegt werden');

      after(() => processFirstStoryDraft(draft.id));
      return NextResponse.json({ draftId: draft.id, key, signedIn: true });
    }

    const email = normalizeEmail(body.email);
    if (!email) return error('Bitte gib eine gültige E-Mail-Adresse ein.', 400);

    // Kosten- und Spam-Bremse: Jeder Entwurf löst KI-Text, Audio und eine E-Mail aus.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: emailCount } = await (admin as any)
      .from('first_story_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', since);
    if ((emailCount ?? 0) >= MAX_DRAFTS_PER_EMAIL_PER_DAY) {
      return error('Für diese Adresse wurden heute schon mehrere Storys angefragt. Bitte schau in dein Postfach oder versuche es morgen erneut.', 429);
    }
    if (ip) {
      const { count: ipCount } = await (admin as any)
        .from('first_story_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('request_ip', ip)
        .gte('created_at', since);
      if ((ipCount ?? 0) >= MAX_DRAFTS_PER_IP_PER_DAY) {
        return error('Bitte versuche es später erneut.', 429);
      }
    }

    // Hat der Account schon eine Erststory, wird keine zweite erzeugt – der
    // Link führt dann einfach zur vorhandenen. Die Antwort verrät das nicht.
    const existingUserId = await findUserIdByEmail(admin, email);
    const existingStoryId = existingUserId ? await findFirstStoryForUser(admin, existingUserId) : null;

    const { data: draft, error: insertError } = await (admin as any)
      .from('first_story_drafts')
      .insert({
        ...baseRow,
        email,
        last_email_sent_at: new Date().toISOString(),
        ...(existingStoryId ? { status: 'claimed', saved_story_id: existingStoryId } : {}),
      })
      .select('id')
      .single();
    if (insertError || !draft) throw new Error(insertError?.message ?? 'Entwurf konnte nicht angelegt werden');

    const link = createFirstStoryLink(draft.id, baseUrl);
    const sent = await sendFirstStoryLinkEmail({ to: email, link: link.url, expiresAt: link.expiresAt });
    if (!sent.success) {
      // Ohne E-Mail ist der Entwurf nicht erreichbar – nichts erzeugen.
      await (admin as any).from('first_story_drafts').delete().eq('id', draft.id);
      return error('Der Link konnte nicht gesendet werden. Bitte versuche es erneut.', 502);
    }

    if (!existingStoryId) after(() => processFirstStoryDraft(draft.id));
    return NextResponse.json({ draftId: draft.id, key, email, emailSent: true });
  } catch (e) {
    console.error('[FirstStory/start] Fehler:', e);
    return error('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.', 500);
  }
}
