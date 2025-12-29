"use client";

import { motion } from "framer-motion";
import { CheckCircle2, HeadphonesIcon, MessageSquare, Sparkles } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: Sparkles,
      title: "Choose Your Inner Resource",
      description:
        "Pick a protective figure, safe place, or symbol of strength. Real, fictional, spiritual — fully your choice.",
      color: "from-[#FC8728] to-[#FC8728]/70",
    },
    {
      number: "02",
      icon: MessageSquare,
      title: "Answer a Few Questions",
      description:
        "Tell us how you want to feel, what you need right now, and what gives you a sense of safety or power.",
      color: "from-[#99AF67] to-[#99AF67]/70",
    },
    {
      number: "03",
      icon: CheckCircle2,
      title: "AI Generates Your Story",
      description:
        "We create a unique guided journey designed to activate security, grounding, confidence, and emotional support.",
      color: "from-[#8B644D] to-[#8B644D]/70",
    },
    {
      number: "04",
      icon: HeadphonesIcon,
      title: "Listen & Reset",
      description:
        "Your personalized story becomes a calm audio experience you can use anytime — especially during stress or anxiety.",
      color: "from-[#4F3421] to-[#4F3421]/70",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 lg:py-32 bg-white overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-[#FC8728]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-[#99AF67]/10 rounded-full blur-3xl" />

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
            className="inline-block bg-[#E9DDD6] text-[#4F3421] text-sm lg:text-base px-6 py-3 rounded-full font-semibold mb-6"
          >
            Simple Process, Powerful Results
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#4F3421] mb-6">
            How It Works
          </h2>
          <p className="text-lg lg:text-xl text-[#4F3421]/70 max-w-2xl mx-auto">
            Four simple steps to regulate your emotions and calm your nervous system
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.15 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="relative bg-gradient-to-br from-white to-[#E9DDD6]/30 rounded-3xl p-8 lg:p-10 shadow-xl border border-[#4F3421]/10 overflow-hidden group"
            >
              {/* Background Number */}
              <div className="absolute top-4 right-4 text-8xl lg:text-9xl font-bold text-[#4F3421]/5 group-hover:text-[#FC8728]/10 transition-colors">
                {step.number}
              </div>

              {/* Icon */}
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className={`w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
              >
                <step.icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </motion.div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-2xl lg:text-3xl font-bold text-[#4F3421] mb-4">
                  {step.title}
                </h3>
                <p className="text-base lg:text-lg text-[#4F3421]/70 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Step Number Badge */}
              <div className="absolute bottom-6 right-6">
                <div className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-[#4F3421]/20">
                  <span className="text-xl font-bold text-[#4F3421]">{index + 1}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="text-center mt-16 lg:mt-24"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-[#FC8728] to-[#FC8728]/90 text-white px-12 py-5 rounded-full font-bold text-lg shadow-2xl hover:shadow-[#FC8728]/50"
          >
            Start Your First Story →
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
