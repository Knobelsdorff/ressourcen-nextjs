"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FigureIcon, LoaderProps, PhaseSteps, ReadyCta, SlowNote, StoryPanel } from "./shared";

// Deterministische "Lichtpunkte", damit Server- und Client-Render übereinstimmen.
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 53) % 100,
  size: 3 + ((i * 7) % 5),
  delay: (i * 0.9) % 9,
  duration: 9 + ((i * 5) % 7),
}));

type Ripple = { id: number; x: number; y: number };

/**
 * Variante 6 – Lichtmoment: Fortschritt als Metapher statt als Zahl –
 * das Licht geht langsam auf. Antippen erzeugt eine sanfte Lichtwelle.
 */
export default function DawnLoader({ figure, phase, estimate, voiceName, slow, onPlay }: LoaderProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);
  const progress = phase === "ready" ? 1 : estimate;
  // Szene ist unten verankert (xMidYMax) – auf breiten Screens wird oben beschnitten.
  const sunY = 250 - progress * 115;

  const addRipple = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    setRipples((r) => [...r.slice(-5), { id, x: event.clientX - rect.left, y: event.clientY - rect.top }]);
    window.setTimeout(() => setRipples((r) => r.filter((ripple) => ripple.id !== id)), 1800);
  }, []);

  return (
    <StoryPanel className="ll-dawn-panel">
      <div className="ll-dawn">
        <div className="ll-dawn-scene" onPointerDown={addRipple} aria-hidden="true">
          <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice">
            <defs>
              <linearGradient id="ll-sky-night" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#d9cdef" />
                <stop offset="1" stopColor="#f3ece4" />
              </linearGradient>
              <linearGradient id="ll-sky-day" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fbe3c4" />
                <stop offset="0.6" stopColor="#fdf0dc" />
                <stop offset="1" stopColor="#fff8ee" />
              </linearGradient>
              <radialGradient id="ll-sun">
                <stop offset="0" stopColor="#fff6d8" />
                <stop offset="0.35" stopColor="#ffd88a" stopOpacity="0.95" />
                <stop offset="1" stopColor="#ffb85c" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="400" height="240" fill="url(#ll-sky-night)" />
            <motion.rect width="400" height="240" fill="url(#ll-sky-day)" animate={{ opacity: progress }} transition={{ duration: 1.5 }} />
            <motion.circle cx="200" r="90" fill="url(#ll-sun)" animate={{ cy: sunY }} transition={{ duration: 1.5, ease: "easeOut" }} />
            <motion.circle cx="200" r="22" fill="#fff4cf" animate={{ cy: sunY, opacity: 0.5 + progress * 0.5 }} transition={{ duration: 1.5, ease: "easeOut" }} />
            <path d="M0 190 C 70 160, 130 175, 200 182 S 330 160, 400 176 L400 240 L0 240 Z" fill="#c9d6a8" />
            <path d="M0 212 C 90 192, 160 206, 240 204 S 350 196, 400 206 L400 240 L0 240 Z" fill="#9db36a" />
            <path d="M0 228 C 120 216, 260 230, 400 222 L400 240 L0 240 Z" fill="#81954f" />
          </svg>

          <div className="ll-dawn-motes">
            {MOTES.map((m, i) => (
              <span
                key={i}
                style={{ left: `${m.left}%`, width: m.size, height: m.size, animationDelay: `${m.delay}s`, animationDuration: `${m.duration}s`, opacity: 0.35 + progress * 0.5 }}
              />
            ))}
          </div>

          <div className="ll-dawn-figure">
            <span className="ll-dawn-halo" />
            <FigureIcon figure={figure} size={52} />
          </div>

          {ripples.map((r) => (
            <span key={r.id} className="ll-dawn-ripple" style={{ left: r.x, top: r.y }} />
          ))}
          {phase !== "ready" && <span className="ll-dawn-hint">Tippe ins Licht</span>}
        </div>

        <AnimatePresence mode="wait">
          {phase === "ready" ? (
            <ReadyCta key="ready" figure={figure} onPlay={onPlay} title="Es ist hell geworden" sub="Deine Power Story ist da. Du musst nichts tun – nur zuhören." />
          ) : (
            <motion.div key="wait" exit={{ opacity: 0 }}>
              <h2 className="ll-dawn-title">Deine Power Story nimmt Gestalt an</h2>
              <p className="ll-dawn-sub">Es ist alles gut – mit jedem Moment wird es ein wenig heller.</p>
              <PhaseSteps phase={phase} voiceName={voiceName} compact />
              <SlowNote show={slow} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StoryPanel>
  );
}
