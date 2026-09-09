"use client";

/**
 * Barrierefreier Fortschrittsbalken.
 *
 * Vorher war das ein <div> mit onMouseDown/onTouchStart: per Tastatur nicht
 * erreichbar, für Screenreader unsichtbar. Jetzt ein echter Slider nach
 * WAI-ARIA – bedienbar mit Maus, Touch und Tastatur.
 *
 * Tastatur: ←/→ ±5s, ↑/↓ ±15s, Bild auf/ab ±60s, Pos1/Ende Anfang/Ende.
 */

import { useRef, useCallback, useEffect, useState } from "react";
import { formatTime, formatTimeSpoken } from "@/hooks/useAudioPlayer";

interface AudioProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  /** Kompakte Variante für kleine Karten. */
  compact?: boolean;
  disabled?: boolean;
}

export default function AudioProgressBar({
  currentTime,
  duration,
  onSeek,
  compact = false,
  disabled = false,
}: AudioProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const timeFromClientX = useCallback(
    (clientX: number): number | null => {
      const el = trackRef.current;
      if (!el || duration <= 0) return null;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      trackRef.current?.focus();
      setIsDragging(true);
      const t = timeFromClientX(e.clientX);
      if (t !== null) onSeek(t);
    },
    [disabled, timeFromClientX, onSeek]
  );

  // Ziehen auch außerhalb des Balkens verfolgen, bis losgelassen wird.
  useEffect(() => {
    if (!isDragging) return;

    const move = (e: PointerEvent) => {
      const t = timeFromClientX(e.clientX);
      if (t !== null) onSeek(t);
    };
    const up = () => setIsDragging(false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [isDragging, timeFromClientX, onSeek]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || duration <= 0) return;

      const steps: Record<string, number> = {
        ArrowRight: 5,
        ArrowLeft: -5,
        ArrowUp: 15,
        ArrowDown: -15,
        PageUp: 60,
        PageDown: -60,
      };

      if (e.key in steps) {
        e.preventDefault();
        onSeek(Math.max(0, Math.min(duration, currentTime + steps[e.key])));
      } else if (e.key === "Home") {
        e.preventDefault();
        onSeek(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onSeek(duration);
      }
    },
    [disabled, duration, currentTime, onSeek]
  );

  const height = compact ? "h-2" : "h-3";
  const thumbSize = compact ? "w-4 h-4" : "w-5 h-5";

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Wiedergabeposition"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatTimeSpoken(currentTime)} von ${formatTimeSpoken(duration)}`}
      aria-disabled={disabled || undefined}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className={`
        group relative w-full ${height} rounded-full bg-primary-100
        touch-none select-none
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600
        focus-visible:ring-offset-2 focus-visible:ring-offset-white
      `}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-primary-600 transition-[width] duration-100 motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
      {/*
        Notnagel: Lässt sich die Dauer nicht ermitteln, gibt es keinen Maßstab
        für den Balken. Statt eines scheinbar eingefrorenen Players zeigt ein
        laufender Streifen wenigstens an, dass etwas passiert.
      */}
      {duration <= 0 && currentTime > 0 && (
        <div
          className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-primary-300 motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      <div
        className={`
          absolute top-1/2 -translate-y-1/2 ${thumbSize} rounded-full
          border-2 border-primary-600 bg-white shadow
          transition-transform duration-150 motion-reduce:transition-none
          ${isDragging ? "scale-110" : "group-hover:scale-110"}
        `}
        style={{ left: `calc(${progress}% - ${compact ? "0.5rem" : "0.625rem"})` }}
      />
    </div>
  );
}
