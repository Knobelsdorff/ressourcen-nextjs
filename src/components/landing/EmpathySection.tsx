"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/modals/auth-modal";
import { Award, Users, Quote } from "lucide-react";

export default function EmpathySection() {
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
          Wir sind hier, um dich zu unterstützen
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-16"
        >
          Unter der Leitung von Trauma-Experten verstehen wir deinen Weg.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
          >
            <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-2xl font-semibold text-amber-900 mb-2">
              30+ Jahre Erfahrung
            </h3>
            <p className="text-amber-700">
              Unser Team hat jahrzehntelange Erfahrung in der Traumatherapie.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center"
          >
            <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-2xl font-semibold text-amber-900 mb-2">
              Bewährter Erfolg
            </h3>
            <p className="text-amber-700">
              Wir haben bereits unzählige Menschen erfolgreich auf ihrem Weg zur
              emotionalen Heilung begleitet.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-amber-50 rounded-xl p-8 md:p-12 mb-12"
        >
          <Quote className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <p className="text-xl md:text-2xl text-amber-900 text-center mb-6 italic">
            "Diese Ressourcen haben mir geholfen, mich mit mir selbst und
            anderen auf eine Weise zu verbinden, die ich nie für möglich
            gehalten hätte."
          </p>
          <p className="text-center text-amber-700 font-semibold">
            Jessica R., Nutzerin
          </p>
        </motion.div>

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
              Jetzt starten
            </Button>
          </AuthModal>
        </motion.div>
      </div>
    </section>
  );
}
