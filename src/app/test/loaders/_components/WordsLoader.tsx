"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { FigureIcon, LoaderProps, PhaseSteps, ReadyCta, SlowNote, StoryPanel } from "./shared";

const ROW_SECONDS = 2.4;
const WAVE_BARS = 28;

/**
 * Variante 2 – Deine Worte: Die gewählten Antworten werden sichtbar zu einem
 * Faden verwoben. Zeigt, *was* gerade für dich gearbeitet wird.
 */
export default function WordsLoader({ figure, themes, phase, phaseElapsed, voiceName, slow, onPlay }: LoaderProps) {
  // Die letzte Zeile bleibt aktiv, bis der Text wirklich fertig ist.
  const woven = phase === "text" ? Math.min(themes.length - 1, Math.floor(phaseElapsed / ROW_SECONDS)) : themes.length;
  const threadFill = phase === "text" ? (woven + 0.5) / themes.length : 1;

  if (phase === "ready") {
    return (
      <StoryPanel>
        <ReadyCta figure={figure} onPlay={onPlay} sub="Aus deinen Worten ist deine Geschichte geworden. Lehn dich zurück." />
      </StoryPanel>
    );
  }

  return (
    <StoryPanel>
      <div className="ll-words">
        <header className="ll-words-head">
          <span className="ll-words-avatar"><FigureIcon figure={figure} size={40} /></span>
          <div>
            <p className="ll-kicker">Deine Power Story mit {figure.name}</p>
            <h2>Aus deinen Worten entsteht deine Geschichte</h2>
          </div>
        </header>

        <ol className="ll-words-list" aria-label="Deine Antworten">
          <span className="ll-words-thread" aria-hidden="true">
            <motion.span className="ll-words-thread-fill" animate={{ scaleY: threadFill }} transition={{ duration: 1.2, ease: "easeInOut" }} />
          </span>
          {themes.map((theme, index) => {
            const state = index < woven ? "done" : index === woven ? "active" : "todo";
            return (
              <li key={theme.id} className="ll-words-row" data-state={state}>
                <span className="ll-words-node" aria-hidden="true">
                  {state === "done" && <Check size={12} strokeWidth={3} />}
                </span>
                <div className="ll-words-body">
                  <p className="ll-words-title">{theme.title}</p>
                  <div className="ll-words-chips">
                    {theme.chosen.map((chip, chipIndex) => (
                      <motion.span
                        key={chip}
                        className="ll-words-chip"
                        initial={false}
                        animate={state === "todo" ? { opacity: 0.35, y: 0 } : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: state === "active" ? chipIndex * 0.35 : 0 }}
                      >
                        „{chip}“
                      </motion.span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <AnimatePresence>
          {phase === "audio" && (
            <motion.div
              className="ll-words-voice"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="ll-wave" aria-hidden="true">
                {Array.from({ length: WAVE_BARS }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${(i * 97) % 1100}ms`, height: `${30 + ((i * 37) % 60)}%` }} />
                ))}
              </div>
              <p>Dein Text ist fertig. Jetzt bekommt er {voiceName}s Stimme.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <PhaseSteps phase={phase} voiceName={voiceName} compact />
        <SlowNote show={slow} />
      </div>
    </StoryPanel>
  );
}
