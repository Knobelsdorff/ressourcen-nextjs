"use client";

/**
 * Hörprobe für den eigenen Namen, im Namens-Schritt und in den Einstellungen.
 *
 * Bleibt nach dem Abspielen stehen, statt zu verschwinden: Der gesprochene Satz
 * steht da, die Probe lässt sich anhalten und wiederholen, und wenn der Name
 * falsch klingt, führt ein Klick direkt zum Aussprache-Feld.
 */

import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { useNamePreview } from "@/hooks/useNamePreview";
import "./name-preview.css";

interface NamePreviewPlayerProps {
  name: string;
  pronunciation: string;
  /** Im Flow gewählte Stimme – ohne Angabe spricht Kerstin. */
  voiceId?: string | null;
  /** Springt zum Aussprache-Feld. */
  onAdjust?: () => void;
}

export default function NamePreviewPlayer({ name, pronunciation, voiceId, onAdjust }: NamePreviewPlayerProps) {
  const { status, sentence, progress, error, stale, toggle } = useNamePreview(name, pronunciation, voiceId);
  const hasName = name.trim().length > 0;

  const heading = !hasName
    ? "Hörprobe"
    : status === "loading"
      ? "Wird erstellt …"
      : status === "playing"
        ? "Läuft gerade"
        : status === "paused"
          ? "Angehalten"
          : status === "ended"
            ? "Noch einmal anhören"
            : stale
              ? "Neu anhören"
              : "Anhören";

  const detail = !hasName
    ? "Gib zuerst deinen Vornamen ein."
    : status === "idle"
      ? stale
        ? "Du hast etwas geändert."
        : "So spricht deine Power Story dich an."
      : status === "loading"
        ? "Einen kleinen Moment."
        : `„${sentence}“`;

  const buttonLabel =
    status === "loading"
      ? "Hörprobe abbrechen"
      : status === "playing"
        ? "Hörprobe anhalten"
        : status === "ended"
          ? "Hörprobe noch einmal abspielen"
          : "Hörprobe abspielen";

  return (
    <div className="name-preview" data-status={status}>
      <div className="name-preview-card">
        <button type="button" className="name-preview-play" onClick={toggle} disabled={!hasName} aria-label={buttonLabel}>
          {status === "loading" ? (
            <Loader2 size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : status === "playing" ? (
            <Pause size={18} fill="currentColor" aria-hidden="true" />
          ) : status === "ended" ? (
            <RotateCcw size={18} aria-hidden="true" />
          ) : (
            <Play size={18} fill="currentColor" className="name-preview-play-icon" aria-hidden="true" />
          )}
        </button>

        <div className="name-preview-body">
          <div aria-live="polite">
            <p className="name-preview-heading">{heading}</p>
            <p className="name-preview-detail">{detail}</p>
          </div>
          <div className="name-preview-track" aria-hidden="true">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      </div>

      {status === "ended" && onAdjust && (
        <p className="name-preview-follow">
          <span>Klingt es noch nicht richtig?</span>
          <button type="button" onClick={onAdjust}>Aussprache anpassen</button>
        </p>
      )}

      {error && <p className="name-preview-error" role="alert">{error}</p>}
    </div>
  );
}
