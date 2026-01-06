"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Quote } from "lucide-react";

export default function EmpathySection() {
  const router = useRouter();
  
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
            className="bg-amber-50/50 rounded-2xl p-8 md:p-10 border border-amber-100"
          >
            <h3 className="text-2xl md:text-3xl font-semibold text-amber-900 mb-4">
              Es fühlt sich oft anders an, als es aussieht
            </h3>
            <p className="text-lg md:text-xl text-amber-700 leading-relaxed">
              Viele Menschen funktionieren im Alltag zuverlässig –
              und merken erst in stillen Momenten, wie viel Spannung innerlich eigentlich da ist.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-amber-50/50 rounded-2xl p-8 md:p-10 border border-amber-100"
          >
            <h3 className="text-2xl md:text-3xl font-semibold text-amber-900 mb-4">
              Power Storys sind bewusst einfach gehalten
            </h3>
            <p className="text-lg md:text-xl text-amber-700 leading-relaxed">
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
          className="bg-amber-50 rounded-2xl p-8 md:p-12 mb-12 border-l-4 border-amber-400"
        >
          <Quote className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <p className="text-xl md:text-2xl text-amber-900 mb-6 italic leading-relaxed text-center">
            "Ich war skeptisch, ob eine kurze Geschichte wirklich etwas verändern kann.
            Aber schon nach den ersten Minuten wurde es spürbar ruhiger in mir."
          </p>
          <p className="text-center text-amber-700 font-semibold">
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
                onClick={() => router.push("/example")}
                size="lg"
                className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
              >
                Einfach selbst erleben
              </Button>
            </motion.div>
      </div>
    </section>
  );
}
