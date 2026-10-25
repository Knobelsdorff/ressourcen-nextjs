"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LoaderProps } from "./shared";
import { CalmAvatar, CalmCue, CalmReady, CalmSlowNote, EXPECTED_TOTAL, calmHeadline, lowerFirst, storyProgress } from "./CalmShared";

const BREATH_SECONDS = 10;
const TOTAL_BREATHS = Math.ceil(EXPECTED_TOTAL / BREATH_SECONDS);

/**
 * 1D – Atemzüge · Zeit in Atemzügen: "Noch etwa 4 Atemzüge". Ein Atemzug sind
 * 10 Sekunden; die Punkte zeigen, wie viele schon geschafft sind.
 */
export default function CalmCountLoader({ figure, phase, voiceName, elapsed, phaseElapsed, slow, onPlay }: LoaderProps) {
  const progress = storyProgress(phase, elapsed, phaseElapsed);
  const left = Math.ceil(progress.remaining / BREATH_SECONDS);
  const filled = Math.max(0, TOTAL_BREATHS - left);
  const almost = progress.remaining <= 8;

  return (
    <section className="lc lc-center">
      <AnimatePresence mode="wait">
        {phase === "ready" ? (
          <CalmReady key="ready" figure={figure} onPlay={onPlay} sub="Du hast dir ein paar ruhige Atemzüge geschenkt. Jetzt ist deine Story da." />
        ) : (
          <motion.div key="wait" className="lc-col" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <div className="lc-ripple" aria-hidden="true">
              <span className="lc-ripple-ring" />
              <span className="lc-ripple-ring lc-ripple-ring--late" />
              <span className="lc-ripple-core"><CalmAvatar figure={figure} size={88} /></span>
            </div>
            <CalmCue className="lc-halo-cue" />

            <p className="lc-kicker">{calmHeadline(phase, voiceName)}</p>
            <h1 className="lc-title" role="status">
              {almost ? "Gleich ist es so weit" : left === 1 ? "Noch etwa ein Atemzug" : `Noch etwa ${left} Atemzüge`}
            </h1>
            <p className="lc-lead">
              {almost
                ? "Bleib bei deinem Atem. Deine Story ist fast fertig."
                : `Ein Atemzug dauert etwa 10 Sekunden – ${lowerFirst(progress.remainingLabel)}, bis deine Power Story fertig ist.`}
            </p>

            <ol
              className="lc-count"
              aria-label={`${filled} von ${TOTAL_BREATHS} Atemzügen`}
            >
              {Array.from({ length: TOTAL_BREATHS }).map((_, i) => (
                <li key={i} data-state={i < filled ? "done" : i === filled ? "current" : "todo"}><i /></li>
              ))}
            </ol>
            <p className="lc-count-legend" aria-hidden="true">
              <span>Start</span>
              <span>Fertig ≈ {progress.finishAt}</span>
            </p>

            <CalmSlowNote show={slow || progress.overdue} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
