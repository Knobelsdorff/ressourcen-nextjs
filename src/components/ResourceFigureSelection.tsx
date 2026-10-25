"use client";

/**
 * Schritt 1 im Story-Flow: Figur wählen – im Aufbau des Engel-Flows
 * (Frage links, Auswahl rechts, feste Leiste mit "Weiter").
 *
 * Alle Figuren einer Kategorie passen als kompakte Kacheln auf eine Seite.
 * Pronomen (z. B. Partner/in) und eigene Figuren werden direkt im rechten
 * Bereich abgefragt statt in einem Modal.
 */

import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronLeft, Plus } from 'lucide-react';
import { realFigures, fictionalFigures } from '@/data/figures';
import { ResourceFigure } from '@/lib/types/story';
import FigureIcon from './story-flow/FigureIcon';
import { useScrollFade } from './story-flow/useScrollFade';

interface ResourceFigureSelectionProps {
  selectedFigure: ResourceFigure | null;
  onFigureSelect: (figure: ResourceFigure) => void;
  onNext?: () => void;
  /** Zugang wird gerade geprüft – "Weiter" wartet. */
  busy?: boolean;
}

type Section = 'fictional' | 'real' | 'places';
type Panel = { kind: 'grid' } | { kind: 'pronouns'; figure: ResourceFigure } | { kind: 'custom' };

// Diese fünf zuerst, danach die übrigen fiktiven Figuren.
const INITIAL_FICTIONAL_FIGURES = ['angel', 'archangel-michael', 'godmother', 'animal-spirit', 'wise-wizard'];

const FICTIONAL_FIGURE_TEXTS: Record<string, string> = {
  'angel': 'Sanft, mitfühlend und ruhig an deiner Seite',
  'archangel-michael': 'Starker Beschützer – gibt dir Halt und klare Ausrichtung',
  'godmother': 'Nährend, haltend und tief verbunden mit allem Leben'
};

const PLACE_FIGURES: ResourceFigure[] = [
  { id: 'place-safe', name: 'Sicherer Ort', emoji: '🏠', description: 'Ein Ort voller Geborgenheit und Schutz', category: 'place', pronouns: 'es/sein', isCustom: false },
  { id: 'place-healing', name: 'Heilungsraum', emoji: '✨', description: 'Ein Raum für Heilung und Regeneration', category: 'place', pronouns: 'es/sein', isCustom: false },
  { id: 'place-garden', name: 'Innerer Garten', emoji: '🌱', description: 'Ein Garten voller Wachstum und Leben', category: 'place', pronouns: 'es/sein', isCustom: false },
  { id: 'place-power', name: 'Kraftplatz', emoji: '⚡', description: 'Ein Ort voller Energie und Stärke', category: 'place', pronouns: 'es/sein', isCustom: false },
  { id: 'place-temple', name: 'Innerer Tempel', emoji: '🕍', description: 'Ein heiliger Raum der Stille', category: 'place', pronouns: 'es/sein', isCustom: false },
  { id: 'place-harbor', name: 'Mein sicherer Hafen', emoji: '⚓', description: 'Ein sicherer Ankerplatz für deine Seele', category: 'place', pronouns: 'es/sein', isCustom: false },
  { id: 'place-soul', name: 'Mein Seelenplatz', emoji: '💫', description: 'Ein Ort der tiefen Verbindung', category: 'place', pronouns: 'es/sein', isCustom: false },
];

const FIGURES: Record<Section, ResourceFigure[]> = {
  fictional: [
    ...INITIAL_FICTIONAL_FIGURES.map((id) => fictionalFigures.find((f) => f.id === id)).filter((f): f is ResourceFigure => !!f),
    ...fictionalFigures.filter((f) => !INITIAL_FICTIONAL_FIGURES.includes(f.id)),
  ].map((f) => ({ ...f, description: FICTIONAL_FIGURE_TEXTS[f.id] || f.description })),
  real: realFigures,
  places: PLACE_FIGURES,
};

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'fictional', label: 'Fiktiv' },
  { id: 'real', label: 'Real' },
  { id: 'places', label: 'Orte' },
];

// Figuren, bei denen erst die Form (sie/er) feststehen muss.
const PRONOUN_CHOICES: Record<string, [string, string]> = {
  'partner': ['Partnerin', 'Partner'],
  'teacher': ['Lieblingslehrerin', 'Lieblingslehrer'],
  'sibling': ['Schwester', 'Bruder'],
  'best-friend': ['Beste Freundin', 'Bester Freund'],
  'pet-dog': ['Weiblich', 'Männlich'],
  'pet-cat': ['Weiblich', 'Männlich'],
};

const PRONOUN_OPTIONS = [
  { value: 'sie/ihr', label: 'sie / ihr' },
  { value: 'er/ihm', label: 'er / ihm' },
  { value: 'es/sein', label: 'es / sein' },
];

function sectionOf(figure: ResourceFigure | null): Section {
  if (!figure) return 'fictional';
  if (figure.category === 'place') return 'places';
  if (figure.category === 'real') return 'real';
  return 'fictional';
}

