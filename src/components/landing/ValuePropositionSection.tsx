"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useStartFirstStory } from "@/hooks/useStartFirstStory";
import { Sparkles, AudioLines, Infinity, Heart } from "lucide-react";
import { T } from "@/components/site-text/T";
import { landing } from "@/content/texts/landing";

export default function ValuePropositionSection() {
  const startFirstStory = useStartFirstStory();
  
  const features = [
    {
      icon: Heart,
      title: landing["value.feature1.title"],
      description: landing["value.feature1.text"],
    },
    {
      icon: Sparkles,
      title: landing["value.feature2.title"],
      description: landing["value.feature2.text"],
    },
    {
      icon: AudioLines,
      title: landing["value.feature3.title"],
      description: landing["value.feature3.text"],
    },
    {
      icon: Infinity,
      title: landing["value.feature4.title"],
      description: landing["value.feature4.text"],
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
          <T t={landing["value.title"]} />
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-16"
        >
          <T t={landing["value.subtitle"]} />
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
                      <T t={feature.title} />
                    </h3>
                    <p className="text-[15px] leading-relaxed"><T t={feature.description} /></p>
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
                data-analytics-cta="value-proposition" onClick={startFirstStory}
                size="lg"
                className="landing-primary-button"
              >
                <T t={landing["value.cta"]} />
              </Button>
            </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-lg md:text-xl text-amber-700 text-center italic"
        >
          <T t={landing["value.closing"]} />
        </motion.p>
      </div>
    </section>
  );
}
