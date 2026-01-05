"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/modals/auth-modal";
import Image from "next/image";

export default function StakesSection() {
  const stakes = [
    "Innere Unruhe klingt nicht immer von selbst ab",
    "Selbst freie Momente bringen oft kaum Entlastung",
    "Der Körper bleibt angespannt, auch ohne klaren Anlass",
    "Erholung fühlt sich oft oberflächlich an",
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header und Subheader - bleiben oben */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          Anspannung bleibt oft länger, als nötig
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-8 lg:mb-12"
        >
          Im Alltag bleibt oft wenig Raum, um kurz innezuhalten und wieder bei sich anzukommen
        </motion.p>
      </div>

      {/* Mobile: Bild breitenfüllend - außerhalb des Containers */}
      <div className="lg:hidden w-screen relative left-1/2 -translate-x-1/2 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full"
        >
          <Image
            src="/images/Power-Storys_Stakes_Mobile.webp"
            alt="Power Stories Stakes"
            width={1200}
            height={600}
            className="w-full h-auto object-cover"
            priority
          />
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto">

        {/* Desktop: Grid mit Stichpunkten links und Bild rechts */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12 items-start mb-12">
          {/* Stichpunkte links mit CTA */}
          <div className="space-y-4">
            {stakes.map((stake, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="text-amber-600 text-xl mt-1">•</span>
                <p className="text-lg text-amber-800">{stake}</p>
              </motion.div>
            ))}
            {/* Desktop CTA unter Stichpunkten */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="pt-4"
            >
              <AuthModal isOnLandingPage={true}>
                <Button
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
                >
                  Jetzt ausprobieren
                </Button>
              </AuthModal>
            </motion.div>
          </div>

          {/* Bild rechts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <Image
              src="/images/Power-Storys_Stakes.webp"
              alt="Power Stories Stakes"
              width={1200}
              height={600}
              className="rounded-3xl shadow-xl object-cover w-full"
              priority
            />
          </motion.div>
        </div>

        {/* Mobile: Stichpunkte unter dem Bild */}
        <div className="lg:hidden space-y-4 mb-12">
          {stakes.map((stake, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-start gap-3"
            >
              <span className="text-amber-600 text-xl mt-1">•</span>
              <p className="text-lg text-amber-800">{stake}</p>
            </motion.div>
          ))}
        </div>

        {/* Mobile CTA - zentriert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="lg:hidden text-center"
        >
          <AuthModal isOnLandingPage={true}>
            <Button
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
            >
              Jetzt ausprobieren
            </Button>
          </AuthModal>
        </motion.div>
      </div>
    </section>
  );
}
