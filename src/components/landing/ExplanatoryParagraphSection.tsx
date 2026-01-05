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
          Warum kurze Geschichten helfen können
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-8"
        >
          Nicht alles lässt sich über Denken lösen
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="prose prose-lg max-w-none text-center text-amber-800 mb-12"
        >
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            Viele Menschen erleben, dass innere Anspannung nicht verschwindet,
            nur weil man sie verstanden hat.
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            Der Körper bleibt oft auf Spannung,
            auch wenn im Kopf längst alles klar ist.
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            Ruhig erzählte Geschichten können einen anderen Zugang öffnen.
            Sie sprechen nicht den Verstand an,
            sondern laden den Körper ein, langsamer zu werden.
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            Nicht durch Nachdenken –
            sondern durch Zuhören.
          </p>
          <p className="text-lg md:text-xl leading-relaxed">
            Manchmal reicht genau das,
            damit etwas weicher wird
            und wieder mehr Raum entsteht.
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
              Einfach selbst erleben
            </Button>
          </AuthModal>
        </motion.div>
      </div>
    </section>
  );
}
