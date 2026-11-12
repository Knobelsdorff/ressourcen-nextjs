"use client";

/**
 * Hintergrundmusik, ganz rechts in der Player-Leiste.
 * Breit: Beschriftung + Stumm-Knopf + Regler direkt sichtbar.
 * Handy hochkant: Knopf "Musik", der ein kleines beschriftetes Feld öffnet
 * (schließt bei Tippen daneben). Die Stimme ist davon nie betroffen.
 */

import { useEffect, useRef, useState } from "react";
import { Music2, VolumeX } from "lucide-react";
import Slider from "./Slider";
import { useMusicVolumeFactor } from "./useMusicVolumeFactor";

export default function MusicControl() {
  const { factor, max, muted, change, toggleMute } = useMusicVolumeFactor();
  const [panelOpen, setPanelOpen] = useState(false);
  const compactRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!compactRef.current?.contains(event.target as Node)) setPanelOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [panelOpen]);

  // 100 % = so laut, wie im Admin für diesen Track eingestellt.
  const valueText = muted ? "aus" : `${Math.round(factor * 100)} %`;

  const label = (
    <span className="sp-music-label">
      Hintergrundmusik<span>{valueText}</span>
    </span>
  );
  const row = (iconSize: number) => (
    <div className="sp-music-row">
      <button
        type="button"
        className="sp-music-mute"
        onClick={toggleMute}
        aria-pressed={muted}
        aria-label={muted ? "Hintergrundmusik einschalten" : "Hintergrundmusik stumm schalten"}
      >
        {muted ? <VolumeX size={iconSize} aria-hidden="true" /> : <Music2 size={iconSize} aria-hidden="true" />}
      </button>
      <Slider
        value={factor / max}
        onChange={(value) => change(Math.round(value * max * 20) / 20)}
        label="Lautstärke der Hintergrundmusik"
        valueText={muted ? "Musik aus" : `${Math.round(factor * 100)} Prozent`}
        step={0.05 / max * 2}
      />
    </div>
  );

  return (
    <div className="sp-music" data-off={muted || undefined}>
      <div className="sp-music-inline">
        {label}
        {row(17)}
      </div>

      <div className="sp-music-compact" ref={compactRef}>
        <button
          type="button"
          className="sp-music-toggle"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-label="Hintergrundmusik einstellen"
          data-off={muted || undefined}
        >
          {muted ? <VolumeX size={20} aria-hidden="true" /> : <Music2 size={20} aria-hidden="true" />}
          <span>Musik</span>
        </button>
        {panelOpen && (
          <div className="sp-music-panel" role="group" aria-label="Hintergrundmusik">
            {label}
            {row(18)}
            <p>Nur die Musik – die Stimme bleibt gleich laut.</p>
          </div>
        )}
      </div>
    </div>
  );
}
