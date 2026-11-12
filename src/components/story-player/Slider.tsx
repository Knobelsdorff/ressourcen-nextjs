"use client";

/**
 * Eigener Regler statt <input type="range">: Der native Regler lässt sich auf
 * iOS nicht antippen (nur der Knopf ist ziehbar) und sieht auf jedem Gerät
 * anders aus. Hier: Tippen springt, Ziehen folgt dem Finger (Pointer Capture),
 * Tastatur (Pfeile, Pos1/Ende) und Screenreader (role="slider") funktionieren.
 *
 * touch-action: pan-y – senkrechtes Wischen scrollt weiter die Seite (wichtig
 * im Querformat), waagerecht gehört dem Regler.
 */

import { useRef, useState } from "react";

interface SliderProps {
  value: number; // 0..1
  /** Bei jeder Bewegung (z. B. Lautstärke). */
  onChange?: (value: number) => void;
  /** Erst beim Loslassen (z. B. Spulen – sonst würde bei jedem Pixel neu gepuffert). */
  onCommit?: (value: number) => void;
  label: string;
  valueText: string;
  disabled?: boolean;
  step?: number;
  className?: string;
}

export default function Slider({ value, onChange, onCommit, label, valueText, disabled, step = 0.05, className = "" }: SliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const shown = Math.min(1, Math.max(0, dragValue ?? value));

  const fromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const update = (next: number, final: boolean) => {
    if (onCommit) {
      setDragValue(final ? null : next);
      if (final) onCommit(next);
    } else {
      onChange?.(next);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`sp-slider ${className}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      data-dragging={dragValue !== null || undefined}
      style={{ "--fill": `${shown * 100}%` } as React.CSSProperties}
      onPointerDown={(event) => {
        if (disabled || event.button > 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(fromPointer(event.clientX), false);
      }}
      onPointerMove={(event) => {
        if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        update(fromPointer(event.clientX), false);
      }}
      onPointerUp={(event) => {
        if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        update(fromPointer(event.clientX), true);
      }}
      onPointerCancel={() => setDragValue(null)}
      onKeyDown={(event) => {
        if (disabled) return;
        const keys: Record<string, number> = {
          ArrowRight: value + step, ArrowUp: value + step,
          ArrowLeft: value - step, ArrowDown: value - step,
          Home: 0, End: 1,
        };
        if (!(event.key in keys)) return;
        event.preventDefault();
        const next = Math.min(1, Math.max(0, keys[event.key]));
        if (onCommit) onCommit(next);
        else onChange?.(next);
      }}
    >
      <span className="sp-slider-track" aria-hidden="true">
        <span className="sp-slider-fill" />
      </span>
      <span className="sp-slider-thumb" aria-hidden="true" />
    </div>
  );
}
