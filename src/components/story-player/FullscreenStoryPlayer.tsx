"use client";

/**
 * Vollbild-Player für das Dashboard. Wächst aus der Story-Karte (clip-path vom
 * Rechteck der Karte auf den ganzen Bildschirm) – keine neue Seite, kein Drawer.
 *
 * Schließen: ⌄ (Maus) bzw. Griff-Strich (Touch), nach unten wischen am Griff,
 * Zurück-Taste/Geste (Android, iOS) oder Esc. Die Story läuft dabei weiter;
 * das Dashboard zeigt dann die Mini-Leiste.
 *
 * Hängt per Portal direkt im <body>: Der Dashboard-Inhalt ist animiert
 * (transform) – darin würde position: fixed nicht am Bildschirm kleben.
 *
 * Geräte-Details:
 * - Zurück-Taste: Beim Öffnen ein eigener Verlaufseintrag (Next-Zustand wird
 *   übernommen, sonst lädt der App-Router die Seite neu). Schließen per ⌄ geht
 *   denselben Schritt zurück, damit kein toter Eintrag bleibt.
 * - Hintergrund scrollt nicht mit (html UND body, sonst scrollt iOS weiter).
 * - Fokus springt in den Player und beim Schließen zurück zur Karte.
 * - "Bewegung reduzieren": nur Einblenden, kein Wachsen.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import StoryPlayerLayout, { type StoryPlayerLayoutProps } from "./StoryPlayerLayout";

type Rect = { top: number; right: number; bottom: number; left: number };

function readRect(element: HTMLElement | null | undefined): Rect | null {
  if (!element || typeof window === "undefined") return null;
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Teilweise außerhalb des Bildschirms: auf den sichtbaren Teil begrenzen (inset() erlaubt keine negativen Werte).
  return {
    top: Math.max(0, box.top),
    right: Math.max(0, w - box.right),
    bottom: Math.max(0, h - box.bottom),
    left: Math.max(0, box.left),
  };
}

const variants = {
  from: (rect: Rect | null) =>
    rect
      ? { clipPath: `inset(${rect.top}px ${rect.right}px ${rect.bottom}px ${rect.left}px round 18px)`, opacity: 1 }
      : { clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 0 },
  to: { clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1 },
};

interface FullscreenStoryPlayerProps {
  open: boolean;
  onClose: () => void;
  /** Element, aus dem der Player wächst und in das er zurückkehrt (die Story-Karte). */
  originRef: React.RefObject<HTMLElement | null>;
  /** Fokus nach dem Schließen (z. B. der "Anhören"-Knopf). */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  layout: Omit<StoryPlayerLayoutProps, "top">;
}

export default function FullscreenStoryPlayer({ open, onClose, originRef, returnFocusRef, layout }: FullscreenStoryPlayerProps) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  // Rechteck der Karte beim Öffnen (Startpunkt) – beim Schließen neu gemessen (Zielpunkt).
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current) {
    wasOpenRef.current = true;
    const next = reduceMotion ? null : readRect(originRef.current);
    if (next !== rect) setRect(next);
  }
  if (!open && wasOpenRef.current) wasOpenRef.current = false;

  const requestClose = useCallback(() => {
    if (!reduceMotion) setRect(readRect(originRef.current));
    if (pushedRef.current) {
      // Den eigenen Verlaufseintrag zurückgehen; popstate schließt dann.
      pushedRef.current = false;
      window.history.back();
      return;
    }
    onCloseRef.current();
  }, [originRef, reduceMotion]);

  // Zurück-Taste / Wischgeste schließt den Player statt die Seite.
  useEffect(() => {
    if (!open) return;
    if (!pushedRef.current) {
      window.history.pushState({ ...(window.history.state ?? {}), storyPlayer: true }, "");
      pushedRef.current = true;
    }
    const onPop = () => {
      pushedRef.current = false;
      if (!reduceMotion) setRect(readRect(originRef.current));
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, originRef, reduceMotion]);

  // Bewusst KEIN history.back() beim Aushängen: Bei einem Seitenwechsel aus dem
  // Player heraus (z. B. "Neue Power Story erstellen") würde das die Navigation
  // rückgängig machen. Dann bleibt höchstens ein zusätzlicher Zurück-Schritt.

  // Esc, Hintergrund sperren, Fokus.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const previous = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Liegt ein Dialog darüber (Abo-Angebot, Willkommen), schließt Esc zuerst nur diesen.
      if (document.querySelector(".subscription-offer-backdrop, .story-ready-backdrop, .settings-backdrop")) return;
      requestClose();
    };
    window.addEventListener("keydown", onKey);
    const focusId = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    const returnTo = returnFocusRef?.current;
    return () => {
      cancelAnimationFrame(focusId);
      window.removeEventListener("keydown", onKey);
      html.style.overflow = previous[0];
      document.body.style.overflow = previous[1];
      returnTo?.focus({ preventScroll: true });
    };
  }, [open, requestClose, returnFocusRef]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence custom={rect}>
      {open && (
        <motion.div
          key="story-player"
          className="sp-overlay sp-root"
          role="dialog"
          aria-modal="true"
          aria-label={`${layout.title} – Player`}
          custom={rect}
          variants={variants}
          initial="from"
          animate="to"
          exit="from"
          transition={{ duration: reduceMotion ? 0.2 : 0.42, ease: [0.22, 1, 0.36, 1] }}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 110 || info.velocity.y > 650) requestClose();
          }}
        >
          <motion.div
            className="sp-overlay-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: reduceMotion ? 0 : 0.16, duration: 0.28 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <StoryPlayerLayout
              {...layout}
              top={
                <div className="sp-handle-zone" onPointerDown={(event) => dragControls.start(event)}>
                  <button ref={closeRef} type="button" className="sp-close" onClick={requestClose} aria-label="Player schließen">
                    <ChevronDown size={26} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              }
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
