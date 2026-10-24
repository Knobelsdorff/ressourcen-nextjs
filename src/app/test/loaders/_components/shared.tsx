"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Play } from "lucide-react";
import IdealFamilyIconFinal from "@/components/IdealFamilyIconFinal";
import JesusIconFinal from "@/components/JesusIconFinal";
import ArchangelMichaelIconFinal from "@/components/ArchangelMichaelIconFinal";
import AngelIconFinal from "@/components/AngelIconFinal";
import SuperheroIconFinal from "@/components/SuperheroIconFinal";
import { getQuestionsWithPronouns } from "@/data/questions";
import { ResourceFigure } from "@/lib/types/story";

/**
 * Phasen, die der echte Flow bereits kennt:
 *  text  – /api/generate-story läuft      (AudioPlayback: isGeneratingStory)
 *  audio – Edge Function generate-audio  (AudioPlayback: isGenerating)
 *  ready – audioState.audioUrl vorhanden
 */
export type Phase = "text" | "audio" | "ready";

export interface AnswerTheme {
  id: number;
  title: string;
  chosen: string[];
}

export interface LoaderProps {
  figure: ResourceFigure;
  themes: AnswerTheme[];
  storySentences: string[];
  voiceName: string;
  phase: Phase;
  /** Sekunden seit Beginn des Wartens */
  elapsed: number;
  /** Sekunden seit Beginn der aktuellen Phase */
  phaseElapsed: number;
  /** Geschätzter Fortschritt 0–1, asymptotisch – bleibt nie stehen, springt nie zurück */
  estimate: number;
  /** Dauert länger als üblich */
  slow: boolean;
  onPlay?: () => void;
}

export function FigureIcon({ figure, size = 48, className = "" }: { figure: ResourceFigure; size?: number; className?: string }) {
  const style = { width: size, height: size };
  switch (figure.id) {
    case "ideal-family": return <IdealFamilyIconFinal size={size} className={className} />;
    case "jesus": return <JesusIconFinal size={size} className={className} />;
    case "archangel-michael": return <ArchangelMichaelIconFinal size={size} className={className} />;
    case "angel": return <AngelIconFinal size={size} className={className} />;
    case "superhero": return <SuperheroIconFinal size={size} className={className} />;
    default:
      return (
        <span className={`inline-flex items-center justify-center ${className}`} style={{ ...style, fontSize: size * 0.72, lineHeight: 1 }} aria-hidden="true">
          {figure.emoji}
        </span>
      );
  }
}

/* ---------- Mock-Daten aus den echten Fragen ---------- */

export function buildThemes(figure: ResourceFigure): AnswerTheme[] {
  return getQuestionsWithPronouns(figure).map((q: { id: number; title: string; blocks: string[] }) => ({
    id: q.id,
    title: q.title,
    chosen: [q.blocks[0], q.blocks[2]].filter(Boolean),
  }));
}

const toSecondPerson = (text: string) =>
  text
    .replace(/\bmich\b/g, "dich")
    .replace(/\bmir\b/g, "dir")
    .replace(/\bmeinem\b/g, "deinem")
    .replace(/\bmeinen\b/g, "deinen")
    .replace(/\bmeiner\b/g, "deiner")
    .replace(/\bmeine\b/g, "deine")
    .replace(/\bmein\b/g, "dein");

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const stripDot = (text: string) => text.replace(/[.!]+$/, "");

/** Eine plausible erste Passage, gebaut aus den gewählten Antworten (nur Mock). */
export function buildStorySentences(figure: ResourceFigure, themes: AnswerTheme[]): string[] {
  const isHe = figure.pronouns.startsWith("er");
  const pron = isHe ? "Er" : "Sie";
  const possAcc = isHe ? "seine" : "ihre";
  const possDat = isHe ? "seiner" : "ihrer";
  const [t1, t2, t3, , , t6] = themes;
  return [
    "Du darfst jetzt ankommen. Dein Atem wird ruhiger, ganz von selbst.",
    `Und dann spürst du ${possAcc} Nähe – ${figure.name}, ganz für dich da.`,
    t1 ? `${stripDot(t1.chosen[0])}.` : "",
    t2 ? `In ${possDat} Nähe fühlst du dich ${lowerFirst(stripDot(t2.chosen[0]))}.` : "",
    t3 ? `Und wenn es schwer wird? ${pron} ${lowerFirst(toSecondPerson(stripDot(t3.chosen[0])))}.` : "",
    t6 ? `${pron} sagt leise: „${stripDot(t6.chosen[0])}.“` : "",
  ].filter(Boolean);
}

/* ---------- Ehrliche Phasen-Anzeige (für alle Varianten) ---------- */

export function phaseHeadline(phase: Phase, voiceName: string) {
  if (phase === "text") return "Deine Geschichte wird geschrieben";
  if (phase === "audio") return `${voiceName} spricht deine Geschichte ein`;
  return "Deine Power Story ist bereit";
}

export function PhaseSteps({ phase, voiceName, compact = false }: { phase: Phase; voiceName: string; compact?: boolean }) {
  const steps = [
    { key: "answers", label: "Antworten" },
    { key: "text", label: "Geschichte" },
    { key: "audio", label: `Stimme` },
  ];
  const activeIndex = phase === "text" ? 1 : phase === "audio" ? 2 : 3;
  return (
    <div className={`ll-steps ${compact ? "ll-steps--compact" : ""}`}>
      <ol aria-label="Fortschritt deiner Power Story">
        {steps.map((step, index) => {
          const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "todo";
          return (
            <li key={step.key} data-state={state} aria-current={state === "active" ? "step" : undefined}>
              <span className="ll-steps-dot" aria-hidden="true">
                {state === "done" ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          role="status"
          className="ll-steps-status"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.5 }}
        >
          {phaseHeadline(phase, voiceName)}
          {phase !== "ready" && <span className="ll-ellipsis" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function SlowNote({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.p
          className="ll-slow-note"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.6 }}
        >
          Heute dauert es etwas länger als sonst. Deine Antworten sind sicher – du kannst ganz in Ruhe hierbleiben.
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** Übergang in den Player – im echten Flow ersetzt AudioPlayback diesen Zustand. */
export function ReadyCta({ figure, onPlay, title = "Deine Power Story ist bereit", sub }: { figure: ResourceFigure; onPlay?: () => void; title?: string; sub?: string }) {
  return (
    <motion.div
      className="ll-ready"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2 className="ll-ready-title">{title}</h2>
      <p className="ll-ready-sub">{sub ?? `Du musst nichts tun. ${figure.name} ist jetzt bei dir.`}</p>
      <button type="button" className="ll-ready-play" onClick={onPlay} aria-label="Power Story anhören">
        <span className="ll-ready-play-halo" aria-hidden="true" />
        <Play size={30} fill="currentColor" aria-hidden="true" />
      </button>
      <p className="ll-ready-hint">Am schönsten mit Kopfhörern</p>
    </motion.div>
  );
}

/** Der weiße Panel-Rahmen aus AudioPlayback (story-step-panel). */
export function StoryPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="story-audio-step min-h-screen p-4 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`story-step-panel bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-orange-100 mb-6 ${className}`}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
