"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Quote } from "lucide-react";

export default function EmpathySection() {
  const router = useRouter();
  
  return (
    <section className="landing-section-plain py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          Wenn innere Ruhe schwer erreichbar wird
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-16"
        >
          Auch wenn im Außen alles weiterläuft
        </motion.p>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="landing-panel p-8 md:p-10"
          >
            <h3 className="text-2xl md:text-3xl font-semibold mb-4">
              Es fühlt sich oft anders an, als es aussieht
            </h3>
            <p className="landing-panel-copy text-lg md:text-xl leading-relaxed">
              Viele Menschen funktionieren im Alltag zuverlässig –
              und merken erst in stillen Momenten, wie viel Spannung innerlich eigentlich da ist.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="landing-panel p-8 md:p-10"
          >
            <h3 className="text-2xl md:text-3xl font-semibold mb-4">
              Power Storys sind bewusst einfach gehalten
            </h3>
            <p className="landing-panel-copy text-lg md:text-xl leading-relaxed">
              Sie wurden so gestaltet, dass dein Inneres folgen kann –
              ohne Analyse, ohne Technik, ohne etwas leisten zu müssen.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="landing-quote p-8 md:p-12 mb-12"
        >
          <Quote className="w-12 h-12 mx-auto mb-4" aria-hidden="true" />
          <p className="text-xl md:text-2xl mb-6 italic leading-relaxed text-center">
            "Ich war skeptisch, ob eine kurze Geschichte wirklich etwas verändern kann.
            Aber schon nach den ersten Minuten wurde es spürbar ruhiger in mir."
          </p>
          <p className="landing-quote-author text-center font-semibold">
            Linda R.
          </p>
        </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-center"
            >
              <Button
                onClick={() => router.push("/ankommen")}
                size="lg"
                className="landing-primary-button"
              >
                Einfach selbst erleben
              </Button>
            </motion.div>
      </div>
    </section>
  );
}
