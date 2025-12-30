"use client";

import AppNavbar from "@/components/landing/AppNavbar";
import AppHeroSection from "@/components/landing/AppHeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import WhyItWorksSection from "@/components/landing/WhyItWorksSection";
import WhoItsForSection from "@/components/landing/WhoItsForSection";
import WhatMakesDifferentSection from "@/components/landing/WhatMakesDifferentSection";
import HowToUseSection from "@/components/landing/HowToUseSection";
import FinalCTASection from "@/components/landing/FinalCTASection";

export default function NewLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <AppNavbar />
      <AppHeroSection />
      <HowItWorksSection />
      <WhyItWorksSection />
      <WhoItsForSection />
      <WhatMakesDifferentSection />
      <HowToUseSection />
      <FinalCTASection />
    </main>
  );
}
