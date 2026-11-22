"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useStartFirstStory } from "@/hooks/useStartFirstStory";
import Image from "next/image";
import { T, useText } from "@/components/site-text/T";
import { landing } from "@/content/texts/landing";

export default function StakesSection() {
  const startFirstStory = useStartFirstStory();
  
  const imageAlt = useText(landing["stakes.imageAlt"]);
  const stakes = [
    landing["stakes.bullet1"],
    landing["stakes.bullet2"],
    landing["stakes.bullet3"],
    landing["stakes.bullet4"],
  ];

  return (
    <section className="landing-section-plain py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header und Subheader - bleiben oben */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-amber-900 text-center mb-4"
        >
          <T t={landing["stakes.title"]} />
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl md:text-2xl text-amber-700 text-center mb-8 lg:mb-12"
        >
          <T t={landing["stakes.subtitle"]} />
        </motion.p>
      </div>

      {/* Mobile: Bild breitenfüllend - außerhalb des Containers */}
      <div className="lg:hidden w-screen relative left-1/2 -translate-x-1/2 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full"
        >
          <Image
            src="/images/Power-Storys_Stakes_Mobile.webp"
            alt={imageAlt}
            width={1200}
            height={600}
            className="w-full h-auto object-cover"
            priority
          />
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto">

        {/* Desktop: Grid mit Stichpunkten links und Bild rechts */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-12 items-start mb-12">
          {/* Stichpunkte links mit CTA */}
          <div className="space-y-4">
            {stakes.map((stake, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="landing-bullet"
              >
                <span />
                <p className="text-lg"><T t={stake} /></p>
              </motion.div>
            ))}
            {/* Desktop CTA unter Stichpunkten */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="pt-4"
            >
              <Button
                data-analytics-cta="stakes" onClick={startFirstStory}
                size="lg"
                className="landing-primary-button"
              >
                <T t={landing["stakes.cta"]} />
              </Button>
            </motion.div>
          </div>

          {/* Bild rechts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <Image
              src="/images/Power-Storys_Stakes.webp"
              alt={imageAlt}
              width={1200}
              height={600}
              className="rounded-[30px] object-cover w-full"
              priority
            />
          </motion.div>
        </div>

        {/* Mobile: Stichpunkte unter dem Bild */}
        <div className="lg:hidden space-y-4 mb-12">
          {stakes.map((stake, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="landing-bullet"
            >
              <span />
              <p className="text-lg"><T t={stake} /></p>
            </motion.div>
          ))}
        </div>

        {/* Mobile CTA - zentriert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="lg:hidden text-center"
        >
          <Button
            data-analytics-cta="stakes-closing" onClick={startFirstStory}
            size="lg"
            className="landing-primary-button"
          >
            <T t={landing["stakes.cta"]} />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
