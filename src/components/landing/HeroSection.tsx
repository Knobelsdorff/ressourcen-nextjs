"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Headphones, ShieldCheck } from "lucide-react";
import LandingStoryPreview from './LandingStoryPreview';
import { scrollToAnchor } from "@/lib/navigation-helpers";

/*
 * Struktur nach den Prinzipien trauma-informierter Gestaltung:
 *
 * 1. Zuerst sagen, was es IST ("Hörbare Geschichten"), nicht nur, was es
 *    bewirkt. Vorher stand dort nur ein Versprechen – wer neu ankommt, wusste
 *    nach dem Lesen nicht, was ihn erwartet.
 * 2. Den Aufwand vorab nennen (Dauer, kein Konto, Kopfhörer optional). Klarheit
 *    über den nächsten Schritt senkt die Hürde mehr als ein stärkerer CTA.
 * 3. Ein zweiter, leiser Weg neben dem Hauptbutton – niemand soll sich in
 *    einen Flow gedrängt fühlen.
 */
export default function HeroSection() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const handleCTAClick = () => {
    router.push("/ankommen");
  };

  // Die Hauskurve aus globals.css (Mobile-Drawer) – ruhig, ohne Nachschwingen.
  const ease = [0.22, 1, 0.36, 1] as const;

  // Gestaffelter Aufbau: die Zeilen kommen nacheinander zur Ruhe, statt
  // gemeinsam einzuspringen. Bei reduzierter Bewegung bleibt nur das Einblenden.
  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduceMotion ? 0 : 0.09, delayChildren: 0.05 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
  };

  return (
    <section className="landing-hero flex items-center justify-center lg:px-4">
      <div className="landing-hero-inner">
        {/* Text – auf Desktop zuerst: er trägt das Versprechen. */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="landing-hero-copy"
        >
          <motion.span variants={item} className="landing-eyebrow">
            <span /> DEIN PERSÖNLICHER RUHEPOL
          </motion.span>

          <motion.h1 variants={item} className="font-bold">
            Hörbare Geschichten, die dich in wenigen Minuten zur Ruhe bringen
          </motion.h1>

          <motion.p variants={item} className="landing-hero-lead">
            Du hörst zu – mehr ist nicht nötig. Ruhig gesprochene Power Storys
            helfen deinem Körper, aus der Anspannung zu finden.
          </motion.p>

          {/* Erwartbarkeit: Aufwand und Bedingungen stehen vor dem Klick. */}
          <motion.ul variants={item} className="landing-hero-facts">
            <li><Clock3 size={16} aria-hidden="true" /> Etwa 5 Minuten</li>
            <li><ShieldCheck size={16} aria-hidden="true" /> Ohne Konto starten</li>
            <li><Headphones size={16} aria-hidden="true" /> Kopfhörer empfohlen</li>
          </motion.ul>

          <motion.div variants={item} className="landing-hero-actions">
            <Button
              onClick={handleCTAClick}
              size="lg"
              className="landing-primary-button"
            >
              Jetzt kurz innehalten
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
            {/* Leiser Nebenweg – niemand muss sofort starten. */}
            <button
              type="button"
              onClick={() => scrollToAnchor("was-ist-eine-power-story")}
              className="landing-ghost-button"
            >
              Erst verstehen, was das ist
            </button>
          </motion.div>

          <motion.p variants={item} className="landing-hero-note">
            Kostenlos ausprobieren. Du entscheidest, wie weit du gehst.
          </motion.p>
        </motion.div>

        {/* The shared player sits inside the illustrated story preview. */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          className="landing-hero-figure"
        >
          <LandingStoryPreview />
        </motion.div>
      </div>
    </section>
  );
}
