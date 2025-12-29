"use client";

import { motion } from "framer-motion";
import { Check, Headphones, Infinity, Sparkles, Star, Users, Zap } from "lucide-react";

export default function WhatMakesDifferentSection() {
  const features = [
    {
      icon: Sparkles,
      title: "Fully Personalized",
      description: "Not pre-written scripts — every story is unique to you",
      benefit: "Your exact needs, every time",
    },
    {
      icon: Infinity,
      title: "AI-Generated Stories",
      description: "Infinite possibilities, never the same experience twice",
      benefit: "Never gets boring or repetitive",
    },
    {
      icon: Headphones,
      title: "Audio Guidance",
      description: "Not just text — immersive audio experiences you can feel",
      benefit: "Close your eyes and listen",
    },
    {
      icon: Users,
      title: "Real or Imaginary Resources",
      description: "Works with actual people, fictional characters, or pure imagination",
      benefit: "Total creative freedom",
    },
    {
      icon: Zap,
      title: "Anytime, Anywhere",
      description: "No therapist appointment needed — instant access 24/7",
      benefit: "Help when you need it most",
    },
    {
      icon: Star,
      title: "Science Meets Technology",
      description: "Trauma-informed techniques powered by modern AI",
      benefit: "Proven methods, new delivery",
    },
  ];

  return (
    <section className="relative py-20 lg:py-32 bg-gradient-to-br from-[#E9DDD6] via-white to-[#E9DDD6] overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#FC8728]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-[#99AF67]/10 rounded-full blur-3xl" />

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
            Truly Unique Technology
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#4F3421] mb-6">
            What Makes This App{" "}
            <span className="bg-gradient-to-r from-[#FC8728] to-[#8B644D] bg-clip-text text-transparent">
              Different
            </span>
          </h2>
          <p className="text-lg lg:text-xl text-[#4F3421]/70 max-w-3xl mx-auto">
            Not another meditation app. Not a chatbot. Something completely new.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.03 }}
              className="relative bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-[#4F3421]/10 overflow-hidden group"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FC8728]/0 to-[#FC8728]/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-[#FC8728] to-[#8B644D] rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                >
                  <feature.icon className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
                </motion.div>

                <h3 className="text-xl lg:text-2xl font-bold text-[#4F3421] mb-3">
                  {feature.title}
                </h3>
                <p className="text-base text-[#4F3421]/70 mb-4 leading-relaxed">
                  {feature.description}
                </p>

                <div className="flex items-start gap-2 bg-[#E9DDD6]/50 rounded-xl p-3">
                  <Check className="w-5 h-5 text-[#FC8728] flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-[#4F3421]">
                    {feature.benefit}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-16 lg:mt-24 text-center"
        >
          <div className="bg-gradient-to-br from-[#4F3421] to-[#8B644D] rounded-3xl p-8 lg:p-12 shadow-2xl">
            <motion.h3
              initial={{ scale: 0.9 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", delay: 0.7 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4"
            >
              Traditional Self-Help vs. Our App
            </motion.h3>
            <div className="grid sm:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-white/70 font-semibold mb-3 text-sm">Traditional Approach</div>
                <ul className="space-y-2 text-white/60 text-sm">
                  <li>❌ Generic advice</li>
                  <li>❌ One-size-fits-all scripts</li>
                  <li>❌ Requires sitting still</li>
                  <li>❌ Same content repeated</li>
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#FC8728]">
                <div className="text-[#FC8728] font-bold mb-3 text-sm">Our App</div>
                <ul className="space-y-2 text-white text-sm font-medium">
                  <li>✅ Personalized for you</li>
                  <li>✅ AI-generated uniqueness</li>
                  <li>✅ Just listen and relax</li>
                  <li>✅ Infinite variations</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
