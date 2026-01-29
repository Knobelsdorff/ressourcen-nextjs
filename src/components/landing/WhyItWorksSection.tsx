"use client";

import { motion } from "framer-motion";
import { Activity, Brain, Shield, Waves } from "lucide-react";

export default function WhyItWorksSection() {
  return (
    <section id="why-it-works" className="relative py-20 lg:py-32 bg-gradient-to-br from-[#E9DDD6] to-[#99AF67]/20 overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-10 w-32 h-32 border-4 border-[#FC8728]/30 rounded-full" />
        <div className="absolute bottom-1/4 right-10 w-48 h-48 border-4 border-[#99AF67]/30 rounded-full" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FC8728]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 lg:mb-24"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block bg-white/80 backdrop-blur-sm text-[#4F3421] text-sm lg:text-base px-6 py-3 rounded-full font-semibold mb-6 border border-[#4F3421]/20"
          >
            Science-Backed Approach
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#4F3421] mb-6">
            Why It Works
            <span className="block mt-2 text-2xl sm:text-3xl lg:text-4xl text-[#4F3421]/70 font-normal">
              (No Woo-Woo Explanation)
            </span>
          </h2>
          <p className="text-lg lg:text-xl text-[#4F3421]/70 max-w-3xl mx-auto leading-relaxed">
            Your brain and nervous system respond to imagined experiences almost like real ones.
            When the app guides you through a personalized inner story:
          </p>
        </motion.div>

        {/* Main Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {[
            {
              icon: Waves,
              title: "Your stress response slows down",
              description: "Activates parasympathetic nervous system",
              gradient: "from-[#FC8728] to-[#FC8728]/70",
            },
            {
              icon: Shield,
              title: "Your body feels safer",
              description: "Reduces cortisol and fight-or-flight signals",
              gradient: "from-[#99AF67] to-[#99AF67]/70",
            },
            {
              icon: Brain,
              title: "Your thoughts become less chaotic",
              description: "Engages focused attention and narrative processing",
              gradient: "from-[#8B644D] to-[#8B644D]/70",
            },
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              whileHover={{ y: -10, scale: 1.03 }}
              className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-[#4F3421]/10"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className={`w-16 h-16 bg-gradient-to-br ${benefit.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
              >
                <benefit.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl lg:text-2xl font-bold text-[#4F3421] mb-3">
                {benefit.title}
              </h3>
              <p className="text-base text-[#4F3421]/60 font-medium">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Inspired By Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="bg-gradient-to-br from-[#4F3421] to-[#8B644D] rounded-3xl p-8 lg:p-12 text-center shadow-2xl"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Activity className="w-8 h-8 text-[#FC8728]" />
            <h3 className="text-2xl lg:text-3xl font-bold text-white">
              Inspired by Proven Techniques
            </h3>
          </div>
          <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
            {[
              "Trauma Therapy",
              "Guided Imagery",
              "Nervous System Regulation",
              "Internal Family Systems",
              "Somatic Experiencing",
            ].map((technique, index) => (
              <motion.span
                key={technique}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.1, y: -3 }}
                className="bg-white/20 backdrop-blur-sm text-white px-5 py-3 rounded-full text-sm lg:text-base font-semibold border border-white/30"
              >
                {technique}
              </motion.span>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 1 }}
            className="text-white/90 text-base lg:text-lg mt-8 max-w-3xl mx-auto"
          >
            Now made accessible through AI — no therapist appointment needed.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
