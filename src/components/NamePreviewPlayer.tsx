"use client";

/**
 * Hörprobe für den eigenen Namen, im Namens-Schritt und in den Einstellungen.
 *
 * Bleibt nach dem Abspielen stehen, statt zu verschwinden: Der gesprochene Satz
 * steht da, die Probe lässt sich anhalten und wiederholen, und wenn der Name
 * falsch klingt, führt ein Klick direkt zum Aussprache-Feld.
 */

import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { NAME_PREVIEW_FALLBACK_ERROR, useNamePreview } from "@/hooks/useNamePreview";
import "./name-preview.css";
import { T, useTextFn } from "@/components/site-text/T";
import type { TextDef } from "@/lib/site-texts/define";
import { createStory } from "@/content/texts/createStory";

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
  const tx = useTextFn();
  const p = (key: string) => (createStory as Record<string, TextDef>)[`namePreview.${key}`];

  const heading = <T t={!hasName
    ? p("heading.empty")
    : status === "loading"
      ? p("heading.loading")
      : status === "playing"
        ? p("heading.playing")
        : status === "paused"
          ? p("heading.paused")
          : status === "ended"
            ? p("heading.ended")
            : stale
              ? p("heading.stale")
              : p("heading.idle")} />;

  const detail = !hasName
    ? <T t={p("detail.empty")} />
    : status === "idle"
      ? stale
        ? <T t={p("detail.stale")} />
        : <T t={p("detail.idle")} />
      : status === "loading"
        ? <T t={p("detail.loading")} />
        : `„${sentence}“`;

  const buttonLabel = tx(
    status === "loading"
      ? p("button.cancel")
      : status === "playing"
        ? p("button.pause")
        : status === "ended"
          ? p("button.replay")
          : p("button.play"));
  const errorText = error === NAME_PREVIEW_FALLBACK_ERROR ? tx(p("error")) : error;

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
          <span><T t={p("notRight")} /></span>
          <button type="button" onClick={onAdjust}><T t={p("adjust")} /></button>
        </p>
      )}

      {errorText && <p className="name-preview-error" role="alert">{errorText}</p>}
    </div>
  );
}
