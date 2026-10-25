"use client";

/**
 * Warten auf die Power Story (Schritt 5): Atem-Halo mit Fortschrittsring.
 *
 * Der Ring und die Restzeit kommen aus src/lib/story-progress.ts – beim Text
 * aus den wirklich geschriebenen Zeichen, bei der Stimme aus der Textlänge.
 * Prozent steigt nur, die Restzeit sinkt nur. Der Atem selbst läuft über CSS
 * (4 s ein, 6 s aus), ohne Re-Render pro Frame.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import FigureIcon from "./FigureIcon";
import { ResourceFigure } from "@/lib/types/story";
import { computeProgress, formatRemaining, readTiming, storyTimeline, StoryPhase } from "@/lib/story-progress";

const R = 48;
const C = 2 * Math.PI * R;
const STEPS = ["Antworten", "Geschichte", "Stimme"];

function headline(phase: StoryPhase, voiceName: string | null) {
  if (phase === "text") return "Deine Geschichte wird geschrieben";
  if (phase === "audio") return voiceName ? `${voiceName} spricht deine Geschichte ein` : "Deine Geschichte wird eingesprochen";
  return "Deine Power Story ist bereit";
}

interface StoryGenerationLoaderProps {
  figure: ResourceFigure;
  /** Vorname der Stimme, z. B. "Kerstin". */
  voiceName: string | null;
  /** Audio ist da – Ring schließt sich, gleich übernimmt der Player. */
  ready: boolean;
}

export default function StoryGenerationLoader({ figure, voiceName, ready }: StoryGenerationLoaderProps) {
  const timeline = useSyncExternalStore(storyTimeline.subscribe, storyTimeline.get, storyTimeline.getServer);
  // Kalibrierung einmal pro Lauf lesen, damit sich die Schätzung nicht mittendrin verschiebt.
  const [timing] = useState(readTiming);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [ready]);

  const raw = computeProgress(timeline, now, timing, ready);
  const shown = useRef({ percent: 0, remaining: Number.POSITIVE_INFINITY });
  const percent = ready ? 100 : Math.min(99, Math.max(shown.current.percent, raw.percent));
  const remaining = Math.min(shown.current.remaining, raw.remaining);
  useEffect(() => {
    shown.current = { percent, remaining };
  });

  const active = raw.phase === "text" ? 1 : raw.phase === "audio" ? 2 : 3;
  const fills = [1, raw.phase === "text" ? raw.stepFill : 1, raw.phase === "audio" ? raw.stepFill : raw.phase === "ready" ? 1 : 0];
  const remainingLabel = formatRemaining(remaining);

  // Im Tab-Titel mitzählen – wer kurz woanders ist, sieht trotzdem den Stand.
  useEffect(() => {
    const previous = document.title;
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    document.title = ready ? "Fertig · Deine Power Story" : `${percent} % · Deine Power Story`;
  }, [percent, ready]);

  return (
    <section className="story-loader" aria-label="Deine Power Story wird erstellt">
      <div
        className="story-loader-halo"
        data-ready={ready || undefined}
        role="progressbar"
        aria-label="Fortschritt deiner Power Story"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={ready ? "Fertig" : `${percent} Prozent, ${remainingLabel}`}
      >
        <svg viewBox="0 0 100 100" className="story-loader-ring" aria-hidden="true">
          <circle cx="50" cy="50" r={R} className="story-loader-ring-track" />
          <circle cx="50" cy="50" r={R} className="story-loader-ring-arc" strokeDasharray={C} strokeDashoffset={C * (1 - percent / 100)} />
        </svg>
        <span className="story-loader-breath story-loader-breath--outer" aria-hidden="true" />
        <span className="story-loader-breath story-loader-breath--inner" aria-hidden="true" />
        <span className="story-loader-avatar" aria-hidden="true">
          <FigureIcon figure={figure} size={70} className="story-loader-avatar-image" />
          <AnimatePresence>
            {ready && (
              <motion.span className="story-loader-done" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}>
                <Check size={16} strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>

      <span className="story-loader-cue" data-hidden={ready || undefined} aria-hidden="true">
        <span className="story-loader-cue-in">Einatmen</span>
        <span className="story-loader-cue-out">Ausatmen</span>
        <span className="story-loader-cue-still">Atme in deinem Rhythmus</span>
      </span>

      <AnimatePresence mode="wait">
        <motion.p
          key={raw.phase}
          className="story-loader-kicker"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.4 }}
        >
          {headline(raw.phase, voiceName)}
        </motion.p>
      </AnimatePresence>
      <h1 className="story-loader-title" role="status">{ready ? "Fertig." : remainingLabel}</h1>
      <p className="story-loader-lead">{ready ? `${figure.name} ist jetzt bei dir.` : "Atme mit, wenn du magst."}</p>

      <ol className="story-loader-steps" aria-label="Schritte deiner Power Story">
        {STEPS.map((label, i) => {
          const state = i < active ? "done" : i === active ? "active" : "todo";
          return (
            <li key={label} data-state={state} aria-current={state === "active" ? "step" : undefined}>
              <span className="story-loader-step-bar"><i style={{ transform: `scaleX(${fills[i]})` }} /></span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>

      <AnimatePresence>
        {raw.overdue && !ready && (
          <motion.p
            className="story-loader-slow"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.6 }}
          >
            Heute dauert es etwas länger als sonst – sie ist gleich fertig. Deine Antworten sind sicher, bleib ganz in Ruhe hier.
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
