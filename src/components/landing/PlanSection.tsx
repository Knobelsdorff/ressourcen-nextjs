"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useStartFirstStory } from "@/hooks/useStartFirstStory";
import { Volume2, Sparkles, Leaf } from 'lucide-react';
import { T } from "@/components/site-text/T";
import { landing } from "@/content/texts/landing";

export default function PlanSection() {
  const startFirstStory = useStartFirstStory();
  const steps = [
    {
      number: 1,
      icon: Volume2,
      title: landing["plan.step1.title"],
      description: landing["plan.step1.text"],
    },
    {
      number: 2,
      icon: Sparkles,
      title: landing["plan.step2.title"],
      description: landing["plan.step2.text"],
    },
    {
      number: 3,
      icon: Leaf,
      title: landing["plan.step3.title"],
      description: landing["plan.step3.text"],
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
          <T t={landing["plan.title"]} />
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-16"
        >
          <T t={landing["plan.subtitle"]} />
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
                  <T t={step.title} />
                </h3>
                <p className="text-[15px] leading-relaxed"><T t={step.description} /></p>
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
          <T t={landing["plan.note"]} />
        </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <Button
                data-analytics-cta="plan" onClick={startFirstStory}
                size="lg"
                className="landing-primary-button"
              >
                <T t={landing["plan.cta"]} />
              </Button>
            </motion.div>
      </div>
    </section>
  );
}
