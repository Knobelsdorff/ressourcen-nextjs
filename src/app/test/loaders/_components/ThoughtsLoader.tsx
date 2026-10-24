"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FigureIcon, LoaderProps, PhaseSteps, ReadyCta, SlowNote, StoryPanel } from "./shared";

type Card = { kind: "Gedanke" | "Wusstest du?" | "Tipp" | "Erfahrung"; text: string; by?: string };

// Eigene Texte im Ton der Landingpage, ein gemeinfreies Rilke-Zitat (†1926),
// ein Sprichwort und das Testimonial von der Startseite.
const CARDS: Card[] = [
  { kind: "Gedanke", text: "Du musst nichts leisten. Du darfst einfach da sein." },
  { kind: "Tipp", text: "Mit Kopfhörern klingt die Stimme ganz nah – fast so, als säße jemand neben dir." },
  { kind: "Gedanke", text: "Ruhe ist kein Ziel, das du erreichen musst. Sie ist schon in dir – manchmal nur leise." },
  { kind: "Wusstest du?", text: "Innere Helferfiguren werden in der Psychotherapie seit Jahrzehnten genutzt – als sicherer Ort, an den man jederzeit zurückkehren kann." },
  { kind: "Gedanke", text: "Lass dir alles geschehen: Schönheit und Schrecken. Man muss nur gehen: Kein Gefühl ist das fernste.", by: "Rainer Maria Rilke" },
  { kind: "Tipp", text: "Viele hören ihre Power Story abends vor dem Einschlafen. Sie wird mit jedem Hören vertrauter." },
  { kind: "Erfahrung", text: "Schon nach den ersten Minuten wurde es spürbar ruhiger in mir.", by: "Linda R." },
  { kind: "Gedanke", text: "In der Ruhe liegt die Kraft.", by: "Sprichwort" },
];
const CARD_SECONDS = 9;

/** Variante 4 – Gedanken für den Moment: ruhige Karten, selbst weiterblätterbar. */
export default function ThoughtsLoader({ figure, phase, voiceName, slow, onPlay }: LoaderProps) {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + CARDS.length) % CARDS.length);
    setCycle((c) => c + 1);
  }, []);

  useEffect(() => {
    if (phase === "ready") return;
    const timer = window.setTimeout(() => go(1), CARD_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [cycle, phase, go]);

  if (phase === "ready") {
    return <StoryPanel><ReadyCta figure={figure} onPlay={onPlay} /></StoryPanel>;
  }

  const card = CARDS[index];

  return (
    <StoryPanel>
      <div className="ll-thoughts">
        <div className="ll-figure-row ll-figure-row--center">
          <FigureIcon figure={figure} size={36} />
          <span>{figure.name}</span>
        </div>
        <p className="ll-thoughts-intro">Während deine Power Story entsteht – ein paar Gedanken für dich.</p>

        <div className="ll-thoughts-stage">
          <button type="button" className="ll-icon-btn" onClick={() => go(-1)} aria-label="Vorheriger Gedanke">
            <ChevronLeft size={18} />
          </button>
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              className="ll-thought"
              data-kind={card.kind}
              initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              <span className="ll-thought-kind">{card.kind}</span>
              <blockquote>{card.text}</blockquote>
              {card.by && <figcaption>– {card.by}</figcaption>}
            </motion.figure>
          </AnimatePresence>
          <button type="button" className="ll-icon-btn" onClick={() => go(1)} aria-label="Nächster Gedanke">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="ll-thoughts-dots" role="tablist" aria-label="Gedanken">
          {CARDS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Gedanke ${i + 1}`}
              onClick={() => { setIndex(i); setCycle((c) => c + 1); }}
            >
              {i === index && <span key={cycle} className="ll-thoughts-timer" style={{ animationDuration: `${CARD_SECONDS}s` }} />}
            </button>
          ))}
        </div>

        <PhaseSteps phase={phase} voiceName={voiceName} compact />
        <SlowNote show={slow} />
      </div>
    </StoryPanel>
  );
}
