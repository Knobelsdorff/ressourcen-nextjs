"use client";

import { motion } from "framer-motion";
import { FigureIcon, LoaderProps, ReadyCta, StoryPanel } from "./shared";

/** 1:1 Nachbau des heutigen Loaders aus AudioPlayback.tsx (showUnifiedLoader) – zum Vergleich. */
export default function CurrentLoader({ figure, phase, onPlay }: LoaderProps) {
  if (phase === "ready") {
    return <StoryPanel><ReadyCta figure={figure} onPlay={onPlay} /></StoryPanel>;
  }
  return (
    <StoryPanel>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 lg:py-20">
        <h1 className="text-2xl lg:text-3xl font-light text-primary-900 mb-8">{figure.name}</h1>
        <div className="flex justify-center mb-12">
          <FigureIcon figure={figure} size={48} className="w-12 h-12" />
        </div>
        <div className="flex justify-center mb-8">
          <motion.div
            className="w-20 h-20 lg:w-24 lg:h-24 rounded-full border-2 border-primary-400 relative"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-primary-400"
              style={{ opacity: 0.08 }}
              animate={{ opacity: [0.05, 0.1, 0.05] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
        <h2 className="text-primary-800 text-xl lg:text-2xl font-medium mb-6">Deine Power Story nimmt nun Gestalt an</h2>
        <p className="text-primary-600 text-sm lg:text-base opacity-70">Es ist alles gut – du darfst dir jetzt einen Moment Zeit lassen</p>
      </motion.div>
    </StoryPanel>
  );
}
