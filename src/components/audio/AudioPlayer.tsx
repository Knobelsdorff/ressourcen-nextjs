"use client";

/**
 * Ein Player für alle Fälle.
 *
 * Ersetzt DashboardAudioPlayer (906 Zeilen) und StoryPlayerWithBLS (911
 * Zeilen), die zu großen Teilen Kopien voneinander waren. Der Unterschied
 * zwischen beiden war im Kern nur die BLS-Videoebene – hier eine Variante,
 * kein eigenes Bauteil.
 *
 * Varianten:
 *   "standard" – normale Wiedergabe
 *   "bls"      – zusätzlich bilaterale Stimulation (Pro)
 *   "compact"  – schlanke Zeile, z.B. für „Ankommen"
 */

import { useRef, useEffect, useId } from "react";
import { Play, Pause, RotateCcw, RotateCw, Eye, EyeOff } from "lucide-react";
import { useAudioPlayer, formatTime } from "@/hooks/useAudioPlayer";
import AudioProgressBar from "./AudioProgressBar";

export type AudioPlayerVariant = "standard" | "bls" | "compact";

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  storyId?: string;
  resourceFigure?: any;
  onEnded?: () => void;
  /** Wird beim Start der Wiedergabe aufgerufen – z.B. für Analytics. */
  onPlay?: () => void;
  variant?: AudioPlayerVariant;
  /** BLS-Ebene ein-/ausklappen (nur variant="bls"). */
  blsExpanded?: boolean;
  onToggleBLS?: () => void;
  /** Eigene Kopfzeile – Titel, Untertitel, Menü kommen von außen. */
  header?: React.ReactNode;
  className?: string;
}

const BLS_VIDEO_URL = "/videos/Bilaterale%20Stimulation.mp4";

export default function AudioPlayer({
  audioUrl,
  title,
  storyId,
  resourceFigure,
  onEnded,
  onPlay,
  variant = "standard",
  blsExpanded = false,
  onToggleBLS,
  header,
  className = "",
}: AudioPlayerProps) {
  const {
    isPlaying,
    isLoading,
    isPreparingAudio,
    currentTime,
    duration,
    togglePlayPause,
    seekTo,
    skipBy,
  } = useAudioPlayer({ audioUrl, storyId, resourceFigure, onEnded });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const statusId = useId();
  const isCompact = variant === "compact";
  const showBLS = variant === "bls";

  // BLS-Video an die Wiedergabe koppeln.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showBLS || !blsExpanded) return;
    if (isPlaying) video.play().catch(() => {});
    else video.pause();
  }, [isPlaying, showBLS, blsExpanded]);

  const busy = isLoading || isPreparingAudio;
  const playLabel = isPlaying ? "Pause" : "Abspielen";

  const handleTogglePlay = () => {
    if (!isPlaying) onPlay?.();
    togglePlayPause();
  };

  return (
    <div className={className}>
      {header}

      {showBLS && blsExpanded && (
        <div className="mb-5 overflow-hidden rounded-xl bg-secondary-900">
          <video
            ref={videoRef}
            src={BLS_VIDEO_URL}
            loop
            muted
            playsInline
            aria-hidden="true"
            className="h-32 w-full object-cover md:h-40"
          />
        </div>
      )}

      <div className={isCompact ? "space-y-3" : "space-y-4"}>
        <AudioProgressBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seekTo}
          compact={isCompact}
          disabled={busy || duration === 0}
        />

        <div className="flex items-center justify-between text-sm tabular-nums text-secondary-600">
          <span>{formatTime(currentTime)}</span>
          {/* Solange die Dauer unbekannt ist (WebM ohne Header), lieber "–:––"
              als ein falsches 0:00 neben einer laufenden Zeit anzeigen. */}
          <span>{duration > 0 ? formatTime(duration) : "–:––"}</span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => skipBy(-15)}
            disabled={busy}
            aria-label="15 Sekunden zurück"
            className="rounded-full p-2.5 text-secondary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={busy}
            aria-label={playLabel}
            aria-describedby={statusId}
            className={`
              flex items-center justify-center rounded-full bg-primary-700 text-white shadow-sm
              transition-colors hover:bg-primary-800
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-60
              ${isCompact ? "h-12 w-12" : "h-16 w-16"}
            `}
          >
            {busy ? (
              <span
                className="block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : isPlaying ? (
              <Pause className={isCompact ? "h-5 w-5" : "h-7 w-7"} aria-hidden="true" />
            ) : (
              // Optische Mitte: das Play-Dreieck wirkt sonst nach links versetzt.
              <Play className={`${isCompact ? "h-5 w-5" : "h-7 w-7"} ml-0.5`} aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skipBy(15)}
            disabled={busy}
            aria-label="15 Sekunden vor"
            className="rounded-full p-2.5 text-secondary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-40"
          >
            <RotateCw className="h-5 w-5" aria-hidden="true" />
          </button>

          {showBLS && onToggleBLS && (
            <button
              type="button"
              onClick={onToggleBLS}
              aria-pressed={blsExpanded}
              aria-label={
                blsExpanded ? "Augenbewegung ausblenden" : "Augenbewegung einblenden"
              }
              className="ml-2 rounded-full p-2.5 text-secondary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              {blsExpanded ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Zustandsänderungen für Screenreader hörbar machen. */}
        <p id={statusId} className="sr-only" aria-live="polite">
          {isPreparingAudio
            ? "Audio wird vorbereitet"
            : isLoading
              ? "Audio wird geladen"
              : isPlaying
                ? `${title ?? "Aufnahme"} wird abgespielt`
                : "Angehalten"}
        </p>

        {isPreparingAudio && (
          <p className="text-center text-xs text-secondary-600">
            Audio wird für deinen Browser vorbereitet…
          </p>
        )}
      </div>
    </div>
  );
}
