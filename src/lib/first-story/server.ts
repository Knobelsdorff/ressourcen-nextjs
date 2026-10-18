/**
 * Erststory-Flow, Serverseite.
 *
 * Ablauf:
 *   1. /api/first-story/start legt einen Entwurf an und verschickt den Link.
 *   2. processFirstStoryDraft() erzeugt Text + Audio (im Hintergrund, fortsetzbar).
 *   3. /willkommen/[token] meldet an und ordnet den Entwurf dem Account zu.
 *   4. claimFirstStoryDraft() legt genau eine saved_stories-Zeile an.
 *
 * Schritt 2 und 3 laufen unabhängig voneinander. Wer zuletzt fertig wird,
 * speichert. Die Datenbankfunktion first_story_claim_draft ist idempotent,
 * deshalb ist es egal, wie oft oder parallel sie aufgerufen wird.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { fictionalFigures } from '@/data/figures';
import { AnswerEntry, generateStoryText } from '@/lib/story-text';
import { getAppBaseUrl } from '@/lib/app-url';
import { FIRST_STORY_FIGURE_ID, FIRST_STORY_LINK_DAYS, FirstStoryPhase } from './config';

type AdminClient = Awaited<ReturnType<typeof createServerAdminClient>>;

export interface FirstStoryDraft {
  id: string;
  email: string;
  figure_name: string;
  voice_id: string;
  question_answers: AnswerEntry[];
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'claimed';
  story_text: string | null;
  audio_url: string | null;
  last_error: string | null;
  attempts: number;
  locked_at: string | null;
  user_id: string | null;
  saved_story_id: string | null;
  resume_key_hash: string;
  last_email_sent_at: string | null;
  created_at: string;
}

const DRAFT_COLUMNS =
  'id, email, figure_name, voice_id, question_answers, status, story_text, audio_url, last_error, attempts, locked_at, user_id, saved_story_id, resume_key_hash, last_email_sent_at, created_at';

/** Automatische Versuche (Dashboard/Fortschrittsanzeige stoßen sie an). */
export const AUTO_ATTEMPTS = 3;
/** Obergrenze, wenn die Person selbst "Erneut versuchen" drückt. */
export const MANUAL_RETRY_ATTEMPTS = 6;
/** Muss zu p_stale_seconds in first_story_lock_draft passen. */
const STALE_LOCK_SECONDS = 150;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getFirstStoryFigure() {
  const figure = fictionalFigures.find((f) => f.id === FIRST_STORY_FIGURE_ID);
  if (!figure) throw new Error(`Figur ${FIRST_STORY_FIGURE_ID} nicht gefunden`);
  return figure;
}

// ---------------------------------------------------------------------------
// Request-Helfer
// ---------------------------------------------------------------------------

export function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}

/**
 * Öffentliche Herkunft dieses Requests (für Redirects). Nicht request.url:
 * Hinter `next start -H 0.0.0.0` wäre das http://0.0.0.0:3000.
 */
export function requestOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return getAppBaseUrl();
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  const proto = isLocal ? 'http' : request.headers.get('x-forwarded-proto') === 'http' ? 'http' : 'https';
  return `${proto}://${host}`;
}

/** Basis-URL für den Link in der E-Mail. In Produktion immer APP_BASE_URL. */
export function linkBaseUrl(request: NextRequest): string {
  return process.env.NODE_ENV === 'production' ? getAppBaseUrl() : requestOrigin(request);
}

/** Eingeloggter User aus den Request-Cookies (nur lesend). */
export async function getSessionUser(request: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Nur lesen – die Middleware erneuert die Session.
        },
      },
    }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** Nimmt nur die Felder an, die der Fragen-Schritt tatsächlich erzeugt. */
export function sanitizeQuestionAnswers(input: unknown): AnswerEntry[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 10) return null;

  const strings = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string').slice(0, 30).map((v) => v.slice(0, 500))
      : [];

  const answers: AnswerEntry[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') return null;
    const raw = entry as Record<string, unknown>;
    const questionId = Number(raw.questionId);
    if (!Number.isInteger(questionId) || questionId < 1 || questionId > 10) return null;
    answers.push({
      questionId,
      answer: typeof raw.answer === 'string' ? raw.answer.slice(0, 2000) : '',
      selectedBlocks: strings(raw.selectedBlocks),
      customBlocks: strings(raw.customBlocks),
    });
  }

  const hasContent = answers.some((a) => (a.answer ?? '').trim() || (a.selectedBlocks?.length ?? 0) > 0);
  return hasContent ? answers : null;
}

