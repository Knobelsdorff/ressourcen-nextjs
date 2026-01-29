"use client";

import { motion } from "framer-motion";
import HeroMockUI from "./HeroMockUI";

export default function AppHeroSection() {
  return (
    <section className="relative min-h-screen bg-white pt-20 lg:pt-24 pb-16 overflow-hidden flex justify-center">
      <div className="relative w-full max-w-[1200px] px-4 sm:px-0 lg:px-0">
        {/* Large Semi-Circle on Right - Positioned relative to container */}
      

        <div className="relative grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-8rem)]">
          {/* Left Content */}
          <div className="space-y-8 lg:space-y-10">
            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#4F3421] leading-tight">
                Regulate Your
                <br />
                Emotions Through
                <br />
                <span className="bg-gradient-to-r from-[#FC8728] to-[#8B644D] bg-clip-text text-transparent">
                  AI-Powered Stories
                </span>
              </h1>
            </motion.div>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base sm:text-lg lg:text-xl text-[#4F3421]/70 max-w-xl leading-relaxed"
            >
              Calm your nervous system with personalized guided audio experiences.
              No meditation required.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "#FC8728" }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#4F3421] text-white px-8 py-3.5 rounded-full font-semibold text-base shadow-lg flex items-center justify-center gap-2"
              >
                Try It Free Now
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "#8B644D" }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#4F3421]/10 text-[#4F3421] px-8 py-3.5 rounded-full font-semibold text-base border border-[#4F3421]/20 hover:text-white transition-all"
              >
                Learn More
              </motion.button>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-3 gap-6 pt-2"
            >
              {[
                { value: "2 Min", label: "Average Session" },
                { value: "87%", label: "Feel Calmer" },
                { value: "∞", label: "Unique Stories" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                  className="text-center lg:text-left"
                >
                  <div className="text-3xl lg:text-4xl font-bold text-[#FC8728] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs lg:text-sm text-[#4F3421]/60 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Side - Mock UI */}
          <div className="hidden lg:block">
            <HeroMockUI />
          </div>
        </div>
      </div>
    </section>
  );
}
