"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { realFigures, fictionalFigures } from "@/data/figures";
import { ResourceFigure } from "@/app/page";
import { trackEvent } from "@/lib/analytics";
import JesusIconFinal from "@/components/JesusIconFinal";

const CURATED_FIGURE_IDS = [
  "angel",
  "archangel-michael",
  "godmother",
  "superhero",
  "jesus",     
  "best-friend",
];

function getCuratedFigures(): ResourceFigure[] {
  const allFigures = [...realFigures, ...fictionalFigures];
  return allFigures.filter(figure => CURATED_FIGURE_IDS.includes(figure.id));
}

export default function FigurPage() {
  const router = useRouter();
  const [curatedFigures] = useState<ResourceFigure[]>(getCuratedFigures());

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

    router.push(`/?figure=${figure.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-8 md:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-medium text-amber-900 mb-3 md:mb-4">
            Wähle eine Figur, die sich im Moment stimmig anfühlt.
          </h1>
          <p className="text-sm md:text-base text-amber-700/70 max-w-md mx-auto">
            Wenn du unsicher bist: Engel ist ein guter Anfang.
          </p>
        </motion.div>

        {/* Grid of Figures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
        >
          {curatedFigures.map((figure, index) => (
            <motion.button
              key={figure.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              onClick={() => handleFigureSelect(figure)}
              className="bg-white rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-200 text-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              aria-label={`Wähle ${figure.name}`}
            >
              <div className="text-4xl md:text-5xl mb-3 md:mb-4 flex items-center justify-center">
                {figure.emoji === 'custom-jesus' ? (
                  <JesusIconFinal size={60} className="w-12 h-12 md:w-16 md:h-16" />
                ) : (
                  <span>{figure.emoji}</span>
                )}
              </div>
              <div className="text-base md:text-lg font-medium text-amber-900">
                {figure.name}
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

