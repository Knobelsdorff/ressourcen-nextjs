"use client";

/**
 * Gemeinsamer Aufbau des Story-Players – im Dashboard als Vollbild
 * (FullscreenStoryPlayer), am Ende von /create-story im Seitenfluss.
 *
 *   Bühne   Klopf-Video zentriert, Erklärung daneben (schmal: darunter)
 *   Leiste  Titel + Beschreibung · ±15 / Play + Fortschritt · Hintergrundmusik
 *
 * Rein darstellend: Die Wiedergabe steuert der jeweilige Audio-Motor
 * (useAudioPlayer im Dashboard, AudioPlayback in /create-story) – an deren
 * Logik ändert sich nichts.
 */

import { motion } from "framer-motion";
import { Info, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import Slider from "./Slider";
import TappingVideo from "./TappingVideo";
import MusicControl from "./MusicControl";
import "./story-player.css";

export const TAPPING_TITLE = "Begleite deine Geschichte mit sanftem Klopfen";
export const TAPPING_TEXT =
  "Klopfe abwechselnd links und rechts, wie im Video gezeigt. Das kann dir helfen, noch bewusster in die Geschichte einzutauchen.";

export function formatPlayerTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function SkipIcon({ direction }: { direction: "back" | "forward" }) {
  const Icon = direction === "back" ? RotateCcw : RotateCw;
  return (
    <span className="sp-skip-icon" aria-hidden="true">
      <Icon strokeWidth={1.7} />
      <span>15</span>
    </span>
  );
}

export interface StoryPlayerLayoutProps {
  title: string;
  subtitle?: string | null;
  playing: boolean;
  /** Noch nicht abspielbar (z. B. Safari-Umwandlung, Laden) – Play zeigt einen Ring. */
  busy?: boolean;
  /** Play gesperrt (nur wenn wirklich nichts geht). */
  playDisabled?: boolean;
  time: number;
  duration: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (seconds: number) => void;
  /** Regler für die Hintergrundmusik zeigen (nur wenn es Musik gibt). */
  hasMusic: boolean;
  explainOpen: boolean;
  onToggleExplain: () => void;
  /** Über dem Klopf-Hinweis, z. B. ein einleitender Satz. */
  lead?: React.ReactNode;
  /** Unter dem Klopf-Hinweis: Meldungen, Ende der Geschichte, Aktionen. */
  extra?: React.ReactNode;
  /** Klopf-Hinweis ausblenden (z. B. wenn nach dem Hören etwas anderes dort steht). */
  hideTapping?: boolean;
  /** Oben (Vollbild: Griff zum Schließen). */
  top?: React.ReactNode;
}

export default function StoryPlayerLayout({
  title,
  subtitle,
  playing,
  busy = false,
  playDisabled = false,
  time,
  duration,
  onToggle,
  onSeek,
  onSkip,
  hasMusic,
  explainOpen,
  onToggleExplain,
  lead,
  extra,
  hideTapping = false,
  top,
}: StoryPlayerLayoutProps) {
  const progress = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0;
  const canSeek = duration > 0;

  return (
    <>
      {top}

      <main className="sp-stage">
        <div className="sp-stage-inner">
          <motion.div
            className="sp-artwork"
            animate={{ scale: playing ? 1 : 0.94 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
          >
            <TappingVideo />
          </motion.div>

          <aside className="sp-hint" aria-label="Klopfen">
            {lead && <p className="sp-lead">{lead}</p>}
            {!hideTapping && (
              <>
                <h2>{TAPPING_TITLE}</h2>
                {explainOpen && <p className="sp-hint-text">{TAPPING_TEXT}</p>}
                <button type="button" className="sp-hint-toggle" onClick={onToggleExplain} aria-expanded={explainOpen}>
                  <Info size={14} strokeWidth={2} aria-hidden="true" />
                  {explainOpen ? "Weniger anzeigen" : "So geht's"}
                </button>
              </>
            )}
            {extra && <div className="sp-extra">{extra}</div>}
          </aside>
        </div>
      </main>

      <footer className="sp-bar" aria-label="Wiedergabe">
        <div className="sp-bar-info">
          <p className="sp-bar-title">{title}</p>
          {subtitle && <p className="sp-bar-sub">{subtitle}</p>}
        </div>

        <div className="sp-bar-center">
          <div className="sp-transport">
            <button type="button" className="sp-glyph" onClick={() => onSkip(-15)} disabled={!canSeek} aria-label="15 Sekunden zurück">
              <SkipIcon direction="back" />
            </button>
            <button
              type="button"
              className="sp-play"
              onClick={onToggle}
              disabled={playDisabled}
              aria-label={busy && !playing ? "Wird geladen" : playing ? "Pause" : "Abspielen"}
              data-busy={busy || undefined}
            >
              {playing
                ? <Pause size={22} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                : <Play size={22} fill="currentColor" strokeWidth={0} className="sp-play-icon" aria-hidden="true" />}
            </button>
            <button type="button" className="sp-glyph" onClick={() => onSkip(15)} disabled={!canSeek} aria-label="15 Sekunden vor">
              <SkipIcon direction="forward" />
            </button>
          </div>
          <div className="sp-progress">
            <span className="sp-time sp-time--now">{formatPlayerTime(time)}</span>
            <Slider
              value={progress}
              onCommit={(value) => canSeek && onSeek(value * duration)}
              label="Position in der Geschichte"
              valueText={`${formatPlayerTime(time)} von ${formatPlayerTime(duration)}`}
              disabled={!canSeek}
              step={15 / Math.max(duration, 15)}
              className="sp-progress-slider"
            />
            <span className="sp-time sp-time--total">{canSeek ? formatPlayerTime(duration) : "–:––"}</span>
          </div>
        </div>

        <div className="sp-bar-music">{hasMusic && <MusicControl />}</div>
      </footer>
    </>
  );
}
