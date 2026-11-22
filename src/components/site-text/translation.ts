"use client";

/*
 * Browser-Übersetzer (Chrome/Google Translate, Edge) ersetzen Textknoten durch
 * eigene Elemente. Für den Texteditor ist das doppelt gefährlich:
 *
 * 1. Wechselt die Darstellung (Bearbeiten ↔ Vorschau), kann React die
 *    ersetzten Knoten nicht entfernen – der alte, übersetzte Text bleibt
 *    stehen und erscheint doppelt (siehe src/lib/dom-translation-guard.ts).
 * 2. Beim Bearbeiten würde der übersetzte Text als Entwurf gespeichert.
 *
 * Deshalb: Während Bearbeiten/Vorschau wird Übersetzen per translate="no"
 * unterbunden, und ist die Seite schon übersetzt, startet der Editor nicht.
 */

/** Ist die Seite (oder ein Teil davon) gerade maschinell übersetzt? */
export function isPageTranslated(root: ParentNode = document): boolean {
  if (typeof document === "undefined") return false;
  const html = document.documentElement;
  if (root === document && (html.classList.contains("translated-ltr") || html.classList.contains("translated-rtl"))) {
    return true;
  }
  // Chrome/Google Translate: <font style="vertical-align: inherit;">, Edge: _msttexthash-Attribute.
  return Boolean(root.querySelector('font[style*="vertical-align: inherit"], font[style*="vertical-align:inherit"], [_msttexthash]'));
}

export const TRANSLATION_MESSAGE =
  "Die Seite ist gerade vom Browser übersetzt. Bitte zuerst die Übersetzung beenden (in Chrome: Übersetzen-Symbol in der Adressleiste → „Original anzeigen“) und die Seite neu laden – sonst würde der übersetzte Text gespeichert.";

let previousTranslate: string | null | undefined;

/** Übersetzen der ganzen Seite unterbinden bzw. wieder erlauben. */
export function setTranslationBlocked(blocked: boolean) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (blocked) {
    if (previousTranslate === undefined) previousTranslate = html.getAttribute("translate");
    html.setAttribute("translate", "no");
    html.classList.add("notranslate");
  } else if (previousTranslate !== undefined) {
    if (previousTranslate === null) html.removeAttribute("translate");
    else html.setAttribute("translate", previousTranslate);
    html.classList.remove("notranslate");
    previousTranslate = undefined;
  }
}
