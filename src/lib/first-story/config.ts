/**
 * Erststory-Flow (Engel + Kerstin). Client- und serverseitig nutzbar.
 *
 * Standardmäßig AN: Die Story wird auf dem Server erzeugt, der E-Mail-Link
 * führt direkt ins Dashboard (benötigt Migration 20261017120000).
 *
 * Notschalter: NEXT_PUBLIC_FIRST_STORY_SERVER_FLOW=0 setzen und neu deployen
 * bzw. den Dev-Server neu starten – dann läuft wieder der bisherige
 * Browser-Flow unverändert.
 */

export const FIRST_STORY_FIGURE_ID = 'angel';
export const FIRST_STORY_VOICE_ID = 'Y5JXXvUD3rmjDInkLVA2';

/** localStorage: Entwurf, den dieser Browser angelegt hat ({ draftId, key, email, savedAt }). */
export const FIRST_STORY_DRAFT_STORAGE_KEY = 'first-power-story-draft';

/** Wie lange der Link aus der E-Mail gültig ist (beliebig oft nutzbar, wie die Zugangslinks). */
export const FIRST_STORY_LINK_DAYS = 30;

export type FirstStoryPhase = 'text' | 'audio' | 'ready' | 'claimed' | 'failed' | 'none';

export function isFirstStoryServerFlowEnabled(): boolean {
  // Direkter Zugriff, damit Next.js den Wert in das Client-Bundle einsetzt.
  const value = process.env.NEXT_PUBLIC_FIRST_STORY_SERVER_FLOW?.trim().toLowerCase();
  return value !== '0' && value !== 'false';
}
