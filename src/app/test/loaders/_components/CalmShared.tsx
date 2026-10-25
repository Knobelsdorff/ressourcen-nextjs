"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Headphones, Play } from "lucide-react";
import { FigureIcon, Phase } from "./shared";
import { ResourceFigure } from "@/lib/types/story";

/**
 * Bausteine für "Atemraum, neu" (Varianten 1A–1E).
 *
 * Gestaltung wie der Engel-Flow (AngelQuestionStep, FirstStoryServerGate):
 * Elfenbein-Fläche, Schokobraun, Sand-Kreise, Salbei nur für "fertig".
 * Der Atem läuft rein über CSS (4 s ein, 6 s aus) – kein Re-Render pro Frame,
 * bei "Bewegung reduzieren" steht alles still.
 */

/* ---------- Wann ist die Story fertig? ---------- */

/**
 * Übliche Dauer der beiden Schritte. Im echten Flow aus den Logs kalibrieren;
 * die Stimme hängt von der Textlänge ab, sobald der Text da ist, also
 * a + b × Zeichen statt einer festen Zahl.
 */
export const EXPECTED_TEXT = 15;
export const EXPECTED_AUDIO = 60;
export const EXPECTED_TOTAL = EXPECTED_TEXT + EXPECTED_AUDIO;
/** Anteil der Geschichte am Gesamtbalken (Rest = Stimme). */
export const TEXT_SHARE = 0.2;

export interface StoryProgress {
  /** 0–99 während des Wartens, 100 erst wenn fertig. Steigt nur. */
  percent: number;
  /** Geschätzte Sekunden bis fertig. Nie negativ, sinkt nur. */
  remaining: number;
  /** "Noch etwa 40 Sekunden" / "Gleich fertig" */
  remainingLabel: string;
  /** Uhrzeit, zu der die Story etwa fertig ist, z.B. "14:32". */
  finishAt: string;
  /** Füllstand des laufenden Schritts (0–1). */
  stepFill: number;
  /** Dauert deutlich länger als üblich. */
  overdue: boolean;
  /** Wie lange der Text gebraucht hat – bekannt, sobald die Stimme läuft. */
  textSeconds: number | null;
}

// 90 % der Strecke bei der üblichen Dauer, danach nur noch langsam – bleibt nie stehen.
const easeOut = (x: number) => 1 - Math.exp(-2.3 * x);

export function formatRemaining(seconds: number): string {
  if (seconds <= 8) return "Gleich fertig";
  if (seconds < 55) return `Noch etwa ${Math.ceil(seconds / 5) * 5} Sekunden`;
  if (seconds < 90) return "Noch etwa 1 Minute";
  return `Noch etwa ${Math.round(seconds / 60)} Minuten`;
}

