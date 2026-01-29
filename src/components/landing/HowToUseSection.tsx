"use client";

import { motion } from "framer-motion";
import { Clock, Headphones, RefreshCw, Target } from "lucide-react";

export default function HowToUseSection() {
  const tips = [
    {
      icon: Clock,
      title: "Use when you feel stressed",
      description: "Perfect for moments of overwhelm, anxiety, or when you're feeling stuck",
      color: "from-[#FC8728] to-[#FC8728]/70",
    },
    {
      icon: Headphones,
      title: "Don't multitask",
      description: "Sit or lie down and actually listen — give yourself this time",
      color: "from-[#99AF67] to-[#99AF67]/70",
    },
    {
      icon: RefreshCw,
      title: "Reuse the same resource",
      description: "Build familiarity by returning to resources that work for you",
      color: "from-[#8B644D] to-[#8B644D]/70",
    },
    {
      icon: Target,
      title: "Mental reset button",
      description: "Think of it as a quick reset, not a miracle cure",
      color: "from-[#4F3421] to-[#4F3421]/70",
    },
  ];

  return (
    <section className="relative py-20 lg:py-32 bg-white overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 lg:mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block bg-[#E9DDD6] text-[#4F3421] text-sm lg:text-base px-6 py-3 rounded-full font-semibold mb-6"
          >
            Real Advice
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#4F3421] mb-6">
            How to Use It Best
          </h2>
          <p className="text-lg lg:text-xl text-[#4F3421]/70 max-w-2xl mx-auto">
            Get the most out of your experience with these practical tips
          </p>
        </motion.div>

        {/* Tips Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {tips.map((tip, index) => (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.05 }}
              className="bg-gradient-to-br from-white to-[#E9DDD6]/30 rounded-3xl p-6 lg:p-8 shadow-xl border border-[#4F3421]/10 text-center"
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className={`w-16 h-16 bg-gradient-to-br ${tip.color} rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-lg`}
              >
                <tip.icon className="w-8 h-8 text-white" />
              </motion.div>

              <h3 className="text-lg lg:text-xl font-bold text-[#4F3421] mb-3">
                {tip.title}
              </h3>
              <p className="text-sm lg:text-base text-[#4F3421]/70 leading-relaxed">
                {tip.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
