"use client";

/**
 * Eine Frage im Story-Flow – zuerst für die Engel-Erststory
 * (/create-story?first=true) gebaut, inzwischen für jede Figur.
 *
 * Aufbau: Figur ("Dein Engel") + Frage (links bzw. oben), Antworten mit dem
 * Fortschritt darunter (rechts bzw. unten) und eine feste Leiste mit
 * "Zurück" / "Weiter". Die Leiste liegt außerhalb des
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
import { T, useTextFn } from "@/components/site-text/T";
import { createStory } from "@/content/texts/createStory";

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
  const tx = useTextFn();
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
  // beginnt also immer oben. Er blendet von 0.35 statt von 0 ein – sonst ist die
  // Seite beim Weiterklicken einen Moment leer und wirkt, als flackere sie.
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

  // "Dein Engel" wie im Entwurf. Für andere Figuren nur der Name – ein
  // allgemeines "Dein/Deine" passt nicht zu jedem Namen (z.B. "Bester Freund / Beste Freundin").
  const characterTitle = figure.id === "angel" ? tx(createStory["question.angelTitle"]) : figure.name;

  return (
    <section className="story-first-stage story-question" aria-label={tx(createStory["question.aria"], { figure: figure.name, current: index + 1, total })}>
      <div className="story-first-intro">
        <div className="story-first-character">
          <span className="story-first-avatar" aria-hidden="true">
            <FigureIcon figure={figure} size={52} className="story-first-avatar-image" />
          </span>
          <span className="story-first-character-name">{characterTitle}</span>
        </div>

        <motion.div
          key={question.id}
          initial={{ opacity: 0.35, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <h1>{question.question}</h1>
          <p className="story-first-guidance"><T t={createStory["question.guidance"]} /></p>
        </motion.div>
      </div>

      <div className="story-first-response">
        {/* Antworten + Zähler: Der Zähler klebt direkt unter den Antworten und
            bleibt sichtbar – scrollen muss nur die Liste darüber. */}
        <div className="story-first-answers">
          <motion.div
            key={question.id}
            ref={scrollRef}
            className="story-first-scroll"
            data-more-below={moreBelow || undefined}
            initial={{ opacity: 0.35, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="story-first-options" data-dense={dense || undefined} role="group" aria-label={tx(createStory["question.optionsAria"])}>
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
                  <span><T t={createStory["question.customAdd"]} /></span>
                </summary>
                <div className="story-first-custom-fields">
                  <input
                    type="text"
                    aria-label={tx(createStory["question.customAria"])}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitCustom();
                      }
                    }}
                    disabled={customLimitReached}
                    placeholder={tx(createStory["question.customPlaceholder"])}
                    maxLength={120}
                  />
                  <button type="button" onClick={submitCustom} disabled={customLimitReached || !draft.trim()}>
                    <T t={createStory["question.customSubmit"]} />
                  </button>
                </div>
              </details>
            </div>
          </motion.div>
  
          {/* Usability-Test: Mehrfachauswahl wurde nicht erkannt. */}
          {maxSelections > 1 && (
            <p
              className="story-first-selection-count"
              data-full={selectedCount >= maxSelections || undefined}
              aria-live="polite"
            >
              {selectedCount === 0
                ? <T t={createStory["question.maxHint"]} vars={{ max: maxSelections }} />
                : <><T t={createStory["question.count"]} vars={{ selected: selectedCount, max: maxSelections }} /><span className="sr-only"> <T t={createStory["question.countSr"]} /></span></>}
            </p>
          )}
        </div>

        <div className="story-first-progress">
          <p className="story-first-step-count"><T t={createStory["question.step"]} vars={{ current: index + 1, total }} /></p>
          <ol className="story-first-segments" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <li key={i} data-state={i < index ? "done" : i === index ? "current" : "todo"} />
            ))}
          </ol>
        </div>

        <div className="story-first-actions">
          <button type="button" className="story-first-previous" onClick={index === 0 ? onExit : onPrevious} disabled={index === 0 && !onExit}>
            <ChevronLeft size={17} aria-hidden="true" /> <span><T t={createStory["question.back"]} /></span>
          </button>
          <button type="button" className="story-first-next" onClick={onNext} disabled={!canProceed}>
            <span><T t={isLast ? createStory["question.finish"] : createStory["question.next"]} /></span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