export const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function clockIn(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function storyProgress(phase: Phase, elapsed: number, phaseElapsed: number): StoryProgress {
  if (phase === "ready") {
    return { percent: 100, remaining: 0, remainingLabel: "Fertig", finishAt: clockIn(0), stepFill: 1, overdue: false, textSeconds: null };
  }
  if (phase === "text") {
    const stepFill = easeOut(phaseElapsed / EXPECTED_TEXT);
    const remaining = EXPECTED_AUDIO + Math.max(0, EXPECTED_TEXT - phaseElapsed);
    return {
      percent: Math.floor(TEXT_SHARE * stepFill * 100),
      remaining,
      remainingLabel: formatRemaining(remaining),
      finishAt: clockIn(remaining),
      stepFill,
      overdue: phaseElapsed > EXPECTED_TEXT + 15,
      textSeconds: null,
    };
  }
  const stepFill = easeOut(phaseElapsed / EXPECTED_AUDIO);
  const remaining = Math.max(0, EXPECTED_AUDIO - phaseElapsed);
  return {
    percent: Math.min(99, Math.floor((TEXT_SHARE + (0.99 - TEXT_SHARE) * stepFill) * 100)),
    remaining,
    remainingLabel: formatRemaining(remaining),
    finishAt: clockIn(remaining),
    stepFill,
    overdue: phaseElapsed > EXPECTED_AUDIO + 10,
    textSeconds: Math.round(elapsed - phaseElapsed),
  };
}

export function calmHeadline(phase: Phase, voiceName: string) {
  if (phase === "text") return "Deine Geschichte wird geschrieben";
  if (phase === "audio") return `${voiceName} spricht deine Geschichte ein`;
  return "Deine Power Story ist bereit";
}

/** Füllstand der drei Abschnitte (Antworten · Geschichte · Stimme). */
export function segmentFills(phase: Phase, stepFill: number): [number, number, number] {
  if (phase === "ready") return [1, 1, 1];
  if (phase === "text") return [1, stepFill, 0];
  return [1, 1, stepFill];
}

export function CalmAvatar({ figure, size = 60, className = "" }: { figure: ResourceFigure; size?: number; className?: string }) {
  return (
    <span className={`lc-avatar ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <FigureIcon figure={figure} size={Math.round(size * 0.82)} />
    </span>
  );
}

/** "Einatmen" / "Ausatmen", im Takt der CSS-Animation. */
export function CalmCue({ className = "" }: { className?: string }) {
  return (
    <span className={`lc-cue ${className}`} aria-hidden="true">
      <span className="lc-cue-in">Einatmen</span>
      <span className="lc-cue-out">Ausatmen</span>
      <span className="lc-cue-still">Atme in deinem Rhythmus</span>
    </span>
  );
}

const STEP_LABELS = ["Antworten", "Geschichte", "Stimme"];

/** Drei Segmente wie der Fortschritt der Engel-Fragen – ehrlich, bleibt nie stehen. */
export function CalmSteps({
  phase,
  stepFill,
  voiceName,
  align = "center",
  showStatus = true,
}: {
  phase: Phase;
  stepFill: number;
  voiceName: string;
  align?: "center" | "start";
  showStatus?: boolean;
}) {
  const fills = segmentFills(phase, stepFill);
  const active = phase === "text" ? 1 : phase === "audio" ? 2 : 3;
  return (
    <div className="lc-steps" data-align={align}>
      <ol aria-label="Fortschritt deiner Power Story">
        {STEP_LABELS.map((label, i) => {
          const state = i < active ? "done" : i === active ? "active" : "todo";
          return (
            <li key={label} data-state={state} aria-current={state === "active" ? "step" : undefined}>
              <span className="lc-steps-bar"><i style={{ transform: `scaleX(${fills[i]})` }} /></span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
      {showStatus && (
        <p className="lc-steps-status" role="status">
          {calmHeadline(phase, voiceName)} <span>· meist 1–2 Minuten</span>
        </p>
      )}
    </div>
  );
}

export function CalmSlowNote({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.p
          className="lc-slow"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.6 }}
        >
          Heute dauert es etwas länger als sonst – sie ist gleich fertig. Deine Antworten sind sicher, bleib ganz in Ruhe hier.
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** Übergang in den Player – im echten Flow übernimmt hier AudioPlayback. */
export function CalmReady({ figure, onPlay, sub }: { figure: ResourceFigure; onPlay?: () => void; sub?: string }) {
  return (
    <motion.div
      className="lc-ready"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <button type="button" className="lc-play" onClick={onPlay} aria-label="Power Story anhören">
        <Play size={28} fill="currentColor" aria-hidden="true" />
      </button>
      <p className="lc-kicker">{figure.name} · Deine Power Story</p>
      <h2 className="lc-ready-title">Deine Power Story ist bereit</h2>
      <p className="lc-ready-sub">{sub ?? `Du musst nichts weiter tun. ${figure.name} ist jetzt bei dir.`}</p>
      <p className="lc-ready-hint"><Headphones size={15} aria-hidden="true" /> Am schönsten mit Kopfhörern</p>
    </motion.div>
  );
}
