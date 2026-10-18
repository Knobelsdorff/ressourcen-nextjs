/**
 * DOM-Helfer für Touren. Eine Tour kennt die Oberfläche nur über Anker:
 *
 *   data-tour="<name>"   – Element, das ein Schritt hervorhebt
 *   data-tour-offset     – fixierter/sticky Kopfbereich, unter den gescrollt wird
 *
 * Solange die Anker beim Umbau einer Seite erhalten bleiben, funktioniert die
 * Tour ohne weitere Anpassung.
 */

/** Erstes sichtbares Element mit diesem Anker (z.B. Desktop- vs. Mobil-Variante). */
export function findTourTarget(name: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`);
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
  }
  return null;
}

/** Höhe aller Kopfbereiche, die beim Scrollen oben stehen bleiben. */
export function stickyTopOffset(): number {
  let offset = 0;
  document.querySelectorAll<HTMLElement>('[data-tour-offset]').forEach((el) => {
    const { position } = getComputedStyle(el);
    if (position !== 'sticky' && position !== 'fixed') return;
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) offset = Math.max(offset, rect.height);
  });
  return offset;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scrollt so, dass das Ziel vollständig unter dem Kopfbereich steht.
 * `reserveBottom`: Platz unten, den die Erklärung belegt (Mobil-Sheet).
 * `reserveBelow`: Platz direkt unter dem Ziel (Erklärung darunter, Desktop).
 * Ist das Ziel zu hoch, steht sein oberer Rand sichtbar unter dem Kopfbereich.
 */
export function scrollTargetIntoView(
  el: HTMLElement,
  { reserveBottom = 0, reserveBelow = 0 }: { reserveBottom?: number; reserveBelow?: number } = {}
): void {
  const margin = 12;
  const top = stickyTopOffset() + margin;
  const bottom = window.innerHeight - reserveBottom - margin;
  const rect = el.getBoundingClientRect();

  // Ziel in einem fixierten Kopfbereich: Scrollen ändert nichts.
  const pinned = el.closest<HTMLElement>('[data-tour-offset]');
  if (pinned && ['sticky', 'fixed'].includes(getComputedStyle(pinned).position)) return;

  const needed = rect.height + reserveBelow;
  const alreadyVisible = rect.top >= top && rect.top + needed <= bottom;
  if (alreadyVisible) return;

  const free = bottom - top - needed;
  // Passt alles: etwas Luft darüber (höchstens 80px). Sonst: oben bündig.
  const targetTop = free > 0 ? top + Math.min(free / 2, 80) : top;
  window.scrollBy({ top: rect.top - targetTop, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/** Für Aufrufer außerhalb einer Tour, z.B. "zur Story springen". */
export function scrollToTourAnchor(name: string): void {
  const el = findTourTarget(name);
  if (el) scrollTargetIntoView(el);
}
