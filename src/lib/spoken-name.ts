/**
 * Wie der Name in Storys gesprochen wird. Klein gehalten, damit Server
 * (Story-Prompt, Namensvorschau) und Browser (Einstellungen) dieselbe Regel
 * verwenden.
 */

/**
 * Aussprache-Hinweis nur verwenden, wenn er ein einzelnes Wort ist (Buchstaben
 * und Bindestriche, z.B. "Andi" oder "Ju-lia"). Altes Format "AN DI|1|…" →
 * erster Teil. Sätze wie "Betonung auf der ersten Silbe" werden ignoriert.
 */
export function usablePronunciationHint(hint?: string | null): string | null {
  const simple = (hint ?? '').trim().split('|')[0].trim();
  return simple.length > 0 && /^[A-Za-zÄÖÜäöüß-]+$/.test(simple) ? simple : null;
}

/** So wird der Name in Storys geschrieben – und damit gesprochen. */
export function spokenStoryName(userName: string, hint?: string | null): string {
  return usablePronunciationHint(hint) ?? userName.trim();
}
