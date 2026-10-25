/**
 * Browser-Übersetzer (Chrome/Google Translate, Edge) und manche Erweiterungen
 * ersetzen Textknoten durch eigene <font>-Elemente. React kennt diese Knoten
 * nicht und bricht beim nächsten Umbau mit "Failed to execute 'insertBefore'
 * (bzw. 'removeChild') on 'Node'" ab – die ganze Seite wird weiß.
 * Bekanntes React-Problem: https://github.com/facebook/react/issues/11538
 *
 * Abhilfe: Diese zwei DOM-Methoden fangen genau diesen Fall ab, statt zu
 * werfen. Die Seite bleibt bedienbar; schlimmstenfalls steht ein übersetzter
 * Text kurz an der falschen Stelle.
 */
export function guardAgainstDomTranslation() {
  if (typeof Node !== 'function') return;
  const proto = Node.prototype as Node & { __translationGuard?: boolean };
  if (proto.__translationGuard) return;
  proto.__translationGuard = true;

  const removeChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      console.warn('[DOM] removeChild übersprungen – Knoten wurde von außen verändert (Übersetzer?)');
      return child;
    }
    return removeChild.call(this, child) as T;
  };

  const insertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(this: Node, node: T, reference: Node | null): T {
    if (reference && reference.parentNode !== this) {
      console.warn('[DOM] insertBefore ohne Bezugsknoten – Knoten wurde von außen verändert (Übersetzer?)');
      return insertBefore.call(this, node, null) as T;
    }
    return insertBefore.call(this, node, reference) as T;
  };
}