// ---------------------------------------------------------------------------
// Schlüssel und signierter Link
// ---------------------------------------------------------------------------

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Schlüssel, den nur der Browser kennt, der den Entwurf angelegt hat. */
export function createResumeKey(): { key: string; hash: string } {
  const key = randomBytes(24).toString('base64url');
  return { key, hash: sha256(key) };
}

export function resumeKeyMatches(key: unknown, hash: string): boolean {
  return typeof key === 'string' && key.length > 0 && safeEqual(sha256(key), hash);
}

function linkSecret(): string {
  const secret =
    process.env.FIRST_STORY_LINK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.PRIVATE_SUPABASE_SERVICE_KEY;
  if (!secret) throw new Error('FIRST_STORY_LINK_SECRET bzw. SUPABASE_SERVICE_ROLE_KEY fehlt');
  return secret;
}

function signLinkPayload(payload: string): string {
  return createHmac('sha256', linkSecret()).update(`first-story-link:v1:${payload}`).digest('base64url');
}

/**
 * Signierter Link `<base>/willkommen/<draftId>.<ablauf>.<signatur>`.
 * Nichts davon wird gespeichert; jeder erneut versendete Link bleibt gültig.
 */
export function createFirstStoryLink(draftId: string, baseUrl: string): { url: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + FIRST_STORY_LINK_DAYS * 24 * 60 * 60 * 1000);
  const payload = `${draftId}.${Math.floor(expiresAt.getTime() / 1000)}`;
  const token = `${payload}.${signLinkPayload(payload)}`;
  return { url: `${baseUrl.replace(/\/+$/, '')}/willkommen/${token}`, expiresAt };
}

export function verifyFirstStoryLinkToken(token: string): { draftId: string; expired: boolean } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [draftId, expires, signature] = parts;
  if (!UUID_RE.test(draftId) || !/^\d{1,12}$/.test(expires)) return null;
  if (!safeEqual(signature, signLinkPayload(`${draftId}.${expires}`))) return null;
  return { draftId, expired: Number(expires) * 1000 < Date.now() };
}

// ---------------------------------------------------------------------------
// Datenbank
// ---------------------------------------------------------------------------

export async function loadDraft(admin: AdminClient, draftId: string): Promise<FirstStoryDraft | null> {
  if (!UUID_RE.test(draftId)) return null;
  const { data, error } = await (admin as any)
    .from('first_story_drafts')
    .select(DRAFT_COLUMNS)
    .eq('id', draftId)
    .maybeSingle();
  if (error) {
    console.error('[FirstStory] Entwurf konnte nicht geladen werden:', error.message);
    return null;
  }
  return data as FirstStoryDraft | null;
}

export async function loadLatestDraftForUser(admin: AdminClient, userId: string): Promise<FirstStoryDraft | null> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await (admin as any)
    .from('first_story_drafts')
    .select(DRAFT_COLUMNS)
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[FirstStory] Entwurf des Users konnte nicht geladen werden:', error.message);
    return null;
  }
  return data as FirstStoryDraft | null;
}

async function updateDraft(admin: AdminClient, draftId: string, values: Record<string, unknown>) {
  const { error } = await (admin as any).from('first_story_drafts').update(values).eq('id', draftId);
  if (error) throw new Error(`Entwurf konnte nicht aktualisiert werden: ${error.message}`);
}

/** Ordnet den Entwurf einem Account zu – nur, wenn er noch niemandem gehört. */
export async function attachDraftToUser(admin: AdminClient, draftId: string, userId: string): Promise<void> {
  const { error } = await (admin as any)
    .from('first_story_drafts')
    .update({ user_id: userId })
    .eq('id', draftId)
    .is('user_id', null);
  if (error) console.error('[FirstStory] Zuordnung fehlgeschlagen:', error.message);
}

