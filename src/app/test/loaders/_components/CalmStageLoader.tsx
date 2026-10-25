"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { LoaderProps, Phase } from "./shared";
import {
  CalmAvatar,
  CalmCue,
  CalmReady,
  CalmSlowNote,
  EXPECTED_AUDIO,
  EXPECTED_TEXT,
  StoryProgress,
  calmHeadline,
  lowerFirst,
  storyProgress,
} from "./CalmShared";

interface Row {
  state: "done" | "active" | "todo";
  title: string;
  note: string;
  time: string;
  fill?: number;
}

function rows(phase: Phase, voiceName: string, progress: StoryProgress): Row[] {
  const textActive = phase === "text";
  const audioActive = phase === "audio";
  return [
    { state: "done", title: "Deine Antworten", note: "Gespeichert", time: "fertig" },
    textActive
      ? { state: "active", title: "Geschichte schreiben", note: "Läuft gerade …", time: `ca. ${EXPECTED_TEXT} Sek.`, fill: progress.stepFill }
      : { state: "done", title: "Geschichte schreiben", note: "Fertig", time: progress.textSeconds ? `nach ${progress.textSeconds} Sek.` : "fertig" },
    audioActive
      ? { state: "active", title: "Stimme aufnehmen", note: `${voiceName} spricht ein …`, time: lowerFirst(progress.remainingLabel), fill: progress.stepFill }
      : { state: "todo", title: "Stimme aufnehmen", note: `Danach, mit ${voiceName}`, time: `ca. ${Math.round(EXPECTED_AUDIO / 60)} Min.` },
  ];
}

/**
 * 1B – Bühne · Fahrplan: Uhrzeit "Fertig um ca. 14:32" ganz oben, darunter jeder
 * Schritt mit seiner Dauer und einem eigenen Balken. Rechts der Atemkreis.
 */
export default function CalmStageLoader({ figure, phase, voiceName, elapsed, phaseElapsed, slow, onPlay }: LoaderProps) {
  const progress = storyProgress(phase, elapsed, phaseElapsed);

  return (
    <section className="lc">
      <AnimatePresence mode="wait">
        {phase === "ready" ? (
          <div key="ready" className="lc-center"><CalmReady figure={figure} onPlay={onPlay} /></div>
        ) : (
          <motion.div key="wait" className="lc-stage" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <div className="lc-stage-head">
              <div className="lc-figure">
                <CalmAvatar figure={figure} size={56} />
                <span>{figure.name}</span>
              </div>
              <p className="lc-eta" role="status">
                <Clock size={15} aria-hidden="true" />
                <span>Fertig um ca. <strong>{progress.finishAt} Uhr</strong></span>
              </p>
              <h1 className="lc-title lc-title--xl">{calmHeadline(phase, voiceName)}</h1>
              <p className="lc-lead">So sieht der Fahrplan deiner Power Story aus. Atme in der Zeit ruhig mit dem Kreis.</p>
            </div>

            <div className="lc-stage-breath" aria-hidden="true">
              <div className="lc-stage-orbit">
                <span className="lc-stage-disc" />
                <CalmCue className="lc-stage-cue" />
              </div>
              <p className="lc-stage-caption">4 Sekunden ein · 6 Sekunden aus</p>
            </div>

            <div className="lc-stage-steps">
              <ol aria-label="Fortschritt deiner Power Story">
                {rows(phase, voiceName, progress).map((row) => (
                  <li key={row.title} data-state={row.state} aria-current={row.state === "active" ? "step" : undefined}>
                    <span className="lc-stage-mark" aria-hidden="true">
                      {row.state === "done" && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="lc-stage-text">
                      <span className="lc-stage-line">
                        <strong>{row.title}</strong>
                        <em>{row.time}</em>
                      </span>
                      <span>{row.note}</span>
                      {row.fill !== undefined && (
                        <span className="lc-stage-bar"><i style={{ transform: `scaleX(${row.fill})` }} /></span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <CalmSlowNote show={slow || progress.overdue} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
