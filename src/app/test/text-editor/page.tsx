"use client";

/*
 * Testseite für den Admin-Texteditor: /test/text-editor
 *
 * Zeigt die echte Startseite mit dem echten Editor. Unterschied zur Live-Seite:
 * Hier ist jede Person "Admin" und gespeichert wird nur im localStorage dieses
 * Browsers (demoBackend) – nichts geht an Supabase, nichts wird für Besucher
 * sichtbar. Gut zum Ausprobieren und für Tests ohne Datenbank.
 */

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import AdminTextsPage from "@/app/admin/texte/page";
import { SiteTextProvider } from "@/components/site-text/SiteTextProvider";
import HeroSection from "@/components/landing/HeroSection";
import StakesSection from "@/components/landing/StakesSection";
import ValuePropositionSection from "@/components/landing/ValuePropositionSection";
import EmpathySection from "@/components/landing/EmpathySection";
import PlanSection from "@/components/landing/PlanSection";
import ExplanatoryParagraphSection from "@/components/landing/ExplanatoryParagraphSection";
import { demoBackend, resetDemoDb } from "./demoBackend";
import "@/app/landing.css";

export default function TextEditorTestPage() {
  const [view, setView] = useState<"page" | "all">("page");
  return (
    <SiteTextProvider published={{}} backend={demoBackend} forceAdmin>
      <div className="border-b border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Testseite Text-Editor.</strong> Unten links „Texte bearbeiten“ → Text anklicken → tippen → oben „Veröffentlichen“.
            Gespeichert wird nur in diesem Browser.
          </span>
          <span className="flex gap-2">
          <button
            type="button"
            onClick={() => setView(view === "page" ? "all" : "page")}
            className="rounded-md border border-sky-300 bg-white px-3 py-1 text-xs font-medium hover:bg-sky-100"
          >
            {view === "page" ? "Übersicht aller Texte (wie /admin/texte)" : "Zurück zur Startseite"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetDemoDb();
              window.location.reload();
            }}
            className="rounded-md border border-sky-300 bg-white px-3 py-1 text-xs font-medium hover:bg-sky-100"
          >
            Demo zurücksetzen
          </button>
          </span>
        </div>
      </div>
      {view === "all" ? (
        <AdminTextsPage />
      ) : (
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
      )}
    </SiteTextProvider>
  );
}
