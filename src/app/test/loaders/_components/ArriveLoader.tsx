"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellOff, Check, Headphones, Sofa, Wind } from "lucide-react";
import { FigureIcon, LoaderProps, ReadyCta, SlowNote, StoryPanel, phaseHeadline } from "./shared";

const BREATHS = 3;
const BREATH_SECONDS = 7;

const ITEMS = [
  { id: "headphones", icon: Headphones, title: "Kopfhörer bereitlegen", hint: "Die Stimme wirkt so ganz nah." },
  { id: "comfy", icon: Sofa, title: "Bequem hinsetzen oder hinlegen", hint: "Dein Körper darf schwer werden." },
  { id: "quiet", icon: BellOff, title: "Benachrichtigungen stumm", hint: "Für ein paar Minuten nur für dich." },
  { id: "breath", icon: Wind, title: "Drei tiefe Atemzüge", hint: "Tippe – wir atmen gemeinsam." },
] as const;

/** Variante 5 – Ankommen: Die Wartezeit wird zur Vorbereitung aufs Hören. */
export default function ArriveLoader({ figure, phase, estimate, voiceName, slow, onPlay }: LoaderProps) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [breathing, setBreathing] = useState<number | null>(null);

  useEffect(() => {
    if (breathing === null) return;
    if (breathing >= BREATHS) {
      setDone((d) => ({ ...d, breath: true }));
      setBreathing(null);
      return;
    }
    const timer = window.setTimeout(() => setBreathing((b) => (b ?? 0) + 1), BREATH_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [breathing]);

  const toggle = (id: string) => {
    if (id === "breath") {
      if (!done.breath && breathing === null) setBreathing(0);
      return;
    }
    setDone((d) => ({ ...d, [id]: !d[id] }));
  };

  const allDone = ITEMS.every((item) => done[item.id]);

  if (phase === "ready") {
    return (
      <StoryPanel>
        <ReadyCta
          figure={figure}
          onPlay={onPlay}
          title={allDone ? "Alles ist vorbereitet" : "Deine Power Story ist bereit"}
          sub={allDone ? `Du bist angekommen. ${figure.name} wartet auf dich.` : undefined}
        />
      </StoryPanel>
    );
  }

  return (
    <StoryPanel>
      <div className="ll-arrive">
        <header className="ll-arrive-head">
          <span className="ll-words-avatar"><FigureIcon figure={figure} size={40} /></span>
          <div>
            <p className="ll-kicker">Gleich ist {figure.name} bei dir</p>
            <h2>Mach es dir schon mal bequem</h2>
          </div>
        </header>

        <ul className="ll-arrive-grid">
          {ITEMS.map(({ id, icon: Icon, title, hint }) => {
            const isDone = !!done[id];
            const isBreathing = id === "breath" && breathing !== null;
            return (
              <li key={id}>
                <button
                  type="button"
                  className="ll-arrive-card"
                  aria-pressed={isDone}
                  data-breathing={isBreathing || undefined}
                  onClick={() => toggle(id)}
                >
                  <span className="ll-arrive-icon" aria-hidden="true">
                    <AnimatePresence mode="wait" initial={false}>
                      {isDone ? (
                        <motion.span key="check" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 18 }}>
                          <Check size={20} strokeWidth={2.6} />
                        </motion.span>
                      ) : isBreathing ? (
                        <motion.span
                          key="breath"
                          className="ll-arrive-breath"
                          animate={{ scale: [0.55, 1, 0.55] }}
                          transition={{ duration: BREATH_SECONDS, times: [0, 0.43, 1], repeat: Infinity, ease: "easeInOut" }}
                        />
                      ) : (
                        <motion.span key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Icon size={20} /></motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="ll-arrive-text">
                    <strong>{title}</strong>
                    <span>{isBreathing ? `Atemzug ${(breathing ?? 0) + 1} von ${BREATHS} …` : hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <AnimatePresence>
          {allDone && (
            <motion.p className="ll-arrive-done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              Du bist bereit. Sobald deine Story fertig ist, geht es los.
            </motion.p>
          )}
        </AnimatePresence>

        <div className="ll-bar-wrap">
          <div className="ll-bar-labels">
            <span role="status">{phaseHeadline(phase, voiceName)} …</span>
            <span>meist 1–2 Minuten</span>
          </div>
          <div className="ll-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(estimate * 100)} aria-label="Fortschritt">
            <motion.div className="ll-bar-fill" animate={{ width: `${Math.max(4, estimate * 100)}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
            <span className="ll-bar-split" style={{ left: "25%" }} aria-hidden="true" />
          </div>
          <div className="ll-bar-legend" aria-hidden="true">
            <span data-active={phase === "text"}>Geschichte</span>
            <span data-active={phase === "audio"}>Stimme</span>
          </div>
        </div>
        <SlowNote show={slow} />
      </div>
    </StoryPanel>
  );
}
