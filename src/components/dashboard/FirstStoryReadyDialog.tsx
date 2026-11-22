"use client";

/**
 * Einziger Hinweis nach dem Erststory-Flow: "Deine Power Story ist bereit!"
 * Ersetzt die frühere Spotlight-Tour. "Jetzt anhören" schließt den Hinweis und
 * startet die Story sofort; Schließen (X, Escape, Hintergrund) blendet ihn nur
 * aus. Beides zählt als gesehen (welcome_seen_at) – er erscheint nur einmal.
 */

import { useEffect, useRef } from "react";
import { Play, X } from "lucide-react";
import AngelIconFinal from "@/components/AngelIconFinal";
import { T, useText } from "@/components/site-text/T";
import { dashboard } from "@/content/texts/dashboard";

interface FirstStoryReadyDialogProps {
  onListen: () => void;
  onDismiss: () => void;
}

export default function FirstStoryReadyDialog({ onListen, onDismiss }: FirstStoryReadyDialogProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const closeLabel = useText(dashboard["ready.close"]);

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
        <button type="button" className="story-ready-close" onClick={onDismiss} aria-label={closeLabel}>
          <X size={18} aria-hidden="true" />
        </button>
        <div className="story-ready-icon" aria-hidden="true">
          <AngelIconFinal size={56} />
        </div>
        <h2 id="story-ready-title"><T t={dashboard["ready.title"]} /></h2>
        <p id="story-ready-text">
          <T t={dashboard["ready.text"]} />
        </p>
        <button ref={primaryRef} type="button" className="story-ready-primary" onClick={onListen}>
          <Play className="h-5 w-5" fill="currentColor" aria-hidden="true" />
          <T t={dashboard["ready.listen"]} />
        </button>
      </section>
    </div>
  );
}