/** Gibt die Story-ID zurück, sobald der Entwurf fertig UND zugeordnet ist. Idempotent. */
export async function claimFirstStoryDraft(draftId: string): Promise<string | null> {
  const admin = await createServerAdminClient();
  const { data, error } = await (admin as any).rpc('first_story_claim_draft', { p_draft_id: draftId });
  if (error) {
    console.error('[FirstStory] first_story_claim_draft fehlgeschlagen:', error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

/** Bestehende Erststory eines Accounts (es kann höchstens eine geben). */
export async function findFirstStoryForUser(admin: AdminClient, userId: string): Promise<string | null> {
  const { data } = await (admin as any)
    .from('saved_stories')
    .select('id')
    .eq('user_id', userId)
    .not('first_story_draft_id', 'is', null)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function findUserIdByEmail(admin: AdminClient, email: string): Promise<string | null> {
  const { data } = await (admin as any)
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Fortschritt
// ---------------------------------------------------------------------------

function lockIsStale(draft: FirstStoryDraft): boolean {
  return !draft.locked_at || Date.now() - new Date(draft.locked_at).getTime() > STALE_LOCK_SECONDS * 1000;
}

/** Ob processFirstStoryDraft für diesen Entwurf (noch) etwas zu tun hat. */
export function draftNeedsWork(draft: FirstStoryDraft, maxAttempts = AUTO_ATTEMPTS): boolean {
  if (draft.attempts >= maxAttempts) return false;
  if (draft.status === 'pending' || draft.status === 'failed') return true;
  return draft.status === 'processing' && lockIsStale(draft);
}

export function draftPhase(draft: FirstStoryDraft | null): FirstStoryPhase {
  if (!draft) return 'none';
  if (draft.status === 'claimed') return 'claimed';
  if (draft.status === 'ready') return 'ready';
  const givenUp =
    draft.attempts >= AUTO_ATTEMPTS &&
    (draft.status === 'failed' || (draft.status === 'processing' && lockIsStale(draft)));
  if (givenUp) return 'failed';
  return draft.story_text ? 'audio' : 'text';
}

// ---------------------------------------------------------------------------
// Erzeugung
// ---------------------------------------------------------------------------

async function generateAudioUrl(text: string, voiceId: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ist nicht konfiguriert');

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}`, apikey: anonKey },
    body: JSON.stringify({ text, voiceId, adminPreview: false }),
    signal: AbortSignal.timeout(100_000),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`generate-audio ${response.status}: ${details.slice(0, 300)}`);
  }
  const result = await response.json();
  if (typeof result.audioUrl !== 'string' || !result.audioUrl) throw new Error('generate-audio lieferte keine audioUrl');
  return result.audioUrl;
}

/**
 * Erzeugt Text und Audio für einen Entwurf und speichert ihn, falls er schon
 * zugeordnet ist. Sicher bei parallelen Aufrufen: nur wer die Sperre bekommt,
 * arbeitet. Fortsetzbar: bereits erzeugter Text wird nicht neu erzeugt.
 */
export async function processFirstStoryDraft(draftId: string, maxAttempts = AUTO_ATTEMPTS): Promise<void> {
  const admin = await createServerAdminClient();
  const { data, error } = await (admin as any).rpc('first_story_lock_draft', {
    p_draft_id: draftId,
    p_max_attempts: maxAttempts,
  });
  if (error) {
    console.error('[FirstStory] first_story_lock_draft fehlgeschlagen:', error.message);
    return;
  }
  const draft = (Array.isArray(data) ? data[0] : data) as FirstStoryDraft | undefined;
  if (!draft) return; // Jemand anderes arbeitet daran oder es gibt nichts zu tun.

  try {
    let story = draft.story_text;
    if (!story) {
      console.log('[FirstStory] Erzeuge Text für', draftId, '– Versuch', draft.attempts);
      story = (
        await generateStoryText({
          selectedFigure: getFirstStoryFigure(),
          questionAnswers: draft.question_answers,
          sparModus: false,
        })
      ).trim();
      if (!story) throw new Error('Story-Text ist leer');
      // Sperre erneuern, damit die Audio-Erzeugung nicht als "hängend" gilt.
      await updateDraft(admin, draftId, { story_text: story, locked_at: new Date().toISOString() });
    }

    if (!draft.audio_url) {
      console.log('[FirstStory] Erzeuge Audio für', draftId);
      const audioUrl = await generateAudioUrl(story, draft.voice_id);
      await updateDraft(admin, draftId, { audio_url: audioUrl });
    }

    await updateDraft(admin, draftId, { status: 'ready', locked_at: null });
    const storyId = await claimFirstStoryDraft(draftId);
    console.log('[FirstStory] Entwurf fertig', draftId, storyId ? `→ Story ${storyId}` : '(wartet auf Link-Klick)');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[FirstStory] Erzeugung fehlgeschlagen für', draftId, message);
    await updateDraft(admin, draftId, { status: 'failed', locked_at: null, last_error: message.slice(0, 500) }).catch(
      (updateError) => console.error('[FirstStory] Fehlerstatus konnte nicht gespeichert werden:', updateError)
    );
  }
}
