"use client";

import { useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import StakesSection from "@/components/landing/StakesSection";
import ValuePropositionSection from "@/components/landing/ValuePropositionSection";
import EmpathySection from "@/components/landing/EmpathySection";
import PlanSection from "@/components/landing/PlanSection";
import ExplanatoryParagraphSection from "@/components/landing/ExplanatoryParagraphSection";
import { scrollToAnchor } from "@/lib/navigation-helpers";

// Re-export types for backward compatibility
export type { ResourceFigure, AudioState, AppState } from "@/lib/types/story";

export default function RessourcenApp() {
  // Automatisches Scrollen zu Anchor, wenn Hash in URL vorhanden ist
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const hash = window.location.hash;
    if (hash === "#was-ist-eine-power-story") {
      // Kurze Verzögerung, damit die Seite vollständig geladen ist
      setTimeout(() => {
        scrollToAnchor("was-ist-eine-power-story");
      }, 300);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <HeroSection />
      <StakesSection />
      <ValuePropositionSection />
      <EmpathySection />
      <PlanSection />
      <ExplanatoryParagraphSection />
    </div>
  );
}
