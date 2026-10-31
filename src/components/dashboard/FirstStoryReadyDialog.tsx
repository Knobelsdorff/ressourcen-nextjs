"use client";

/**
 * Einziger Hinweis nach dem Erststory-Flow: "Deine Power Story ist bereit!"
 * Ersetzt die frühere Spotlight-Tour. "Jetzt anhören" schließt den Hinweis und
 * startet die Story sofort; Schließen (X, Escape, Hintergrund) blendet ihn nur
 * aus. Beides zählt als gesehen (welcome_seen_at) – er erscheint nur einmal.
 */

import { useEffect, useRef } from "react";
import { Headphones, X } from "lucide-react";
import AngelIconFinal from "@/components/AngelIconFinal";

interface FirstStoryReadyDialogProps {
  onListen: () => void;
  onDismiss: () => void;
}

export default function FirstStoryReadyDialog({ onListen, onDismiss }: FirstStoryReadyDialogProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div className="story-ready-backdrop" onClick={onDismiss}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-ready-title"
        aria-describedby="story-ready-text"
        className="story-ready"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="story-ready-close" onClick={onDismiss} aria-label="Hinweis schließen">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="story-ready-icon" aria-hidden="true">
          <AngelIconFinal size={56} />
        </div>
        <h2 id="story-ready-title">Deine Power Story ist bereit!</h2>
        <p id="story-ready-text">
          Mach es dir bequem, schließe deine Augen, wenn du magst, und höre dir deine persönliche Geschichte an.
        </p>
        <button ref={primaryRef} type="button" className="story-ready-primary" onClick={onListen}>
          <Headphones className="h-5 w-5" aria-hidden="true" />
          Jetzt anhören
        </button>
      </section>
    </div>
  );
}
