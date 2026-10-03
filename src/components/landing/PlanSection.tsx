"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Headphones, Sparkles, Leaf } from 'lucide-react';

export default function PlanSection() {
  const router = useRouter();
  const steps = [
    {
      number: 1,
      icon: Headphones,
      title: "Ankommen",
      description: "Du hörst dir eine erste Power Story an – ruhig gesprochen, ohne etwas tun zu müssen.",
    },
    {
      number: 2,
      icon: Sparkles,
      title: "Deine eigene Geschichte",
      description: "Wenn du magst, beantwortest du ein paar einfache Fragen. Daraus entsteht eine Geschichte, die zu dir und deinem Moment passt.",
    },
    {
      number: 3,
      icon: Leaf,
      title: "Nachwirken lassen",
      description: "Du bleibst einen Moment bei dir und nimmst wahr, was sich verändert hat – ganz ohne Bewertung.",
    },
  ];

  return (
    <section className="landing-section landing-plan py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          So einfach kann es sein
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-16"
        >
          Du wirst Schritt für Schritt begleitet – ohne Vorbereitung, ohne Vorkenntnisse.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {steps.map((step, index) => {
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="landing-card p-8 text-center"
              >
                <div className="landing-step-number" aria-hidden="true">
                  {step.number}
                </div>
                <div className="landing-step-art" aria-hidden="true"><step.icon size={38} strokeWidth={1.5} /></div>
                <h3 className="text-xl font-semibold mb-2">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg md:text-xl text-amber-700 text-center mb-12 italic"
        >
          Es gibt kein richtig oder falsch. Du darfst einfach erleben, was passiert.
        </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <Button
                onClick={() => router.push("/ankommen")}
                size="lg"
                className="landing-primary-button"
              >
                Jetzt einfach beginnen
              </Button>
            </motion.div>
      </div>
    </section>
  );
}
