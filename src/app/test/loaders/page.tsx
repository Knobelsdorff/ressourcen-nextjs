"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Info, Pause, Play, RotateCcw, X } from "lucide-react";
import StoryFlowProgress from "@/components/StoryFlowProgress";
import { fictionalFigures, realFigures } from "@/data/figures";
import { LoaderProps, Phase, buildStorySentences, buildThemes } from "./_components/shared";
import CurrentLoader from "./_components/CurrentLoader";
import BreathLoader from "./_components/BreathLoader";
import WordsLoader from "./_components/WordsLoader";
import FirstLinesLoader from "./_components/FirstLinesLoader";
import ThoughtsLoader from "./_components/ThoughtsLoader";
import ArriveLoader from "./_components/ArriveLoader";
import DawnLoader from "./_components/DawnLoader";
import SmallLoaders from "./_components/SmallLoaders";

/* ---------- Varianten + Notizen ---------- */

type VariantId = "current" | "breath" | "words" | "lines" | "thoughts" | "arrive" | "dawn" | "small";

interface Variant {
  id: VariantId;
  tab: string;
  name: string;
  Component?: React.ComponentType<LoaderProps>;
  idea: string;
  why: string;
  implement: string;
}

const VARIANTS: Variant[] = [
  {
    id: "current",
    tab: "0 · Current",
    name: "Today's loader (baseline)",
    Component: CurrentLoader,
    idea: "Exact copy of the unified loader in AudioPlayback.tsx (showUnifiedLoader): figure name, icon, breathing circle, two static lines.",
    why: "It stays exactly the same for the whole wait: about 10–20 s for the GPT-4o text plus 30–120 s for the ElevenLabs audio. Nothing says what's happening, nothing changes if it takes longer, and nothing reacts to the user. AudioPlayback already tracks generationStatus / generationProgress, but the unified loader never shows them.",
    implement: "Baseline for comparison only.",
  },
  {
    id: "breath",
    tab: "1 · Atemraum",
    name: "Guided breath",
    Component: BreathLoader,
    idea: "The existing circle becomes a real guided breathing exercise: 4 s in, 6 s out (6 breaths/min with a longer exhale). A ring arc follows each breath and dots count the breaths.",
    why: "The product promises calm, so the wait becomes the first calming moment instead of dead time. Breathwork and meditation apps (Open, Mindllama) use the same 'breathe and prepare' screen. It's also the closest to today's look, so it's the lowest-risk change.",
    implement: "Drop-in replacement for the unified loader. It only needs the phase (isGeneratingStory → 'text', isGenerating → 'audio'). Uses a rAF clock; with reduced motion it shows a static circle and the text 'Atme in deinem Rhythmus'.",
  },
  {
    id: "words",
    tab: "2 · Deine Worte",
    name: "Your words become the story",
    Component: WordsLoader,
    idea: "Shows the six answer themes with the user's own phrases. A thread links them as each one is 'woven in', then a soft waveform appears for the voice.",
    why: "Labor illusion (Buell & Norton, HBS 2011): people tolerate and value a wait more when they can see the work being done for them. Seeing their own words also says 'this is made for you', the way the Balance app frames its loading screen.",
    implement: "Needs questionAnswers (already passed to AudioPlayback) and the question titles from data/questions. Row timing is decorative (2.4 s per row), and the last row waits for the real text to finish.",
  },
  {
    id: "lines",
    tab: "3 · Erste Zeilen",
    name: "First lines preview",
    Component: FirstLinesLoader,
    idea: "While the text is written: a short sample opening. While the voice records: the first two sentences of the user's own story appear word by word, and the rest stays veiled.",
    why: "In the real flow, generatedStory exists after about 10–20 s, while the audio takes another 30–120 s. That's the longest part of the wait, and today it shows nothing of the result. A teaser builds anticipation. Trade-off: Andreas may want the story experienced by ear first, which is why only two sentences show.",
    implement: "generatedStory is already a prop of AudioPlayback; split it into sentences. Use the sample lines only while isGeneratingStory is true.",
  },
  {
    id: "thoughts",
    tab: "4 · Gedanken",
    name: "Thoughts for the moment",
    Component: ThoughtsLoader,
    idea: "Calm rotating cards: thoughts, listening tips, one 'did you know' about inner helper figures, and the landing-page testimonial. 9 s per card, with arrows and dots to browse.",
    why: "Occupied time feels shorter than unoccupied time (Maister, 'The Psychology of Waiting Lines'). The tips also prepare the listening (headphones, evening routine).",
    implement: "Pure UI, no data needed. The copy is original text in the landing-page voice, plus a public-domain Rilke line and a proverb. Andreas should review the wording, especially the 'Wusstest du?' card.",
  },
  {
    id: "arrive",
    tab: "5 · Ankommen",
    name: "Arrive & prepare (interactive)",
    Component: ArriveLoader,
    idea: "An interactive checklist (headphones, get comfortable, notifications off, three guided breaths) plus an honest two-segment progress bar that says 'usually 1–2 minutes'.",
    why: "It gives the user agency and something meaningful to do, and it sets up the conditions for the story to work. Nielsen's guidance: waits over 10 s need a progress indicator and a time estimate. The bar is asymptotic, so it never stalls, never goes backwards and never claims 100% too early.",
    implement: "Progress comes only from elapsed time; see estimate() in this page. The checklist state is local UI and isn't saved.",
  },
  {
    id: "dawn",
    tab: "6 · Lichtmoment",
    name: "Dawn scene",
    Component: DawnLoader,
    idea: "An ambient dawn: the sun rises with the progress, light motes drift upwards, and tapping makes a soft light ripple. It ends with 'Es ist hell geworden'.",
    why: "It shows progress as a metaphor instead of a number (no % pressure), gives restless users a small interaction, and ends on the strongest emotional note of all the variants.",
    implement: "Pure SVG + CSS, no assets. It's the most visual variant, so check it on a low-end phone. The figure icon sits in the halo, so it works for every figure.",
  },
  {
    id: "small",
    tab: "Small loaders",
    name: "Short loaders in the flow",
    idea: "The short waits in the flow: page boot, loading the voice list, audio buffering in the player, and the 'Weiter' click after picking a figure.",
    why: "Consistency: one breathing motion, one palette (the boot loader is still amber), and skeletons shaped like the content they replace.",
    implement: "Each one is a small local change in the file named on its card.",
  },
];

