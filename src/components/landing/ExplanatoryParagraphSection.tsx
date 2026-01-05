"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/modals/auth-modal";

export default function ExplanatoryParagraphSection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          Verbinde dich wieder mit dir selbst und anderen
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-8"
        >
          Verständnis ist nur eine Erfahrung entfernt.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="prose prose-lg max-w-none text-center text-amber-800 mb-12"
        >
          <p className="text-lg md:text-xl leading-relaxed">
            Viele Menschen fühlen sich einsam und entfremdet und sehnen sich
            nach echten Beziehungen. Bei Ressourcen-App spezialisieren wir uns
            darauf, eine unterstützende Gemeinschaft zu schaffen, in der
            persönliches Wachstum und emotionale Heilung durch gemeinsame
            Erfahrungen stattfinden. Nimm an unseren intensiven Workshops teil,
            um dich authentisch auszudrücken und gleichzeitig die Unterstützung
            zu erhalten, die du verdienst. Es ist Zeit, aus der Isolation
            auszubrechen und in ein Leben voller echter Verbindungen zu treten.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
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
