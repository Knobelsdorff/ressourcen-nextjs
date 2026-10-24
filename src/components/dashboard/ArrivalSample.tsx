"use client";

/**
 * "Zum Ankommen" im Dashboard: die Kostprobe (dieselbe wie im Startseiten-Hero,
 * gepflegt unter /admin/kostprobe), immer kostenlos – auch für leere Accounts.
 */

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { trackEvent } from "@/lib/analytics";

export interface ArrivalSampleData {
  title: string;
  audioUrl: string;
}

interface ArrivalSampleProps {
  sample: ArrivalSampleData;
  /** Ob der Account schon eigene (KI-)Storys hat – steuert den Text des Aufrufs. */
  hasOwnStories: boolean;
  onCreateStory: () => void;
  /** data-tour-Anker für Einführungen (src/components/onboarding). */
  tourAnchor?: string;
}

export default function ArrivalSample({ sample, hasOwnStories, onCreateStory, tourAnchor }: ArrivalSampleProps) {
  return (
    <motion.div
      data-tour={tourAnchor}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="dashboard-arrival rounded-2xl p-6 sm:p-8 mt-8 md:mt-12"
    >
      <div className="max-w-lg mx-auto">
        <AudioPlayer
          audioUrl={sample.audioUrl}
          title={sample.title}
          variant="compact"
          onPlay={() => trackEvent({ eventType: "audio_play", metadata: { page_path: "/dashboard#ankommen" } })}
          header={
            <div className="mb-5 text-center">
              <h3 className="text-lg font-medium text-secondary-900">{sample.title}</h3>
              <p className="mt-1 text-sm text-secondary-500">Für ruhige Momente zwischendurch</p>
            </div>
          }
        />
        <p className="mt-4 text-center text-sm text-secondary-500">(immer kostenlos)</p>

        <div className="mt-6 pt-5 border-t border-primary-100">
          <p className="text-center text-sm font-medium text-primary-900 mb-1">
            {hasOwnStories
              ? "Möchtest du eine weitere Power Story erstellen?"
              : "Möchtest du jetzt deine erste eigene Power Story erstellen?"}
          </p>
          <p className="text-center text-xs text-secondary-500 mb-4 max-w-sm mx-auto leading-snug">
            In 2–3 Minuten. In deinem Tempo. In Anlehnung an die Arbeit, die wir gemeinsam begonnen haben.
          </p>
          <div className="flex justify-center">
            <button type="button" onClick={onCreateStory} className="dashboard-secondary-button">
              <Plus className="w-4 h-4 flex-shrink-0" />
              Eine Power Story in deinem Stil entwickeln
            </button>
          </div>
          <p className="text-center text-xs text-secondary-500/70 mt-3 max-w-sm mx-auto leading-snug">
            Viele Klient:innen nutzen ihre eigenen Power Storys als sanfte Erinnerung an unsere gemeinsame Arbeit.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
