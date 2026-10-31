/**
 * Startet den Player einer bestimmten Story von außen, z.B. aus dem
 * Willkommens-Hinweis im Dashboard.
 *
 * Bewusst ein synchrones Event: dispatchEvent läuft noch im Klick-Handler,
 * audio.play() also innerhalb der Nutzergeste – sonst blockiert iOS den Start.
 */
export const PLAY_STORY_EVENT = 'power-storys:play-story';

export function requestStoryPlay(storyId: string): void {
  window.dispatchEvent(new CustomEvent<{ storyId: string }>(PLAY_STORY_EVENT, { detail: { storyId } }));
}
