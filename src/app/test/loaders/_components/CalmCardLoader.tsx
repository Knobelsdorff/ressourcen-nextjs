"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Headphones } from "lucide-react";
import { FigureIcon, LoaderProps } from "./shared";
import { CalmCue, CalmSlowNote, CalmSteps, lowerFirst, storyProgress } from "./CalmShared";

const R = 46;
const C = 2 * Math.PI * R;

/**
 * 1E – Karte · Prozent-Ring: Kompakt, im Stil des Dashboard-Hinweises
 * (dashboard-first-story). Ein Ring um die Figur mit Prozentzahl, daneben
 * Restzeit und Uhrzeit. Passt für Bestandskund:innen und fürs Dashboard.
 */
export default function CalmCardLoader({ figure, phase, voiceName, elapsed, phaseElapsed, slow, onPlay }: LoaderProps) {
  const ready = phase === "ready";
  const progress = storyProgress(phase, elapsed, phaseElapsed);

  return (
    <section className="lc lc-center">
      <div className="lc-card" aria-live="polite">
        <div
          className="lc-card-dial"
          role="progressbar"
          aria-label="Fortschritt deiner Power Story"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={R} className="lc-card-dial-track" />
            <circle cx="50" cy="50" r={R} className="lc-card-dial-arc" strokeDasharray={C} strokeDashoffset={C * (1 - progress.percent / 100)} />
          </svg>
          <span className={`lc-card-icon ${ready ? "is-still" : ""}`} aria-hidden="true">
            <FigureIcon figure={figure} size={44} />
          </span>
          <span className="lc-card-percent" aria-hidden="true">{ready ? "Fertig" : `${progress.percent} %`}</span>
        </div>

        <div className="lc-card-copy">
          <span className="lc-eyebrow"><span /> DEINE NEUE POWER STORY</span>
          <AnimatePresence mode="wait">
            {ready ? (
              <motion.div key="ready" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h2 className="lc-card-title">Deine neue Power Story ist da.</h2>
                <p className="lc-card-text">
                  Deine Geschichte mit {figure.name}, gesprochen von {voiceName}. Nimm dir ein paar ruhige Minuten.
                </p>
                <button type="button" className="lc-pill-button" onClick={onPlay}>
                  <Headphones size={18} aria-hidden="true" /> Jetzt anhören
                </button>
              </motion.div>
            ) : (
              <motion.div key="wait" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <h2 className="lc-card-title" role="status">
                  {progress.remaining <= 8 ? "Deine Power Story ist gleich fertig." : `Fertig in ${lowerFirst(progress.remainingLabel).replace("noch ", "")}.`}
                </h2>
                <p className="lc-card-text">
                  {phase === "audio"
                    ? `Deine Geschichte mit ${figure.name} ist geschrieben – ${voiceName}s Stimme wird gerade aufgenommen.`
                    : `Wir schreiben gerade deine Geschichte mit ${figure.name} aus deinen Antworten.`}{" "}
                  Voraussichtlich um <strong>{progress.finishAt} Uhr</strong>.
                </p>
                <CalmSteps phase={phase} stepFill={progress.stepFill} voiceName={voiceName} align="start" showStatus={false} />
                <p className="lc-card-breath" aria-hidden="true">
                  <span className="lc-card-breath-dot" />
                  <span>Atme mit:</span>
                  <CalmCue className="lc-card-cue" />
                </p>
                <CalmSlowNote show={slow || progress.overdue} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
