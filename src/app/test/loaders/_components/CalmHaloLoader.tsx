"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LoaderProps } from "./shared";
import { CalmAvatar, CalmCue, CalmReady, CalmSlowNote, CalmSteps, calmHeadline, storyProgress } from "./CalmShared";

const R = 48;
const C = 2 * Math.PI * R;

/**
 * 1A – Halo · Countdown: Die verbleibende Zeit ist die Überschrift
 * ("Noch etwa 40 Sekunden"), ein Ring um den Halo füllt sich bis "fertig".
 */
export default function CalmHaloLoader({ figure, phase, voiceName, elapsed, phaseElapsed, slow, onPlay }: LoaderProps) {
  const progress = storyProgress(phase, elapsed, phaseElapsed);

  return (
    <section className="lc lc-center">
      <AnimatePresence mode="wait">
        {phase === "ready" ? (
          <CalmReady key="ready" figure={figure} onPlay={onPlay} />
        ) : (
          <motion.div key="wait" className="lc-col" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <div
              className="lc-halo lc-halo--ring"
              role="progressbar"
              aria-label="Fortschritt deiner Power Story"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
            >
              <svg viewBox="0 0 100 100" className="lc-halo-progress" aria-hidden="true">
                <circle cx="50" cy="50" r={R} className="lc-halo-progress-track" />
                <circle
                  cx="50"
                  cy="50"
                  r={R}
                  className="lc-halo-progress-arc"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - progress.percent / 100)}
                />
              </svg>
              <span className="lc-halo-ring lc-halo-ring--outer" aria-hidden="true" />
              <span className="lc-halo-ring lc-halo-ring--inner" aria-hidden="true" />
              <CalmAvatar figure={figure} size={92} className="lc-halo-avatar" />
            </div>
            <CalmCue className="lc-halo-cue" />

            <p className="lc-kicker">{calmHeadline(phase, voiceName)}</p>
            <h1 className="lc-title lc-countdown" role="status">{progress.remainingLabel}</h1>
            <p className="lc-lead">Atme mit, wenn du magst.</p>

            <CalmSteps phase={phase} stepFill={progress.stepFill} voiceName={voiceName} showStatus={false} />
            <CalmSlowNote show={slow || progress.overdue} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
