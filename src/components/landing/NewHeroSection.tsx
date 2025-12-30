"use client";

import { motion } from "framer-motion";
import StatsCard from "./StatsCard";
import { ActivityCard, ChatCard, HeartRateCard, MoodTrackerCard } from "./FloatingCards";

export default function NewHeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 pt-24 sm:pt-32 pb-16 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-orange-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-green-200/30 to-transparent rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Content */}
          <div className="space-y-8 lg:space-y-10 pt-8">
            {/* Mission Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block bg-white/80 backdrop-blur-sm text-gray-700 text-xs sm:text-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                Our Mission
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                <span className="text-gray-900">Empathic</span>
                <br />
                <span className="text-gray-900">Mental Health</span>
                <br />
                <span className="bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                  AI Companion
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed"
              >
                Step into a world of cutting-edge technology and compassionate care, tailored for your unique needs.
              </motion.p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                Try Demo
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/80 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-full font-semibold text-base border border-gray-200 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Download App
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-8">
              <StatsCard value="100,000+" label="Lives Impacted" delay={0.5} />
              <StatsCard value="$50M" label="Data LLMs Trained" delay={0.6} />
              <StatsCard value="78.2K" label="Advanced AI Models" delay={0.7} />
              <StatsCard value="99.8%" label="Accuracy Rate" delay={0.8} />
            </div>
          </div>

          {/* Right Content - Floating UI Cards */}
          <div className="relative hidden lg:block h-[600px] xl:h-[700px]">
            <MoodTrackerCard />
            <ChatCard />
            <ActivityCard />
            <HeartRateCard />
          </div>
        </div>

        {/* Mobile Floating Cards Preview */}
        <div className="lg:hidden mt-12 relative h-96 sm:h-[500px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-64 sm:w-80 bg-white rounded-3xl shadow-2xl p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700">Mood Tracker</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-2xl">😊</div>
            </div>
            <div className="space-y-2">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "75%" }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="h-full bg-gradient-to-r from-yellow-400 to-green-400"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-72 sm:w-96 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-2xl p-6 border border-orange-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600"></div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Doctor Freud AI</h4>
                <p className="text-xs text-gray-500">AI Chatbot</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <p className="text-xs text-gray-600">How can I help you today?</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
