"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useStartFirstStory } from "@/hooks/useStartFirstStory";
import { T } from "@/components/site-text/T";
import { landing } from "@/content/texts/landing";

export default function ExplanatoryParagraphSection() {
  const startFirstStory = useStartFirstStory();
  return (
    <section 
      id="was-ist-eine-power-story" 
      className="landing-section-plain py-20 px-4 scroll-mt-20 md:scroll-mt-24"
    >
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          <T t={landing["explain.title"]} />
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-8"
        >
          <T t={landing["explain.subtitle"]} />
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="landing-prose prose prose-lg max-w-none text-center mb-12"
        >
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            <T t={landing["explain.p1"]} />
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            <T t={landing["explain.p2"]} />
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            <T t={landing["explain.p3"]} />
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            <T t={landing["explain.p4"]} />
          </p>
          <p className="text-lg md:text-xl leading-relaxed">
            <T t={landing["explain.p5"]} />
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="landing-prose prose prose-lg max-w-none text-center mb-12"
        >
          <p className="text-lg md:text-xl leading-relaxed mb-4 font-semibold">
            <T t={landing["explain.effect.title"]} />
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            <T t={landing["explain.effect.p1"]} />
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            <T t={landing["explain.effect.p2"]} />
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
          <T t={landing["explain.effect.p3"]} />
          </p>
          <p className="text-lg md:text-xl leading-relaxed mb-4">
            <T t={landing["explain.effect.p4"]} />
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
                data-analytics-cta="explanatory" onClick={startFirstStory}
                size="lg"
                className="landing-primary-button"
              >
                <T t={landing["explain.cta"]} />
              </Button>
            </motion.div>
      </div>
    </section>
  );
}
