"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/modals/auth-modal";
import { HouseHeart, Sparkles, AudioLines, Infinity } from "lucide-react";

export default function ValuePropositionSection() {
  const features = [
    {
      icon: HouseHeart,
      title: "Ein sicherer Raum",
      description: "Du musst nichts leisten. Du darfst einfach da sein.",
    },
    {
      icon: Sparkles,
      title: "Personalisierte Geschichten",
      description: "Abgestimmt auf das, was du gerade brauchst.",
    },
    {
      icon: AudioLines,
      title: "Ruhige Stimmen",
      description: "Sanft getragen – damit du innerlich mitgehen kannst.",
    },
    {
      icon: Infinity,
      title: "Jederzeit für dich da",
      description: "Wenn du merkst, dass es viel wird – oder gar nicht erst so weit kommen soll.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          Ein einfacher Weg, wieder bei dir anzukommen
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-16"
        >
          Kurze Geschichten, die dich sanft aus der Anspannung holen
        </motion.p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-amber-100 rounded-lg p-3">
                    <Icon className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-amber-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-amber-700">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <AuthModal isOnLandingPage={true}>
            <Button
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
            >
              Jetzt kurz eintauchen
            </Button>
          </AuthModal>
        </motion.div>
      </div>
    </section>
  );
}
