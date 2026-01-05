"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/modals/auth-modal";
import { UserPlus, Users, TrendingUp } from "lucide-react";

export default function PlanSection() {
  const steps = [
    {
      number: 1,
      icon: UserPlus,
      title: "Online registrieren",
      description: "Sichere dir deinen Platz für die kommende Ressource.",
    },
    {
      number: 2,
      icon: Users,
      title: "Ressource erstellen",
      description:
        "Verbinde dich mit anderen Teilnehmern und teile Erfahrungen.",
    },
    {
      number: 3,
      icon: TrendingUp,
      title: "Persönliches Wachstum erleben",
      description:
        "Arbeite an emotionalen Themen mit professioneller Unterstützung.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          3 einfache Schritte zu emotionaler Heilung
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-16"
        >
          Begleite uns und beginne heute, deine Beziehungen zu transformieren.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-8 shadow-lg text-center"
              >
                <div className="bg-amber-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {step.number}
                </div>
                <div className="bg-amber-100 rounded-lg p-3 w-fit mx-auto mb-4">
                  <Icon className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-amber-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-amber-700">{step.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
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
