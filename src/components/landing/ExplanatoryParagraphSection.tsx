"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ExplanatoryParagraphSection() {
  const router = useRouter();
  return (
    <section 
      id="was-ist-eine-power-story" 
      className="py-20 px-4 bg-white scroll-mt-20 md:scroll-mt-24"
    >
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          Was eine Power Story möglich macht
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
          className="prose prose-lg max-w-none text-center text-amber-800 mb-12"
        >
          <p className="text-lg md:text-xl leading-relaxed mb-4 font-semibold">
            Manchmal zeigt sich die Wirkung ganz leise.
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            Manche Menschen berichten,
            dass Gedanken langsamer werden.
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            Dass der Körper für einen Moment loslässt.
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
          Oder dass sich innerlich mehr Raum öffnet.
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            Nicht immer gleich.
            Nicht immer stark.
            Aber oft spürbar.
          </p>
        </motion.div>

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
                className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
              >
                Einfach selbst erleben
              </Button>
            </motion.div>
      </div>
    </section>
  );
}
