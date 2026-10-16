"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import LandingStoryPreview from './LandingStoryPreview';

/*
 * Header nach dem StoryBrand-Wireframe – Text und Struktur von Andreas:
 *
 * 1. Ein Versprechen, das in Sekunden verstanden wird (Headline + eine Zeile).
 * 2. Ein direkter Handlungsaufruf – die erste Power Story beginnt direkt.
 * 3. Ein Bild des Zielzustands: die Frau, die bei sich angekommen ist.
 *
 * Neu ist die Hörprobe auf dem Bild. Sie ist der "transitional CTA" des
 * Wireframes: wer noch nicht starten will, kann sofort reinhören.
 */
export default function HeroSection() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const handleCTAClick = () => {
    router.push("/create-story?first=true");
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
        {/* Text – auf Desktop links, auf Mobile zuerst: er trägt das Versprechen. */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="landing-hero-copy"
        >
          <motion.h1 variants={item} className="font-bold">
            Finde in nur wenigen Minuten mehr innere Ruhe
          </motion.h1>

          <motion.p variants={item} className="landing-hero-lead">
            Wenn sich viel anstaut, findest du hier wieder <span className="whitespace-nowrap">mehr Halt</span>
          </motion.p>

          <motion.div variants={item} className="landing-hero-actions">
            <Button
              onClick={handleCTAClick}
              size="lg"
              className="landing-primary-button"
            >
              Meine Power Story erstellen
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Bild des Zielzustands mit der Hörprobe – rechts, auf Mobile darunter. */}
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
