/**
 * Startet die erste Power Story (Engel-Flow) serverseitig.
 *
 * Neuer Entwurf:   { email, questionAnswers }
 * Link erneut / andere Adresse: { draftId, key, email? }
 *
 * Ist die Person bereits eingeloggt, wird keine E-Mail verschickt; der Entwurf
 * gehört sofort ihrem Account und erscheint im Dashboard, sobald er fertig ist.
 *
 * Hat der Account schon Storys (Flow schon einmal durchlaufen, Klient:in, …),
 * entsteht keine zweite Engel-Story: Eingeloggt geht es direkt ins Dashboard,
 * sonst kommt ein normaler Anmeldelink. Kein zweites Onboarding.
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { sendFirstStoryLinkEmail, sendSignInLinkEmail } from '@/lib/email';
import { createInvite } from '@/lib/invites';
import { FIRST_STORY_VOICE_ID, isFirstStoryServerFlowEnabled } from '@/lib/first-story/config';
import {
  accountHasStories,
  attachDraftToUser,
  claimFirstStoryDraft,
  clientIp,
  createFirstStoryLink,
  createResumeKey,
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
const MAX_SIGN_IN_LINKS_PER_EMAIL_PER_DAY = 5;
/** Anmeldelinks für bestehende Accounts sind kürzer gültig als die Erststory-Links. */
const SIGN_IN_LINK_DAYS = 7;

function error(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type AdminClient = Awaited<ReturnType<typeof createServerAdminClient>>;

/**
 * Bestehender Account: normaler Zugangslink (/zugang/<token> → /dashboard)
 * statt einer zweiten Engel-Story. Antwortet wie ein neuer Entwurf, nur ohne
 * draftId – der Browser zeigt "Schau in dein Postfach" und fragt nichts ab.
 */
async function sendSignInLink(admin: AdminClient, email: string, userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await (admin as any)
    .from('power_story_invites')
    .select('created_at')
    .eq('email', email)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  const lastSentAt = recent?.[0]?.created_at ? new Date(recent[0].created_at).getTime() : 0;
  const waited = (Date.now() - lastSentAt) / 1000;
  if (waited < RESEND_COOLDOWN_SECONDS) {
    const retryAfter = Math.ceil(RESEND_COOLDOWN_SECONDS - waited);
    return error('Bitte warte kurz, bevor du einen neuen Link anforderst.', 429, { retryAfter });
  }
  if ((recent?.length ?? 0) >= MAX_SIGN_IN_LINKS_PER_EMAIL_PER_DAY) {
    return error('Für diese Adresse wurden heute schon mehrere Links angefordert. Bitte schau in dein Postfach oder versuche es morgen erneut.', 429);
  }

  const invite = await createInvite({ email, userId, expiresInDays: SIGN_IN_LINK_DAYS });
  const sent = await sendSignInLinkEmail({ to: email, link: invite.url, expiresAt: invite.expiresAt });
  if (!sent.success) return error('Der Link konnte nicht gesendet werden. Bitte versuche es erneut.', 502);

  console.log('[FirstStory/start] Bestehender Account – Anmeldelink statt neuer Story');
  return NextResponse.json({ email, emailSent: true });
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
        if (!draft.user_id) {
          if (await accountHasStories(admin, sessionUser.id)) {
            return NextResponse.json({ signedIn: true, existingAccount: true });
          }
          await attachDraftToUser(admin, draft.id, sessionUser.id);
        }
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
        const otherUserId = await findUserIdByEmail(admin, email);
        if (otherUserId && (await accountHasStories(admin, otherUserId))) {
          return sendSignInLink(admin, email, otherUserId);
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
      if (await accountHasStories(admin, sessionUser.id)) {
        return NextResponse.json({ signedIn: true, existingAccount: true });
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

    const existingUserId = await findUserIdByEmail(admin, email);
    if (existingUserId && (await accountHasStories(admin, existingUserId))) {
      return sendSignInLink(admin, email, existingUserId);
    }

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

    const { data: draft, error: insertError } = await (admin as any)
      .from('first_story_drafts')
      .insert({ ...baseRow, email, last_email_sent_at: new Date().toISOString() })
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

    after(() => processFirstStoryDraft(draft.id));
    return NextResponse.json({ draftId: draft.id, key, email, emailSent: true });
  } catch (e) {
    console.error('[FirstStory/start] Fehler:', e);
    return error('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.', 500);
  }
}
