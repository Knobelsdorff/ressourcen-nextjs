"use client";

import { useEffect } from "react";
import { MotionConfig } from 'framer-motion';
import HeroSection from "@/components/landing/HeroSection";
import StakesSection from "@/components/landing/StakesSection";
import ValuePropositionSection from "@/components/landing/ValuePropositionSection";
import EmpathySection from "@/components/landing/EmpathySection";
import PlanSection from "@/components/landing/PlanSection";
import ExplanatoryParagraphSection from "@/components/landing/ExplanatoryParagraphSection";
import { scrollToAnchor } from "@/lib/navigation-helpers";
import "./landing.css";

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

  // Reihenfolge nach dem StoryBrand-Wireframe (Andreas' Struktur):
  // Header → Stakes → Value Proposition → Guide (Empathie + Beleg) → Plan →
  // Explanatory Paragraph. Jede Sektion endet mit demselben direkten Weg
  // (/ankommen). Bitte nur bewusst umstellen – die Abfolge ist die Argumentation.
  return (
    <MotionConfig reducedMotion="user">
    <div className="wellness-theme landing-theme min-h-screen">
      <HeroSection />
      <StakesSection />
      <ValuePropositionSection />
      <EmpathySection />
      <PlanSection />
      <ExplanatoryParagraphSection />
    </div>
    </MotionConfig>
  );
}