const SPEEDS = [
  { id: "fast", label: "20 s", total: 20 },
  { id: "typical", label: "75 s", total: 75 },
  { id: "slow", label: "150 s", total: 150 },
] as const;

const PHASE_MODES: { id: "auto" | Phase; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "text", label: "Text" },
  { id: "audio", label: "Voice" },
  { id: "ready", label: "Ready" },
];

const TEXT_SHARE = 0.2;
const SLOW_AFTER = 100;
const FIGURE_IDS = ["angel", "archangel-michael", "superhero", "grandma", "pet-dog", "fairy"];
const VOICE_NAME = "Kerstin";

/** Asymptotische Schätzung – bleibt nie stehen, springt nie zurück. Auch so im echten Flow nutzbar. */
function estimate(phase: Phase, phaseElapsed: number) {
  if (phase === "ready") return 1;
  if (phase === "text") return 0.25 * (1 - Math.exp(-phaseElapsed / 5));
  return 0.25 + 0.7 * (1 - Math.exp(-phaseElapsed / 25));
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function LoaderLabPage() {
  const [variantId, setVariantId] = useState<VariantId>("breath");
  const [speedId, setSpeedId] = useState<(typeof SPEEDS)[number]["id"]>("typical");
  const [phaseMode, setPhaseMode] = useState<"auto" | Phase>("auto");
  const [figureId, setFigureId] = useState("angel");
  const [paused, setPaused] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [toast, setToast] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const [forcedAt, setForcedAt] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (paused) return;
    const start = performance.now() - elapsedRef.current * 1000;
    const id = window.setInterval(() => {
      elapsedRef.current = (performance.now() - start) / 1000;
      setElapsed(elapsedRef.current);
    }, 200);
    return () => window.clearInterval(id);
  }, [paused, runKey]);

  const restart = useCallback(() => {
    elapsedRef.current = 0;
    setElapsed(0);
    setForcedAt(0);
    setPaused(false);
    setRunKey((k) => k + 1);
  }, []);

  const total = SPEEDS.find((s) => s.id === speedId)!.total;
  const textEnd = total * TEXT_SHARE;

  let phase: Phase;
  let phaseElapsed: number;
  if (phaseMode === "auto") {
    phase = elapsed < textEnd ? "text" : elapsed < total ? "audio" : "ready";
    phaseElapsed = phase === "text" ? elapsed : phase === "audio" ? elapsed - textEnd : elapsed - total;
  } else {
    phase = phaseMode;
    phaseElapsed = Math.max(0, elapsed - forcedAt);
  }

  const figure = useMemo(() => [...fictionalFigures, ...realFigures].find((f) => f.id === figureId) ?? fictionalFigures[0], [figureId]);
  const themes = useMemo(() => buildThemes(figure), [figure]);
  const storySentences = useMemo(() => buildStorySentences(figure, themes), [figure, themes]);
  const figureOptions = useMemo(
    () => FIGURE_IDS.map((id) => [...fictionalFigures, ...realFigures].find((f) => f.id === id)).filter(Boolean),
    []
  );

  const variant = VARIANTS.find((v) => v.id === variantId)!;
  const Component = variant.Component;

  const onPlay = useCallback(() => {
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  }, []);

  const loaderProps: LoaderProps = {
    figure,
    themes,
    storySentences,
    voiceName: VOICE_NAME,
    phase,
    elapsed,
    phaseElapsed,
    estimate: estimate(phase, phaseElapsed),
    slow: phase !== "ready" && elapsed > SLOW_AFTER,
    onPlay,
  };

  return (
    <div className="ll-page">
      <p className="ll-banner">
        <strong>Loader Lab</strong> · design test for the create-story wait · mock data, no API calls, no app logic
      </p>

      {Component ? (
        <>
          <StoryFlowProgress currentStep={5} showNameStep />
          <AnimatePresence mode="wait">
            <motion.div key={`${variantId}-${runKey}-${figureId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Component {...loaderProps} />
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <SmallLoaders />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div className="ll-toast" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            In the real flow, the AudioPlayback player takes over here.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Steuer-Dock ---------- */}
      <div className="ll-dock-wrap">
        <AnimatePresence>
          {infoOpen && dockOpen && (
            <motion.aside
              className="ll-info"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              aria-label="Notes for this variant"
            >
              <header>
                <div>
                  <p className="ll-info-kicker">{variant.tab}</p>
                  <h3>{variant.name}</h3>
                </div>
                <button type="button" className="ll-icon-btn" onClick={() => setInfoOpen(false)} aria-label="Close notes"><X size={16} /></button>
              </header>
              <dl>
                <dt>Idea</dt><dd>{variant.idea}</dd>
                <dt>Why</dt><dd>{variant.why}</dd>
                <dt>Implementing</dt><dd>{variant.implement}</dd>
              </dl>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="ll-dock" data-open={dockOpen}>
          <div className="ll-dock-top">
            <div className="ll-tabs" role="tablist" aria-label="Loader variants">
              {VARIANTS.map((v) => (
                <button key={v.id} type="button" role="tab" aria-selected={v.id === variantId} onClick={() => setVariantId(v.id)}>
                  {v.tab}
                </button>
              ))}
            </div>
            <button type="button" className="ll-icon-btn" data-active={infoOpen} onClick={() => { setInfoOpen((o) => !o); setDockOpen(true); }} aria-label="Notes" aria-pressed={infoOpen}>
              <Info size={16} />
            </button>
            <button type="button" className="ll-icon-btn" onClick={() => setDockOpen((o) => !o)} aria-label={dockOpen ? "Collapse controls" : "Expand controls"} aria-expanded={dockOpen}>
              {dockOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {dockOpen && variantId !== "small" && (
            <div className="ll-dock-controls">
              <div className="ll-seg" role="group" aria-label="Phase">
                <span className="ll-seg-label">Phase</span>
                {PHASE_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={phaseMode === m.id}
                    onClick={() => { setPhaseMode(m.id); setForcedAt(elapsedRef.current); }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="ll-seg" role="group" aria-label="Simulated duration">
                <span className="ll-seg-label">Wait</span>
                {SPEEDS.map((s) => (
                  <button key={s.id} type="button" aria-pressed={speedId === s.id} onClick={() => { setSpeedId(s.id); restart(); }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <label className="ll-select">
                <span className="ll-seg-label">Figure</span>
                <select value={figureId} onChange={(e) => setFigureId(e.target.value)}>
                  {figureOptions.map((f) => f && <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>
              <div className="ll-dock-actions">
                <span className="ll-clock" aria-live="off">{formatTime(elapsed)} · {phase}</span>
                <button type="button" className="ll-icon-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Resume" : "Pause"}>
                  {paused ? <Play size={16} /> : <Pause size={16} />}
                </button>
                <button type="button" className="ll-icon-btn" onClick={restart} aria-label="Restart"><RotateCcw size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
