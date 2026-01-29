"use client";

import { motion } from "framer-motion";
import { Brain, Heart, Users } from "lucide-react";

export default function WellnessSection() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-white via-orange-50 to-green-50 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-green-200/30 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8 mb-16">
          {/* Main Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight max-w-4xl mx-auto"
          >
            We design empathic{" "}
            <span className="bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              AI Wellness
            </span>
            <br />
            chatbot platform for everyone.
          </motion.h2>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Combining cutting-edge AI technology with genuine empathy to support your mental health journey.
          </motion.p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* Card 1 - Mindful Hours */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Mindful Hours</h3>
            </div>

            <div className="space-y-3">
              <div className="text-3xl font-bold text-gray-900">2.5h/8h Today</div>

              <div className="bg-orange-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Sleep Quality</span>
                  <span className="text-sm font-semibold text-orange-600">Lvl 3</span>
                </div>
                <div className="text-xs text-gray-500">Insomniac (&lt;2h Avg)</div>
              </div>

              <div className="bg-orange-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Mindful Journal</span>
                  <span className="text-sm font-semibold text-orange-600">3 dots</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">Day Streak</div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 - Sleep Quality */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all border border-purple-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Sleep Quality</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Overjoyed</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-lg">😊</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">9:48pm · 12 Days</div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                day! Download the Freud.ai app for innovative solutions.
              </div>

              <button className="text-sm text-orange-600 font-semibold hover:text-orange-700">
                For Professionals →
              </button>
            </div>
          </motion.div>

          {/* Card 3 - AI About */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">AI About</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">100,000+</div>
                  <div className="text-xs text-gray-600">Lives Impacted</div>
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center"
                >
                  ✨
                </motion.div>
              </div>

              <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">$50M</div>
                  <div className="text-xs text-gray-600">Data LLMs Trained</div>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl">
                  📊
                </div>
              </div>

              <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">99.8%</div>
                  <div className="text-xs text-gray-600">Accuracy Rate</div>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl">
                  🎯
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
