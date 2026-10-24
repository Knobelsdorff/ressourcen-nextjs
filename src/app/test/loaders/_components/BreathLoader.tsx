"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FigureIcon, LoaderProps, PhaseSteps, ReadyCta, SlowNote, StoryPanel } from "./shared";

// 4 s ein, 6 s aus = 6 Atemzüge pro Minute (langsames Atmen mit längerer Ausatmung).
const INHALE = 4;
const EXHALE = 6;
const CYCLE = INHALE + EXHALE;
const RING_DOTS = 6;

function useBreathClock(enabled: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return t;
}

/** Variante 1 – Atemraum: Der Kreis wird zu einer echten, geführten Atemübung. */
export default function BreathLoader({ figure, phase, voiceName, slow, onPlay }: LoaderProps) {
  const reduce = useReducedMotion();
  const t = useBreathClock(!reduce && phase !== "ready");

  const inCycle = t % CYCLE;
  const inhaling = inCycle < INHALE;
  const p = inhaling ? inCycle / INHALE : 1 - (inCycle - INHALE) / EXHALE;
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
  const scale = reduce ? 0.85 : 0.62 + 0.38 * eased;
  const breaths = Math.floor(t / CYCLE);
  const arc = inhaling ? inCycle / INHALE : (inCycle - INHALE) / EXHALE;

  const R = 46;
  const C = 2 * Math.PI * R;

  return (
    <StoryPanel className="ll-breath-panel">
      <div className="ll-breath">
        <div className="ll-figure-row">
          <FigureIcon figure={figure} size={36} />
          <span>{figure.name}</span>
        </div>

        <AnimatePresence mode="wait">
          {phase === "ready" ? (
            <ReadyCta
              key="ready"
              figure={figure}
              onPlay={onPlay}
              sub="Bleib bei diesem ruhigen Atem. Wenn du bereit bist, starte deine Story."
            />
          ) : (
            <motion.div key="breath" exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}>
              <div className="ll-breath-stage" aria-hidden="true">
                <svg viewBox="0 0 100 100" className="ll-breath-ring">
                  <circle cx="50" cy="50" r={R} className="ll-breath-ring-track" />
                  {!reduce && (
                    <circle
                      cx="50"
                      cy="50"
                      r={R}
                      className={`ll-breath-ring-arc ${inhaling ? "is-in" : "is-out"}`}
                      strokeDasharray={C}
                      strokeDashoffset={C * (1 - arc)}
                    />
                  )}
                  {Array.from({ length: RING_DOTS }).map((_, i) => {
                    const angle = (i / RING_DOTS) * Math.PI * 2 - Math.PI / 2;
                    return (
                      <circle
                        key={i}
                        cx={50 + Math.cos(angle) * R}
                        cy={50 + Math.sin(angle) * R}
                        r={2.2}
                        className={`ll-breath-ring-dot ${i < Math.min(breaths, RING_DOTS) ? "is-lit" : ""}`}
                      />
                    );
                  })}
                </svg>
                <div className="ll-breath-orb" style={{ transform: `scale(${scale})` }}>
                  <div className="ll-breath-orb-core" style={{ opacity: 0.35 + eased * 0.4 }} />
                </div>
                <div className="ll-breath-label">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={reduce ? "static" : inhaling ? "in" : "out"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      {reduce ? "Atme in deinem Rhythmus" : inhaling ? "Einatmen" : "Ausatmen"}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              <p className="ll-breath-invite">
                {breaths === 0
                  ? "Atme mit, wenn du magst. Währenddessen entsteht deine Power Story."
                  : `${breaths} ${breaths === 1 ? "ruhiger Atemzug" : "ruhige Atemzüge"}. Schön, dass du da bist.`}
              </p>
              <PhaseSteps phase={phase} voiceName={voiceName} compact />
              <SlowNote show={slow} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StoryPanel>
  );
}
