/**
 * Story-Zugang, Serverseite: Wer darf welche Story abspielen?
 *
 *   always       → immer (Bestand, Therapie-Ressourcen, Audio-only, Gratis-Storys)
 *   trial        → Erststory: bis trial_ends_at, danach nur mit aktivem Zugang
 *   subscription → nur mit aktivem Zugang
 *
 * "Aktiver Zugang" ist dieselbe Bedingung wie has_active_access() in der
 * Datenbank – damit zählen Stripe-Abos UND manuell vergebene Zugänge.
 *
 * Durchgesetzt wird das über den Speicherort: Das Audio von trial-Storys und
 * gesperrten subscription-Storys liegt im privaten Bucket. Der Browser
 * bekommt nur einen kurzlebigen signierten Link, und den nur, wenn die Story
 * gerade abspielbar ist. Nichts wird gelöscht – nur verschoben.
 *
 * Ist die Migration noch nicht eingespielt, fehlt access_policy: Dann gilt
 * alles als 'always' und nichts ändert sich gegenüber vorher.
 */

import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import type { StoryAccess, StoryAccessPolicy } from './shared';

type AdminClient = Awaited<ReturnType<typeof createServerAdminClient>>;

export const PRIVATE_AUDIO_BUCKET = 'story-audio-private';
const PUBLIC_AUDIO_BUCKET = 'audio-files';
const PRIVATE_AUDIO_PREFIX = `private-storage:${PRIVATE_AUDIO_BUCKET}/`;
/** Lang genug für eine Hörsitzung; danach lädt das Dashboard neu. */
const SIGNED_URL_SECONDS = 12 * 60 * 60;
const PAYMENT_FAILED_STATUSES = new Set(['past_due', 'unpaid', 'incomplete']);

export interface StoryAccessFields {
  id: string;
  user_id: string | null;
  audio_url?: string | null;
  access_policy?: StoryAccessPolicy | null;
  trial_ends_at?: string | null;
  first_story_draft_id?: string | null;
}