const EMPTY_CUSTOM = { name: '', pronouns: 'sie/ihr', description: '', placeType: '', safetyFeatures: '' };

export default function ResourceFigureSelection({
  selectedFigure,
  onFigureSelect,
  onNext,
  busy = false,
}: ResourceFigureSelectionProps) {
  const [section, setSection] = useState<Section>(() => sectionOf(selectedFigure));
  const [panel, setPanel] = useState<Panel>({ kind: 'grid' });
  const [preview, setPreview] = useState<ResourceFigure | null>(null);
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreBelow = useScrollFade(scrollRef, `${section}-${panel.kind}`);

  const isPlaces = section === 'places';
  const shown = preview ?? selectedFigure;
  const customSelected = !!selectedFigure?.isCustom && sectionOf(selectedFigure) === section;

  const changeSection = (next: Section) => {
    setSection(next);
    setPanel({ kind: 'grid' });
    setPreview(null);
  };

  const pick = (figure: ResourceFigure) => {
    if (PRONOUN_CHOICES[figure.id]) {
      setPanel({ kind: 'pronouns', figure });
      return;
    }
    onFigureSelect(figure);
  };

  const openCustom = () => {
    // Eine schon angelegte eigene Figur lässt sich hier weiter bearbeiten.
    setCustom(customSelected && selectedFigure
      ? { ...EMPTY_CUSTOM, name: selectedFigure.name, pronouns: selectedFigure.pronouns, description: selectedFigure.description || '' }
      : { ...EMPTY_CUSTOM, pronouns: isPlaces ? 'es/sein' : 'sie/ihr' });
    setPanel({ kind: 'custom' });
  };

  const submitCustom = (event: React.FormEvent) => {
    event.preventDefault();
    const name = custom.name.trim();
    if (!name) return;
    onFigureSelect(isPlaces
      ? {
        id: `custom-place-${Date.now()}`,
        name,
        emoji: '🏞️',
        description: [custom.placeType, custom.description, custom.safetyFeatures].map((part) => part.trim()).filter(Boolean).join('. '),
        category: 'place',
        pronouns: 'es/sein',
        isCustom: true,
      }
      : {
        id: `custom-${Date.now()}`,
        name,
        emoji: '✨',
        description: custom.description.trim(),
        category: 'custom',
        pronouns: custom.pronouns,
        isCustom: true,
      });
    setPanel({ kind: 'grid' });
  };

  const panelMotion = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    // Der ausblendende Bereich darf keine Klicks mehr annehmen.
    exit: { opacity: 0, y: -6, pointerEvents: 'none' as const, transition: { duration: 0.15 } },
    transition: { duration: 0.25, ease: 'easeOut' as const },
  };

  return (
    <section className="story-first-stage story-figure-stage" aria-label="Figur wählen">
      <div className="story-first-intro">
        <p className="story-stage-kicker">Deine Figur</p>
        <h1>Wer soll in deiner Power Story an deiner Seite sein?</h1>
        <p className="story-first-guidance">Eine Figur, ein lieber Mensch oder ein sicherer Ort – wähle, was dir gerade Halt gibt.</p>

        <AnimatePresence mode="wait">
          {shown && (
            <motion.div
              key={shown.id}
              className="story-figure-choice"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="story-first-avatar" aria-hidden="true">
                <FigureIcon figure={shown} size={52} className="story-first-avatar-image" />
              </span>
              <span>
                <strong>{shown.name}</strong>
                {shown.description && <span>{shown.description}</span>}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="story-first-response story-figure-response">
        <div className="story-figure-tabs" role="tablist" aria-label="Art der Figur">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              onClick={() => changeSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="story-first-scroll" data-more-below={moreBelow || undefined}>
          <AnimatePresence mode="wait" initial={false}>
            {panel.kind === 'grid' && (
              <motion.div key={`grid-${section}`} {...panelMotion}>
                <div className="story-figure-grid" role="group" aria-label={SECTIONS.find((s) => s.id === section)?.label}>
                  {FIGURES[section].map((figure) => {
                    const selected = selectedFigure?.id === figure.id;
                    return (
                      <button
                        key={figure.id}
                        type="button"
                        className="story-figure-tile"
                        aria-pressed={selected}
                        onClick={() => pick(figure)}
                        onMouseEnter={() => setPreview(figure)}
                        onMouseLeave={() => setPreview(null)}
                      >
                        <span className="story-figure-tile-icon" aria-hidden="true">
                          <FigureIcon figure={figure} size={44} />
                        </span>
                        <span className="story-figure-tile-name">{figure.name}</span>
                        {figure.description && <span className="sr-only">{figure.description}</span>}
                        {selected && <span className="story-figure-tile-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="story-figure-tile story-figure-tile--custom"
                    aria-pressed={customSelected}
                    onClick={openCustom}
                  >
                    <span className="story-figure-tile-icon" aria-hidden="true">
                      {customSelected && selectedFigure ? <FigureIcon figure={selectedFigure} size={44} /> : <Plus size={22} strokeWidth={2} />}
                    </span>
                    <span className="story-figure-tile-name">
                      {customSelected && selectedFigure ? selectedFigure.name : isPlaces ? 'Eigener Ort' : 'Eigene Figur'}
                    </span>
                    {customSelected && <span className="story-figure-tile-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
                  </button>
                </div>
              </motion.div>
            )}

            {panel.kind === 'pronouns' && (
              <motion.div key="pronouns" className="story-figure-panel" {...panelMotion}>
                <div className="story-figure-panel-head">
                  <span className="story-first-avatar" aria-hidden="true">
                    <FigureIcon figure={panel.figure} size={44} className="story-first-avatar-image" />
                  </span>
                  <div>
                    <p className="story-stage-kicker">{panel.figure.name}</p>
                    <h2>Welche Form passt für dich?</h2>
                  </div>
                </div>
                <p className="story-figure-panel-text">Damit deine Geschichte die richtigen Worte findet.</p>
                <div className="story-first-options">
                  {(['sie/ihr', 'er/ihm'] as const).map((pronouns, i) => (
                    <button
                      key={pronouns}
                      type="button"
                      className="story-first-option"
                      aria-pressed={selectedFigure?.id === panel.figure.id && selectedFigure.pronouns === pronouns}
                      onClick={() => {
                        onFigureSelect({ ...panel.figure, pronouns });
                        setPanel({ kind: 'grid' });
                      }}
                    >
                      <span className="story-first-option-mark" aria-hidden="true">
                        {selectedFigure?.id === panel.figure.id && selectedFigure.pronouns === pronouns && <Check size={15} strokeWidth={2.5} />}
                      </span>
                      <span>{PRONOUN_CHOICES[panel.figure.id][i]} <span className="story-option-note">({pronouns.replace('/', ' / ')})</span></span>
                    </button>
                  ))}
                </div>
                <button type="button" className="story-figure-panel-back" onClick={() => setPanel({ kind: 'grid' })}>
                  <ChevronLeft size={16} aria-hidden="true" /> Andere Figur wählen
                </button>
              </motion.div>
            )}

            {panel.kind === 'custom' && (
              <motion.form key="custom" className="story-figure-panel story-figure-form" onSubmit={submitCustom} {...panelMotion}>
                <h2>{isPlaces ? 'Dein eigener sicherer Ort' : 'Deine eigene Figur'}</h2>
                <label>
                  <span>{isPlaces ? 'Name des Ortes' : 'Name der Figur'}</span>
                  <input
                    type="text"
                    value={custom.name}
                    onChange={(e) => setCustom((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={isPlaces ? 'z. B. Mein Strand' : 'z. B. Tante Anna'}
                    maxLength={60}
                    required
                    autoFocus
                  />
                </label>
                {isPlaces ? (
                  <>
                    <label>
                      <span>Art des Ortes <em>(optional)</em></span>
                      <input
                        type="text"
                        value={custom.placeType}
                        onChange={(e) => setCustom((prev) => ({ ...prev, placeType: e.target.value }))}
                        placeholder="z. B. Strand, Berg, Garten"
                        maxLength={80}
                      />
                    </label>
                    <label>
                      <span>Was macht ihn sicher für dich? <em>(optional)</em></span>
                      <input
                        type="text"
                        value={custom.safetyFeatures}
                        onChange={(e) => setCustom((prev) => ({ ...prev, safetyFeatures: e.target.value }))}
                        placeholder="z. B. Niemand kann mich hier stören"
                        maxLength={160}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="story-figure-form-row" role="group" aria-label="Pronomen">
                      <span>Pronomen</span>
                      <div className="story-segmented">
                        {PRONOUN_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={custom.pronouns === option.value}
                            onClick={() => setCustom((prev) => ({ ...prev, pronouns: option.value }))}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label>
                      <span>Was macht sie besonders? <em>(optional)</em></span>
                      <input
                        type="text"
                        value={custom.description}
                        onChange={(e) => setCustom((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="z. B. Warm, geduldig, immer für mich da"
                        maxLength={160}
                      />
                    </label>
                  </>
                )}
                <div className="story-figure-form-actions">
                  <button type="button" className="story-figure-panel-back" onClick={() => setPanel({ kind: 'grid' })}>
                    <ChevronLeft size={16} aria-hidden="true" /> Abbrechen
                  </button>
                  <button type="submit" className="story-figure-form-submit" disabled={!custom.name.trim()}>
                    Übernehmen
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="story-first-actions">
          <p className="story-picked" aria-live="polite">
            {selectedFigure ? (
              <>
                <span className="story-picked-icon" aria-hidden="true"><FigureIcon figure={selectedFigure} size={26} /></span>
                <span><span className="story-picked-label">Gewählt:</span> {selectedFigure.name}</span>
              </>
            ) : (
              <span className="story-picked-empty">Wähle eine Figur</span>
            )}
          </p>
          <button type="button" className="story-first-next" onClick={onNext} disabled={!selectedFigure || busy || panel.kind !== 'grid'}>
            <span>{busy ? 'Einen Moment …' : 'Weiter'}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
