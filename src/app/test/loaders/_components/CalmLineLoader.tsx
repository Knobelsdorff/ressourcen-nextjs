"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LoaderProps } from "./shared";
import { CalmAvatar, CalmCue, CalmReady, CalmSlowNote, TEXT_SHARE, calmHeadline, storyProgress } from "./CalmShared";

/**
 * 1C – Atemlinie · Prozent: Ein großer Balken mit Etappen und Prozentzahl, die
 * mitwandert. Der Atembalken darunter ist nur noch Begleitung.
 */
export default function CalmLineLoader({ figure, phase, voiceName, elapsed, phaseElapsed, slow, onPlay }: LoaderProps) {
  const progress = storyProgress(phase, elapsed, phaseElapsed);
  const textDone = phase !== "text";

  return (
    <section className="lc lc-center">
      <AnimatePresence mode="wait">
        {phase === "ready" ? (
          <CalmReady key="ready" figure={figure} onPlay={onPlay} />
        ) : (
          <motion.div key="wait" className="lc-col lc-col--wide" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <div className="lc-figure">
              <CalmAvatar figure={figure} size={44} />
              <span>{figure.name}</span>
            </div>
            <h1 className="lc-title">{calmHeadline(phase, voiceName)}</h1>

            <div className="lc-meter">
              <div className="lc-meter-head">
                <span className="lc-meter-percent" aria-hidden="true">{progress.percent}<small>%</small></span>
                <span className="lc-meter-eta" role="status">{progress.remainingLabel}</span>
              </div>
              <div
                className="lc-meter-track"
                role="progressbar"
                aria-label="Fortschritt deiner Power Story"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                aria-valuetext={`${progress.percent} Prozent, ${progress.remainingLabel}`}
              >
                <i style={{ transform: `scaleX(${progress.percent / 100})` }} />
                <span className="lc-meter-tick" style={{ left: `${TEXT_SHARE * 100}%` }} data-done={textDone || undefined} />
              </div>
              <div className="lc-meter-legend" aria-hidden="true">
                <span style={{ width: `${TEXT_SHARE * 100}%` }} data-state={textDone ? "done" : "active"}>Geschichte</span>
                <span data-state={textDone ? "active" : "todo"}>Stimme</span>
                <span>Fertig ≈ {progress.finishAt}</span>
              </div>
            </div>

            <p className="lc-breath-label">Währenddessen: atme mit dem Balken</p>
            <div className="lc-line lc-line--small" aria-hidden="true">
              <span className="lc-line-fill" />
              <CalmCue className="lc-line-cue" />
            </div>
            <CalmSlowNote show={slow || progress.overdue} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