export interface UserAccessState {
  hasActiveAccess: boolean;
  paymentFailed: boolean;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Zugang des Accounts
// ---------------------------------------------------------------------------

function adminEmails(): string[] {
  return [process.env.NEXT_PUBLIC_ADMIN_EMAILS, process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS]
    .flatMap((list) => (list || '').split(','))
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function loadUserAccessState(
  admin: AdminClient,
  userId: string,
  email?: string | null
): Promise<UserAccessState> {
  const isAdmin = !!email && adminEmails().includes(email.toLowerCase());

  const { data, error } = await (admin as any)
    .from('user_access')
    .select('status, subscription_status, access_expires_at')
    .eq('user_id', userId);
  if (error) {
    console.error('[StoryAccess] user_access konnte nicht geladen werden:', error.message);
  }

  const rows: { status: string; subscription_status: string | null; access_expires_at: string | null }[] = data ?? [];
  const now = Date.now();
  const hasActiveAccess = rows.some(
    (row) =>
      row.status === 'active' &&
      row.subscription_status === 'active' &&
      (!row.access_expires_at || new Date(row.access_expires_at).getTime() > now)
  );
  const paymentFailed = !hasActiveAccess && rows.some((row) => PAYMENT_FAILED_STATUSES.has(row.subscription_status ?? ''));

  return { hasActiveAccess, paymentFailed, isAdmin };
}

export function evaluateStoryAccess(story: StoryAccessFields, state: UserAccessState): StoryAccess {
  const policy: StoryAccessPolicy = story.access_policy ?? 'always';
  const trialEndsAt = policy === 'trial' ? story.trial_ends_at ?? null : null;

  if (policy === 'always' || state.isAdmin || state.hasActiveAccess) {
    return { policy, playable: true, lockReason: null, trialEndsAt, trialActive: false };
  }
  if (policy === 'trial' && trialEndsAt && new Date(trialEndsAt).getTime() > Date.now()) {
    return { policy, playable: true, lockReason: null, trialEndsAt, trialActive: true };
  }
  return {
    policy,
    playable: false,
    lockReason: state.paymentFailed ? 'payment_failed' : policy === 'trial' ? 'trial_ended' : 'subscription_inactive',
    trialEndsAt,
    trialActive: false,
  };
}

// ---------------------------------------------------------------------------
// Speicherorte
// ---------------------------------------------------------------------------

export function isPrivateAudioRef(audioUrl: string | null | undefined): boolean {
  return !!audioUrl && audioUrl.startsWith(PRIVATE_AUDIO_PREFIX);
}

function privateAudioPath(ref: string): string | null {
  if (!isPrivateAudioRef(ref)) return null;
  const path = ref.slice(PRIVATE_AUDIO_PREFIX.length);
  return path && !path.includes('..') ? path : null;
}

export function privateAudioRef(path: string): string {
  return `${PRIVATE_AUDIO_PREFIX}${path}`;
}

/** Pfad im öffentlichen Bucket – nur für Dateien in DIESEM Supabase-Projekt. */
export function publicAudioPath(audioUrl: string | null | undefined): string | null {
  if (!audioUrl) return null;
  try {
    const url = new URL(audioUrl);
    const projectHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    const marker = `/storage/v1/object/public/${PUBLIC_AUDIO_BUCKET}/`;
    if (url.host !== projectHost || !url.pathname.startsWith(marker)) return null;
    const path = decodeURIComponent(url.pathname.slice(marker.length));
    return path && !path.includes('..') ? path : null;
  } catch {
    return null;
  }
}

/**
 * Verschiebt eine Datei aus dem öffentlichen in den privaten Bucket und gibt
 * die neue Referenz zurück. Wirft, wenn das nicht klappt (z.B. Bucket fehlt).
 */
export async function movePublicAudioToPrivate(admin: AdminClient, sourcePath: string, targetPath: string): Promise<string> {
  const { error: moveError } = await admin.storage
    .from(PUBLIC_AUDIO_BUCKET)
    .move(sourcePath, targetPath, { destinationBucket: PRIVATE_AUDIO_BUCKET });
  if (!moveError) return privateAudioRef(targetPath);

  // Rückfallebene: kopieren, prüfen, erst dann die öffentliche Datei entfernen.
  const { data: file, error: downloadError } = await admin.storage.from(PUBLIC_AUDIO_BUCKET).download(sourcePath);
  if (downloadError || !file) {
    // Schon verschoben (paralleler Aufruf)? Dann ist das Ziel da.
    const { data: existing } = await admin.storage.from(PRIVATE_AUDIO_BUCKET).createSignedUrl(targetPath, 60);
    if (existing?.signedUrl) return privateAudioRef(targetPath);
    throw new Error(`Audio konnte nicht verschoben werden: ${moveError.message}`);
  }
  const { error: uploadError } = await admin.storage
    .from(PRIVATE_AUDIO_BUCKET)
    .upload(targetPath, file, { contentType: file.type || 'audio/mpeg', upsert: true });
  if (uploadError) throw new Error(`Audio konnte nicht privat gespeichert werden: ${uploadError.message}`);
  await admin.storage.from(PUBLIC_AUDIO_BUCKET).remove([sourcePath]);
  return privateAudioRef(targetPath);
}

function belongsToStory(path: string, story: StoryAccessFields): boolean {
  if (story.user_id && path.startsWith(`${story.user_id}/`)) return true;
  return !!story.first_story_draft_id && path.startsWith(`first-story/${story.first_story_draft_id}/`);
}

/** Signierter Link für privates Audio – nur, wenn die Datei zu dieser Story gehört. */
export async function signPrivateAudio(admin: AdminClient, ref: string, story?: StoryAccessFields): Promise<string | null> {
  const path = privateAudioPath(ref);
  if (!path || (story && !belongsToStory(path, story))) return null;
  const { data, error } = await admin.storage.from(PRIVATE_AUDIO_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error('[StoryAccess] Signierter Link fehlgeschlagen:', error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Nimmt das Audio einer zugangsbeschränkten Story aus dem öffentlichen Bucket.
 * Dateien, die auch andere Accounts verwenden (z.B. die Ankommen-Ressource),
 * bleiben unangetastet. Gibt die neue audio_url zurück oder null.
 */
export async function secureStoryAudio(admin: AdminClient, story: StoryAccessFields): Promise<string | null> {
  const publicUrl = story.audio_url;
  const sourcePath = publicAudioPath(publicUrl);
  if (!publicUrl || !sourcePath || !story.user_id) return null;

  const { count: sharedCount, error: sharedError } = await (admin as any)
    .from('saved_stories')
    .select('id', { count: 'exact', head: true })
    .eq('audio_url', publicUrl)
    .or(`user_id.is.null,user_id.neq.${story.user_id}`);
  if (sharedError || (sharedCount ?? 0) > 0) return null;

  const fileName = sourcePath.split('/').pop() || `${story.id}.mp3`;
  const ref = await movePublicAudioToPrivate(admin, sourcePath, `${story.user_id}/${story.id}/${fileName}`);

  // Auch Doppel-Zeilen desselben Accounts zeigen auf dieselbe Datei.
  const { error: updateError } = await (admin as any)
    .from('saved_stories')
    .update({ audio_url: ref })
    .eq('user_id', story.user_id)
    .eq('audio_url', publicUrl);
  if (updateError) console.error('[StoryAccess] audio_url konnte nicht aktualisiert werden:', updateError.message);

  await (admin as any).from('first_story_drafts').update({ audio_url: ref }).eq('audio_url', publicUrl);
  console.log('[StoryAccess] Audio privat gespeichert für Story', story.id);
  return ref;
}

// ---------------------------------------------------------------------------
// Für das Dashboard aufbereiten
// ---------------------------------------------------------------------------

/**
 * Ergänzt jede Story um `access` und ersetzt audio_url durch eine abspielbare
 * URL – oder null, wenn die Story gerade gesperrt ist.
 */
export async function presentStoriesForUser<T extends StoryAccessFields>(
  admin: AdminClient,
  stories: T[],
  user: { id: string; email?: string | null }
): Promise<(T & { access: StoryAccess })[]> {
  const state = await loadUserAccessState(admin, user.id, user.email);

  return Promise.all(
    stories.map(async (story) => {
      const access = evaluateStoryAccess(story, state);
      let audioUrl = story.audio_url ?? null;

      // Testphase immer, Abo-Storys sobald gesperrt: raus aus dem öffentlichen Bucket.
      const mustBePrivate = access.policy === 'trial' || (access.policy === 'subscription' && !access.playable);
      if (mustBePrivate && audioUrl && !isPrivateAudioRef(audioUrl)) {
        try {
          audioUrl = (await secureStoryAudio(admin, story)) ?? audioUrl;
        } catch (e) {
          console.error('[StoryAccess] Audio konnte nicht abgesichert werden:', story.id, e);
        }
      }

      if (!access.playable) {
        audioUrl = null;
      } else if (isPrivateAudioRef(audioUrl)) {
        audioUrl = await signPrivateAudio(admin, audioUrl!, story);
      }

      return { ...story, audio_url: audioUrl, access };
    })
  );
}

/**
 * Für Admin-Ansichten und die Beispiel-Ressource: private Referenz in einen
 * signierten Link umwandeln, alles andere unverändert lassen.
 */
export async function playableAudioUrlForAdmin(admin: AdminClient, audioUrl: string | null | undefined): Promise<string | null> {
  if (!audioUrl) return null;
  return isPrivateAudioRef(audioUrl) ? signPrivateAudio(admin, audioUrl) : audioUrl;
}

/**
 * Nach Abo-Ende oder fehlgeschlagener Zahlung (Stripe-Webhook): Audio aller
 * Abo-Storys dieses Accounts aus dem öffentlichen Bucket nehmen. Wirft nie.
 */
export async function secureSubscriptionStoriesForStripeSubscription(subscriptionId: string): Promise<void> {
  try {
    const admin = await createServerAdminClient();
    const { data: accessRows } = await (admin as any)
      .from('user_access')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId);
    for (const { user_id: userId } of accessRows ?? []) {
      const { data: stories, error } = await (admin as any)
        .from('saved_stories')
        .select('id, user_id, audio_url, access_policy, trial_ends_at, first_story_draft_id')
        .eq('user_id', userId)
        .eq('access_policy', 'subscription')
        .not('audio_url', 'like', 'private-storage:%');
      if (error) {
        console.error('[StoryAccess] Abo-Storys konnten nicht geladen werden:', error.message);
        continue;
      }
      for (const story of stories ?? []) {
        await secureStoryAudio(admin, story).catch((e) =>
          console.error('[StoryAccess] Abo-Story konnte nicht abgesichert werden:', story.id, e)
        );
      }
    }
  } catch (e) {
    console.error('[StoryAccess] secureSubscriptionStoriesForStripeSubscription:', e);
  }
}
