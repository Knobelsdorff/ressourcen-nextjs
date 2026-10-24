"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";

function Pair({ title, where, current, proposed, note }: { title: string; where: string; current: React.ReactNode; proposed: React.ReactNode; note: string }) {
  return (
    <section className="ll-pair">
      <header>
        <h3>{title}</h3>
        <code>{where}</code>
      </header>
      <div className="ll-pair-grid">
        <div className="ll-pair-cell">
          <span className="ll-pair-tag">Heute</span>
          <div className="ll-pair-stage">{current}</div>
        </div>
        <div className="ll-pair-cell is-proposed">
          <span className="ll-pair-tag">Vorschlag</span>
          <div className="ll-pair-stage">{proposed}</div>
        </div>
      </div>
      <p className="ll-pair-note">{note}</p>
    </section>
  );
}

function OldBreathCircle({ amber = false }: { amber?: boolean }) {
  return (
    <motion.div
      className={`w-20 h-20 rounded-full border-2 relative mx-auto mb-6 ${amber ? "border-amber-400" : "border-primary-400"}`}
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className={`absolute inset-0 rounded-full ${amber ? "bg-amber-400" : "bg-primary-400"}`} style={{ opacity: 0.08 }} />
    </motion.div>
  );
}

function SoftOrb() {
  return (
    <span className="ll-soft-orb" aria-hidden="true">
      <span />
    </span>
  );
}

function Wave({ bars = 5 }: { bars?: number }) {
  return (
    <span className="ll-wave ll-wave--mini" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 120}ms` }} />)}
    </span>
  );
}

export default function SmallLoaders() {
  const [checking, setChecking] = useState(false);
  const [checkingOld, setCheckingOld] = useState(false);
  const fakeCheck = (set: (v: boolean) => void) => {
    set(true);
    window.setTimeout(() => set(false), 2200);
  };

  return (
    <div className="ll-small">
      <div className="ll-small-intro">
        <p className="ll-kicker">Kleine Ladezustände im Flow</p>
        <h2>Kurze Wartemomente – einheitlich und ruhig</h2>
        <p>Diese Loader dauern nur Sekunden. Hier zählt Konsistenz: dieselbe Atem-Bewegung, dieselben Farben (Salbei statt Amber), und Platzhalter in der Form des Inhalts, damit nichts springt.</p>
      </div>

      <Pair
        title="Seite wird geladen"
        where="create-story/page.tsx – Auth/Mount"
        current={<div className="text-center"><OldBreathCircle amber /><p className="text-amber-600">Lade...</p></div>}
        proposed={<div className="ll-boot"><SoftOrb /><p>Einen Moment …</p></div>}
        note="Heute als einziger Loader noch in Amber (#f59e0b) – passt nicht mehr zur Salbei/Braun-Palette. „Lade...“ wirkt technisch; „Einen Moment …“ ist der Ton der App."
      />

      <Pair
        title="Stimmen werden geladen"
        where="VoiceSelection.tsx – loading"
        current={<div className="text-center"><OldBreathCircle /><p className="text-primary-700 text-sm">Stimmen werden geladen...</p></div>}
        proposed={
          <div className="ll-skel-voices" aria-label="Stimmen werden geladen" role="status">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ll-skel-voice">
                <span className="ll-skel ll-skel--circle" />
                <span className="ll-skel ll-skel--line" style={{ width: "60%" }} />
                <span className="ll-skel ll-skel--line" style={{ width: "85%" }} />
                <span className="ll-skel ll-skel--pill" />
              </div>
            ))}
          </div>
        }
        note="Skeleton in der Form der Stimmenkarten (lila Oberkante wie .story-voice-card). Die Seite baut sich dann ohne Sprung auf; das wirkt schneller als ein zentrierter Kreis."
      />

      <Pair
        title="Audio puffert im Player"
        where="AudioPlayback.tsx – isLoading / „Lädt...“"
        current={<div className="flex items-center gap-2 text-sm text-primary-600"><Loader2 className="w-3 h-3 animate-spin" /><span className="text-xs">Lädt...</span></div>}
        proposed={<div className="ll-buffer"><Wave /><span>Stimme wird geladen</span></div>}
        note="Drehender Spinner = Technik. Eine kleine, langsame Wellenform passt zum Audio-Kontext und bleibt ruhig."
      />

      <Pair
        title="„Weiter“ nach der Figurenwahl"
        where="create-story/page.tsx – handleNextStep (Zugangsprüfung)"
        current={
          <button type="button" className="ll-demo-btn" onClick={() => fakeCheck(setCheckingOld)}>
            Weiter <ChevronRight size={18} />
          </button>
        }
        proposed={
          <button type="button" className="ll-demo-btn" data-busy={checking || undefined} onClick={() => !checking && fakeCheck(setChecking)} aria-busy={checking}>
            {checking ? <><Wave bars={3} /> Einen Moment</> : <>Weiter <ChevronRight size={18} /></>}
          </button>
        }
        note={`Heute prüft der Klick asynchron Zugang/Rate-Limit – ohne jede Rückmeldung (zum Testen links klicken: es passiert nichts${checkingOld ? " … wie gerade eben" : ""}). Ein kurzer Busy-Zustand im Button verhindert Doppelklicks und Unsicherheit.`}
      />
    </div>
  );
}
