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
import { T, useTextFn, type TextFn } from "@/components/site-text/T";
import { createStory } from "@/content/texts/createStory";

const R = 48;
const C = 2 * Math.PI * R;
const STEPS = [createStory["loader.step.answers"], createStory["loader.step.story"], createStory["loader.step.voice"]];

function headline(phase: StoryPhase, voiceName: string | null, tx: TextFn) {
  if (phase === "text") return tx(createStory["loader.headline.text"]);
  if (phase === "audio") return voiceName ? tx(createStory["loader.headline.audioVoice"], { voice: voiceName }) : tx(createStory["loader.headline.audio"]);
  return tx(createStory["loader.headline.ready"]);
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
  const tx = useTextFn();
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
  const remainingLabel = formatRemaining(remaining, {
    almost: tx(createStory["loader.remaining.almost"]),
    seconds: tx(createStory["loader.remaining.seconds"]),
    oneMinute: tx(createStory["loader.remaining.oneMinute"]),
    minutes: tx(createStory["loader.remaining.minutes"]),
  });
  const tabTitleReady = tx(createStory["loader.tabTitleReady"]);
  const tabTitleProgress = tx(createStory["loader.tabTitleProgress"], { percent });

  // Im Tab-Titel mitzählen – wer kurz woanders ist, sieht trotzdem den Stand.
  useEffect(() => {
    const previous = document.title;
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    document.title = ready ? tabTitleReady : tabTitleProgress;
  }, [ready, tabTitleReady, tabTitleProgress]);

  return (
    <section className="story-loader" aria-label={tx(createStory["loader.aria"])}>
      <div
        className="story-loader-halo"
        data-ready={ready || undefined}
        role="progressbar"
        aria-label={tx(createStory["loader.progressAria"])}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={ready ? tx(createStory["loader.progressValueReady"]) : tx(createStory["loader.progressValue"], { percent, remaining: remainingLabel })}
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
        <span className="story-loader-cue-in"><T t={createStory["loader.inhale"]} /></span>
        <span className="story-loader-cue-out"><T t={createStory["loader.exhale"]} /></span>
        <span className="story-loader-cue-still"><T t={createStory["loader.breathe"]} /></span>
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
          {headline(raw.phase, voiceName, tx)}
        </motion.p>
      </AnimatePresence>
      <h1 className="story-loader-title" role="status">{ready ? <T t={createStory["loader.done"]} /> : remainingLabel}</h1>
      <p className="story-loader-lead">{ready ? <T t={createStory["loader.figureReady"]} vars={{ figure: figure.name }} /> : <T t={createStory["loader.breatheAlong"]} />}</p>

      <ol className="story-loader-steps" aria-label={tx(createStory["loader.stepsAria"])}>
        {STEPS.map((step, i) => {
          const state = i < active ? "done" : i === active ? "active" : "todo";
          return (
            <li key={step.key} data-state={state} aria-current={state === "active" ? "step" : undefined}>
              <span className="story-loader-step-bar"><i style={{ transform: `scaleX(${fills[i]})` }} /></span>
              <span><T t={step} /></span>
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
            <T t={createStory["loader.slow"]} />
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
