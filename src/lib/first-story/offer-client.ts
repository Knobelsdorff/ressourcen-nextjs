/**
 * Browser-Seite des Abo-Angebots nach dem ersten Hören der Gratis-Story
 * (Dashboard und /create-story).
 *
 * Zwei Schritte:
 *   1. shouldShowFreeStoryOffer – der Server sagt, ob das Angebot jetzt kommt.
 *   2. markFreeStoryOfferShown  – erst wenn es wirklich angezeigt wurde, wird es
 *      als gezeigt gemerkt. Geht eine Antwort verloren, kommt es beim nächsten
 *      Ende noch einmal – und nicht nie.
 *
 * Zusätzlich merkt sich der Browser, dass er es gezeigt hat, damit es auch dann
 * nicht doppelt erscheint, wenn der Server es nicht speichern konnte.
 */

const ENDPOINT = '/api/first-story/completed';
const shownKey = (storyId: string) => `ps_offer_shown_${storyId}`;

function shownInThisBrowser(storyId: string): boolean {
  try {
    return localStorage.getItem(shownKey(storyId)) === '1';
  } catch {
    return false;
  }
}

async function post(body: Record<string, unknown>, keepalive = false): Promise<Response> {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
    keepalive,
  });
}

/** true, wenn das Angebot jetzt gezeigt werden soll. */
export async function shouldShowFreeStoryOffer(storyId: string): Promise<boolean> {
  if (shownInThisBrowser(storyId)) return false;
  try {
    const response = await post({ storyId });
    const result = await response.json().catch(() => ({}));
    if (result.showOffer !== true) {
      // Grund steht in der Browser-Konsole – damit "es kam nicht" erklärbar ist.
      console.info('[Abo-Angebot] nicht gezeigt:', result.reason ?? `HTTP ${response.status}`);
    }
    return result.showOffer === true;
  } catch (error) {
    console.warn('[Abo-Angebot] Anfrage fehlgeschlagen:', error);
    return false;
  }
}

/** Aufrufen, sobald das Angebot sichtbar geworden ist. */
export function markFreeStoryOfferShown(storyId: string): void {
  try {
    localStorage.setItem(shownKey(storyId), '1');
  } catch {
    /* Ohne Storage zählt nur die Server-Markierung. */
  }
  void post({ storyId, shown: true }, true).catch(() => { /* beim nächsten Mal erneut */ });
}
