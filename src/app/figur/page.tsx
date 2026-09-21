"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { realFigures, fictionalFigures } from "@/data/figures";
import { ResourceFigure } from "@/lib/types/story";
import { trackEvent } from "@/lib/analytics";
import AngelIconFinal from "@/components/AngelIconFinal";

const CURATED_FIGURE_IDS = [
  "angel",
  "godmother",
  "best-friend",
];

function getCuratedFigures(): ResourceFigure[] {
  const allFigures = [...realFigures, ...fictionalFigures];
  const figureMap = new Map(allFigures.map(figure => [figure.id, figure]));
  return CURATED_FIGURE_IDS.map(id => figureMap.get(id)).filter((figure): figure is ResourceFigure => figure !== undefined);
}

export default function FigurPage() {
  const router = useRouter();
  const [curatedFigures] = useState<ResourceFigure[]>(getCuratedFigures());
  const reduceMotion = useReducedMotion();

  // Die Hauskurve aus globals.css – ruhig, ohne Nachschwingen.
  const ease = [0.22, 1, 0.36, 1] as const;

  useEffect(() => {
    trackEvent({
      eventType: 'page_view',
      metadata: {
        page_path: '/figur',
      },
    });
  }, []);

  const handleFigureSelect = (figure: ResourceFigure) => {
    trackEvent({
      eventType: 'click_personalize',
      metadata: {
        page_path: '/figur',
        story_id: figure.id,
      },
    });

    router.push(`/create-story?figure=${figure.id}`);
  };

  /*
   * Diese Seite ist die verkürzte Fassung von Schritt 1 im Story-Flow: dieselbe
   * Auswahl, nur auf drei Vorschläge reduziert. Entsprechend trägt sie auch
   * dieselben Klassen (story-figure-card, story-step-heading, …) und wird vom
   * Layout in .story-flow gehüllt – die Karten sehen damit identisch aus, ohne
   * dass die Gestaltung ein zweites Mal beschrieben werden muss.
   */
  return (
    <div className="story-figure-step">
      <div className="story-step-heading text-center">
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease }}
        >
          <h2 className="px-3">
            Schau, welche Figur ein kleines inneres Ja auslöst
          </h2>
          <p className="figur-lead">
            Wenn nichts klar ist, kann der Engel ein guter Anfang sein.
          </p>
        </motion.div>
      </div>

      <div className="story-figure-content figur-content">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {curatedFigures.map((figure, index) => (
            <motion.button
              key={figure.id}
              type="button"
              aria-label={figure.name}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.1 + index * 0.08 }}
              whileHover={reduceMotion ? undefined : { scale: 1.02, y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => handleFigureSelect(figure)}
              className="story-figure-card w-full h-[14.5rem] sm:h-[18rem] relative cursor-pointer transition-all"
            >
              <div className="w-full h-full rounded-2xl flex flex-col">
                <div className="w-full h-full flex flex-col items-center justify-start p-4 text-center">
                  {/* Feste Icon-Fläche, damit alle Karten gleich aufbauen. */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3 flex-shrink-0">
                    {figure.id === 'angel' ? (
                      <AngelIconFinal size={60} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-4xl sm:text-5xl">{figure.emoji}</span>
                    )}
                  </div>
                  {/* Titel mit fester Mindesthöhe – die Beschreibungen starten dadurch auf einer Linie. */}
                  <h3 className="text-base sm:text-lg font-semibold mb-2 min-h-[2.5em] flex items-center justify-center flex-shrink-0">
                    {figure.name}
                  </h3>
                  <p className="text-xs sm:text-sm leading-snug min-h-[3.75em] sm:min-h-[4em] flex-shrink-0 text-center w-full">
                    {figure.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Ein leiser Rückweg – niemand muss sich hier sofort entscheiden. */}
        <div className="figur-skip-row">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="figur-skip"
          >
            Ich schaue mich erst noch um
          </button>
        </div>
      </div>
    </div>
  );
}
