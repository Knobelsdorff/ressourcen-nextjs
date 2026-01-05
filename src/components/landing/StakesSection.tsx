"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/modals/auth-modal";
import Image from "next/image";

export default function StakesSection() {
  const stakes = [
    "Gefühle der Isolation und Einsamkeit",
    "Wunsch nach emotionaler Unterstützung",
    "Schwierigkeiten, die eigenen Gefühle auszudrücken",
    "Umgang mit Trauma ohne professionelle Begleitung",
    "Sehnsucht nach echten, tiefen Verbindungen",
    "Unverarbeitete emotionale Schmerzen",
    "Entfremdung in Beziehungen",
    "Leben ohne die Unterstützung, die du verdienst",
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
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
          className="text-xl md:text-2xl text-amber-700 text-center mb-12"
        >
          Im Alltag bleibt oft wenig Raum, um kurz innezuhalten und wieder bei sich anzukommen
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 flex justify-center"
        >
          <Image
            src="/images/Power-Storys_Stakes.webp"
            alt="Power Stories Stakes"
            width={1200}
            height={600}
            className="rounded-3xl shadow-xl object-cover w-full max-w-4xl"
            priority
          />
        </motion.div>

        <div className="space-y-4 mb-12">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <AuthModal isOnLandingPage={true}>
            <Button
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
            >
              Jetzt starten
            </Button>
          </AuthModal>
        </motion.div>
      </div>
    </section>
  );
}
