"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface BLSSectionProps {
  className?: string;
}

export default function BLSSection({ className = "" }: BLSSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-6 ${className}`}
    >
      {/* Collapsible Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-amber-900 font-medium">
              Wirkung vertiefen <span className="text-amber-600 font-normal">(optional)</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-600 hidden sm:inline">
              Mehr erfahren
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-amber-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-amber-600" />
            )}
          </div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-2 border-t border-amber-200/50">
                {/* Explanation Text */}
                <p className="text-amber-800 leading-relaxed mb-5">
                  Manche Menschen empfinden die Geschichte intensiver, wenn sie dabei sanft abwechselnd auf ihre Oberarme klopfen.
                </p>

                {/* Video Section - 1280x852 aspect ratio (approx 1.503:1) */}
                <div className="relative rounded-xl overflow-hidden shadow-lg bg-black">
                  <video
                    src="/videos/Bilaterale Stimulation.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="w-full"
                    style={{ aspectRatio: '1280 / 852' }}
                  >
                    Dein Browser unterstützt das Video-Element nicht.
                  </video>
                </div>

                {/* Additional Info (optional) */}
                <p className="text-sm text-amber-600/80 mt-4 text-center">
                  Diese Technik wird auch als bilaterale Stimulation bezeichnet
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
