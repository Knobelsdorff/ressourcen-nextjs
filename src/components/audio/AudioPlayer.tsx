"use client";

/**
 * Ein Player für alle Fälle.
 *
 * Ersetzt DashboardAudioPlayer (906 Zeilen) und StoryPlayerWithBLS (911
 * Zeilen), die zu großen Teilen Kopien voneinander waren.
 *
 * Varianten:
 *   "standard" – normale Wiedergabe
 *   "compact"  – schlanke Zeile, z.B. für „Ankommen"
 *
 * Die frühere Pro-Variante "bls" (Video „Bilaterale Stimulation") ist
 * entfallen: Auf Wunsch von Andreas sehen alle nur noch die Klopfübung
 * unter dem Player (ButterflyHugExercise).
 */

import { useRef, useEffect, useId } from "react";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";
import { useAudioPlayer, formatTime } from "@/hooks/useAudioPlayer";
import AudioProgressBar from "./AudioProgressBar";
import { type StoryPlayContext, storyPlayCompleted, storyPlayStarted } from "@/lib/product-analytics/story-plays";
import MusicVolumeControl from "./MusicVolumeControl";
import { PLAY_STORY_EVENT } from "./play-events";

export type AudioPlayerVariant = "standard" | "compact";

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  storyId?: string;
  resourceFigure?: any;
  onEnded?: () => void;
  /** Stimme hat ihr Ende erreicht (siehe useAudioPlayer). */
  onCompleted?: () => void;
  /** Wird beim Start der Wiedergabe aufgerufen – z.B. für Analytics. */
  onPlay?: () => void;
  /** Nur für eigene Power Storys: Funnel-Events (Start, Ende, erneutes Hören). Hörproben ohne. */
  playAnalytics?: StoryPlayContext;
  variant?: AudioPlayerVariant;
  /** Eigene Kopfzeile – Titel, Untertitel, Menü kommen von außen. */
  header?: React.ReactNode;
  className?: string;
}

/** Kreispfeil mit "15" darin – zeigt, wie weit gesprungen wird. */
function SkipIcon({ direction, compact }: { direction: "back" | "forward"; compact: boolean }) {
  const Icon = direction === "back" ? RotateCcw : RotateCw;
  return (
    <span className={`relative flex items-center justify-center ${compact ? "h-7 w-7" : "h-10 w-10"}`} aria-hidden="true">
      <Icon className="h-full w-full" strokeWidth={1.6} />
      <span className={`absolute pt-px font-semibold tabular-nums leading-none ${compact ? "text-[8px]" : "text-[11px]"}`}>15</span>
    </span>
  );
}

export default function AudioPlayer({
  audioUrl,
  title,
  storyId,
  resourceFigure,
  onEnded,
  onCompleted,
  onPlay,
  playAnalytics,
  variant = "standard",
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
    hasBackgroundMusic,
  } = useAudioPlayer({
    audioUrl,
    storyId,
    resourceFigure,
    onEnded,
    onCompleted: () => {
      if (playAnalytics) storyPlayCompleted(playAnalytics);
      onCompleted?.();
    },
  });

  // Funnel: Start einer Hör-Sitzung (storyPlayStarted entdoppelt Pausen und Fortsetzen).
  const playAnalyticsRef = useRef(playAnalytics);
  useEffect(() => {
    playAnalyticsRef.current = playAnalytics;
  });
  useEffect(() => {
    if (isPlaying && playAnalyticsRef.current) storyPlayStarted(playAnalyticsRef.current);
  }, [isPlaying]);

  const statusId = useId();
  const isCompact = variant === "compact";

  const busy = isLoading || isPreparingAudio;
  const skipButtonClass =
    "rounded-full p-1.5 text-secondary-700 transition-colors hover:bg-primary-50 hover:text-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-40";
  const playLabel = isPlaying ? "Pause" : "Abspielen";

  const handleTogglePlay = () => {
    if (!isPlaying) onPlay?.();
    togglePlayPause();
  };

  // Start von außen (requestStoryPlay). Über eine Ref, damit der Listener
  // nicht bei jedem Zeit-Update neu registriert wird.
  const externalPlayRef = useRef<() => void>(() => {});
  useEffect(() => {
    externalPlayRef.current = () => {
      if (!isPlaying && !isPreparingAudio) handleTogglePlay();
    };
  });
  useEffect(() => {
    if (!storyId) return;
    const onPlayRequest = (event: Event) => {
      if ((event as CustomEvent<{ storyId: string }>).detail?.storyId === storyId) externalPlayRef.current();
    };
    window.addEventListener(PLAY_STORY_EVENT, onPlayRequest);
    return () => window.removeEventListener(PLAY_STORY_EVENT, onPlayRequest);
  }, [storyId]);

  return (
    <div className={className}>
      {header}

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

        <div className={`flex items-center justify-center ${isCompact ? "gap-2" : "gap-5 sm:gap-7"}`}>
          <button
            type="button"
            onClick={() => skipBy(-15)}
            disabled={busy}
            aria-label="15 Sekunden zurück"
            className={skipButtonClass}
          >
            <SkipIcon direction="back" compact={isCompact} />
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
              ${isCompact ? "h-12 w-12" : "h-[72px] w-[72px] shadow-[0_12px_26px_-10px_rgba(73,48,30,0.55)]"}
            `}
          >
            {busy ? (
              <span
                className="block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : isPlaying ? (
              <Pause className={isCompact ? "h-5 w-5" : "h-8 w-8"} aria-hidden="true" />
            ) : (
              // Optische Mitte: das Play-Dreieck wirkt sonst nach links versetzt.
              <Play className={`${isCompact ? "h-5 w-5" : "h-8 w-8"} ml-1`} aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skipBy(15)}
            disabled={busy}
            aria-label="15 Sekunden vor"
            className={skipButtonClass}
          >
            <SkipIcon direction="forward" compact={isCompact} />
          </button>
        </div>

        {/* Nur zeigen, wenn es auch etwas zu regeln gibt: Zu vielen Ressourcen
            ist keine Musik zugeordnet – ein toter Regler würde verwirren. */}
        {hasBackgroundMusic &&
          (isCompact ? (
            <div className="flex justify-center pt-1">
              <MusicVolumeControl compact label="Hintergrundmusik" />
            </div>
          ) : (
            // Volle Breite wie der Fortschrittsbalken – mit dem Finger leichter zu treffen.
            <MusicVolumeControl wide label="Hintergrundmusik" className="pt-1" />
          ))}

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
