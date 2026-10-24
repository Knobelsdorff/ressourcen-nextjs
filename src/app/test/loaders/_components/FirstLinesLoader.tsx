"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FigureIcon, LoaderProps, PhaseSteps, ReadyCta, SlowNote, StoryPanel } from "./shared";

const SAMPLE_LINES = [
  "Stell dir einen Ort vor, an dem nichts von dir verlangt wird.",
  "Die Luft ist warm. Das Licht ist weich.",
  "Du musst nichts tun. Nur da sein.",
  "Und neben dir ist jemand, der genau weiß, was du gerade brauchst.",
];
const LINE_SECONDS = 3.2;
const WORD_SECONDS = 0.32;
const PREVIEW_SENTENCES = 2;

/**
 * Variante 3 – Erste Zeilen: Während der Text entsteht, ein ruhiger Beispiel-Anfang.
 * Sobald der Text fertig ist (im echten Flow liegt generatedStory dann schon vor,
 * während noch das Audio erzeugt wird), erscheinen Wort für Wort die ersten Sätze
 * der *eigenen* Geschichte – der Rest bleibt fürs Hören.
 */
export default function FirstLinesLoader({ figure, storySentences, phase, phaseElapsed, voiceName, slow, onPlay }: LoaderProps) {
  if (phase === "ready") {
    return (
      <StoryPanel>
        <ReadyCta figure={figure} onPlay={onPlay} sub={`Den Anfang kennst du schon. Jetzt erzählt ${voiceName} dir den Rest.`} />
      </StoryPanel>
    );
  }

  const visibleLines = Math.min(SAMPLE_LINES.length, Math.floor(phaseElapsed / LINE_SECONDS) + 1);
  const previewWords = storySentences.slice(0, PREVIEW_SENTENCES).join(" ").split(" ");
  const visibleWords = Math.min(previewWords.length, Math.floor(phaseElapsed / WORD_SECONDS) + 1);

  return (
    <StoryPanel>
      <div className="ll-lines">
        <div className="ll-figure-row ll-figure-row--center">
          <FigureIcon figure={figure} size={36} />
          <span>{figure.name}</span>
        </div>

        <AnimatePresence mode="wait">
          {phase === "text" ? (
            <motion.div key="sample" className="ll-paper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <p className="ll-kicker">So beginnt eine Power Story</p>
              <div className="ll-paper-text" aria-live="off">
                {SAMPLE_LINES.slice(0, visibleLines).map((line, i) => (
                  <motion.p
                    key={line}
                    initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                    animate={{ opacity: i === visibleLines - 1 ? 1 : 0.55, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
              <p className="ll-paper-foot">Deine eigene Geschichte wird gerade aus deinen Antworten geschrieben.</p>
            </motion.div>
          ) : (
            <motion.div key="own" className="ll-paper ll-paper--own" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <p className="ll-kicker">Deine Geschichte ist geschrieben</p>
              <p className="ll-paper-text ll-paper-reveal">
                {previewWords.map((word, i) => (
                  <span key={i} className={i < visibleWords ? "is-on" : ""}>{word} </span>
                ))}
              </p>
              <div className="ll-paper-veil" aria-hidden="true">
                <span /><span /><span />
              </div>
              <p className="ll-paper-foot">Den Rest hörst du gleich – gesprochen von {voiceName}.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <PhaseSteps phase={phase} voiceName={voiceName} compact />
        <SlowNote show={slow} />
      </div>
    </StoryPanel>
  );
}
