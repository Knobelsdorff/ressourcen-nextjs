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
import { T, useTextFn } from "@/components/site-text/T";
import { player } from "@/content/texts/player";

export default function MusicControl() {
  const { factor, max, muted, change, toggleMute } = useMusicVolumeFactor();
  const [panelOpen, setPanelOpen] = useState(false);
  const tx = useTextFn();
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
  const valueText = muted ? tx(player["music.off"]) : `${Math.round(factor * 100)} %`;

  const label = (
    <span className="sp-music-label">
      <T t={player["music.label"]} /><span className="sp-music-value">{valueText}</span>
    </span>
  );
  const row = (iconSize: number) => (
    <div className="sp-music-row">
      <button
        type="button"
        className="sp-music-mute"
        onClick={toggleMute}
        aria-pressed={muted}
        aria-label={tx(muted ? player["music.unmute"] : player["music.mute"])}
      >
        {muted ? <VolumeX size={iconSize} aria-hidden="true" /> : <Music2 size={iconSize} aria-hidden="true" />}
      </button>
      {/* Gehör-gerecht: Regler-Position im Quadrat → viel Weg im leisen Bereich,
          wo die Musik unter der Stimme liegen soll. Gespeichert wird weiter der Faktor. */}
      <Slider
        value={Math.sqrt(Math.max(0, factor) / max)}
        onChange={(value) => change(Math.round(value * value * max * 100) / 100)}
        label={tx(player["music.volume"])}
        valueText={muted ? tx(player["music.volumeOff"]) : tx(player["music.volumeValue"], { percent: Math.round(factor * 100) })}
        step={0.04}
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
          aria-label={tx(player["music.settings"])}
          data-off={muted || undefined}
        >
          {muted ? <VolumeX size={20} aria-hidden="true" /> : <Music2 size={20} aria-hidden="true" />}
          <span><T t={player["music.short"]} /></span>
        </button>
        {panelOpen && (
          <div className="sp-music-panel" role="group" aria-label={tx(player["music.label"])}>
            {label}
            {row(18)}
            <p><T t={player["music.note"]} /></p>
          </div>
        )}
      </div>
    </div>
  );
}
