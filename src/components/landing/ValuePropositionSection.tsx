"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Sparkles, AudioLines, Infinity, Heart } from "lucide-react";

export default function ValuePropositionSection() {
  const router = useRouter();
  
  const features = [
    {
      icon: Heart,
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
    <section className="landing-section landing-benefits py-20 px-4">
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
                className="landing-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="landing-card-icon">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-[15px] leading-relaxed">{feature.description}</p>
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
              className="text-center mb-8"
            >
              <Button
                onClick={() => router.push("/ankommen")}
                size="lg"
                className="landing-primary-button"
              >
                Jetzt kurz eintauchen
              </Button>
            </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-lg md:text-xl text-amber-700 text-center italic"
        >
          Manchmal ist es genau diese Ruhe, die im Alltag am schwersten erreichbar ist
        </motion.p>
      </div>
    </section>
  );
}
