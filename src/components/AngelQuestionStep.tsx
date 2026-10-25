"use client";

/**
 * Eine Frage im Story-Flow – zuerst für die Engel-Erststory
 * (/create-story?first=true) gebaut, inzwischen für jede Figur.
 *
 * Aufbau: Frage + Fortschritt (links bzw. oben), Antworten (rechts bzw. unten)
 * und eine feste Leiste mit "Zurück" / "Weiter". Die Leiste liegt außerhalb des
 * scrollbaren Bereichs und ist immer sichtbar. Die Antwortzeilen passen sich der
 * Fensterhöhe an, sodass auf üblichen Bildschirmen nichts scrollt. Nur auf sehr
 * kleinen Bildschirmen scrollt der Antwortbereich (ohne Scrollbalken, mit
 * Verlauf am unteren Rand als Hinweis).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, Plus } from "lucide-react";
import FigureIcon from "./story-flow/FigureIcon";
import { ResourceFigure } from "@/lib/types/story";

interface AngelQuestionStepProps {
  figure: ResourceFigure;
  question: { id: number; question: string; blocks: string[] };
  index: number;
  total: number;
  selectedBlocks: string[];
  customBlocks: string[];
  maxSelections: number;
  canProceed: boolean;
  onToggle: (block: string) => void;
  /** Gibt true zurück, wenn das Eingabefeld geleert werden soll. */
  onAddCustom: (text: string) => boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** "Zurück" bei der ersten Frage (z. B. zur Figurenwahl). Ohne: unsichtbar. */
  onExit?: () => void;
}

export default function AngelQuestionStep({
  figure,
  question,
  index,
  total,
  selectedBlocks,
  customBlocks,
  maxSelections,
  canProceed,
  onToggle,
  onAddCustom,
  onPrevious,
  onNext,
  onExit,
}: AngelQuestionStepProps) {
  const selectedCount = selectedBlocks.length;
  const isLast = index === total - 1;
  const customLimitReached = customBlocks.length >= maxSelections;
  const options = [...question.blocks, ...customBlocks];
  // Orte haben bis zu 15 Antworten – auf breiten Bildschirmen dann zweispaltig.
  const dense = options.length > 8;

  const scrollRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDetailsElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [draft, setDraft] = useState("");

  // Neue Frage: leeres Feld. Der Bereich selbst wird pro Frage neu aufgebaut (key),
  // beginnt also immer oben.
  useEffect(() => setDraft(""), [question.id]);

  const updateMoreBelow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateMoreBelow();
    el.addEventListener("scroll", updateMoreBelow, { passive: true });
    const observer = new ResizeObserver(updateMoreBelow);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", updateMoreBelow);
      observer.disconnect();
    };
  }, [updateMoreBelow, question.id]);

  const showCustomField = () => {
    // Das Feld soll beim Öffnen und nach dem Hinzufügen sichtbar bleiben.
    requestAnimationFrame(() => customRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };

  const submitCustom = () => {
    if (onAddCustom(draft)) setDraft("");
    showCustomField();
  };

  return (
    <section className="story-first-stage" aria-label={`${figure.name} – Frage ${index + 1} von ${total}`}>
      <div className="story-first-intro">
        <div className="story-first-character">
          <span className="story-first-avatar" aria-hidden="true">
            <FigureIcon figure={figure} size={52} className="story-first-avatar-image" />
          </span>
          <span>{figure.name}</span>
        </div>

        <div className="story-first-progress">
          <p className="story-first-step-count">Frage {index + 1} von {total}</p>
          <ol className="story-first-segments" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <li key={i} data-state={i < index ? "done" : i === index ? "current" : "todo"} />
            ))}
          </ol>
        </div>

        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <h1>{question.question}</h1>
          <p className="story-first-guidance">Wähle, was sich für dich stimmig anfühlt.</p>
        </motion.div>
      </div>

      <div className="story-first-response">
        <div className="story-first-response-heading">
          <span>Wähle 1 bis {maxSelections} Antworten</span>
          <span aria-live="polite">{selectedCount} / {maxSelections}</span>
        </div>

        <motion.div
          key={question.id}
          ref={scrollRef}
          className="story-first-scroll"
          data-more-below={moreBelow || undefined}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="story-first-options" data-dense={dense || undefined} role="group" aria-label="Antwortmöglichkeiten">
            {options.map((block, i) => {
              const selected = selectedBlocks.includes(block);
              return (
                <button
                  key={`${block}-${i}`}
                  type="button"
                  className="story-first-option"
                  aria-pressed={selected}
                  disabled={selectedCount >= maxSelections && !selected}
                  onClick={() => onToggle(block)}
                >
                  <span className="story-first-option-mark" aria-hidden="true">{selected && <Check size={15} strokeWidth={2.5} />}</span>
                  <span>{block}</span>
                </button>
              );
            })}

            <details ref={customRef} className="story-first-custom" onToggle={showCustomField}>
              <summary>
                <span className="story-first-option-mark" aria-hidden="true"><Plus size={14} strokeWidth={2.5} /></span>
                <span>Eigene Worte hinzufügen</span>
              </summary>
              <div className="story-first-custom-fields">
                <input
                  type="text"
                  aria-label="Eigene Worte"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitCustom();
                    }
                  }}
                  disabled={customLimitReached}
                  placeholder="Deine Formulierung"
                  maxLength={120}
                />
                <button type="button" onClick={submitCustom} disabled={customLimitReached || !draft.trim()}>
                  Hinzufügen
                </button>
              </div>
            </details>
          </div>
        </motion.div>

        <div className="story-first-actions">
          <button type="button" className="story-first-previous" onClick={index === 0 ? onExit : onPrevious} disabled={index === 0 && !onExit}>
            <ChevronLeft size={17} aria-hidden="true" /> <span>Zurück</span>
          </button>
          <button type="button" className="story-first-next" onClick={onNext} disabled={!canProceed}>
            <span>{isLast ? "Abschließen" : "Weiter"}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
