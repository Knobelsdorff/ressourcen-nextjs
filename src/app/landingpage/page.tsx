"use client";

import HeroSection from "@/components/landing/HeroSection";
import StakesSection from "@/components/landing/StakesSection";
import ValuePropositionSection from "@/components/landing/ValuePropositionSection";
import EmpathySection from "@/components/landing/EmpathySection";
import PlanSection from "@/components/landing/PlanSection";
import ExplanatoryParagraphSection from "@/components/landing/ExplanatoryParagraphSection";

export default function LandingPage() {
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
