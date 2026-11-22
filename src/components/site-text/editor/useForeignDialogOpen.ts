"use client";

import { useEffect, useState } from "react";

const DIALOG_SELECTOR = '[aria-modal="true"], [role="dialog"], [role="alertdialog"]';

/** Ist gerade ein sichtbarer Dialog der Seite offen, der oben bis unter die Admin-Leiste reicht? */
function isForeignDialogOpen(coverTop: number): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)).some((el) => {
    // Eigene Editor-Oberfläche, geschlossene (inert/versteckte) Dialoge zählen nicht –
    // z. B. liegt das mobile Menü immer im DOM, ist geschlossen aber inert.
    if (el.closest("[data-site-text-ui], [inert], [aria-hidden='true'], [hidden]")) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= coverTop) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  });
}

/**
 * Beobachtet, ob ein Dialog/Vollbild der Seite (Player, Einstellungen, Paywall …)
 * offen ist und oben unter der Admin-Leiste liegen würde. Nur aktiv, solange der
 * Editor sichtbar ist; reagiert auf Ein-/Ausblenden (DOM, inert, data-state).
 */
export function useForeignDialogOpen(active: boolean, coverTop: number): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active) {
      setOpen(false);
      return;
    }
    let frame = 0;
    let settle = 0;
    const check = () => {
      frame = 0;
      setOpen(isForeignDialogOpen(coverTop));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
      // Ein-/Ausblend-Animationen: nach dem Ende noch einmal prüfen.
      window.clearTimeout(settle);
      settle = window.setTimeout(check, 450);
    };
    check();
    // Bewusst ohne class/style: der Player ändert seine Styles laufend.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-modal", "role", "inert", "hidden", "aria-hidden", "open", "data-state"],
    });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [active, coverTop]);

  return open;
}
