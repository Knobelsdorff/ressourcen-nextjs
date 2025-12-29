"use client";

import { motion } from "framer-motion";
import { AlertCircle, Brain, Heart, Shield, Users } from "lucide-react";

export default function WhoItsForSection() {
  const personas = [
    {
      icon: Brain,
      title: "The Overthinker",
      description: "People who overthink or feel mentally overloaded",
      color: "from-[#FC8728] to-[#FC8728]/70",
      quote: "My brain never stops. This helps me actually pause.",
    },
    {
      icon: AlertCircle,
      title: "The Stressed Professional",
      description: "Anyone dealing with anxiety, stress, or emotional pressure",
      color: "from-[#99AF67] to-[#99AF67]/70",
      quote: "Better than any meditation app I've tried.",
    },
    {
      icon: Heart,
      title: "The Meditation Skeptic",
      description: "Users who struggle to relax with traditional meditation",
      color: "from-[#8B644D] to-[#8B644D]/70",
      quote: "I can't sit still and breathe. But I can listen to this.",
    },
    {
      icon: Users,
      title: "The Personal Growth Seeker",
      description: "People who want something personal, not generic self-help content",
      color: "from-[#4F3421] to-[#4F3421]/70",
      quote: "Finally, something made just for me.",
    },
  ];

  return (
    <section id="for-who" className="relative py-20 lg:py-32 bg-white overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-[#FC8728]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-[#99AF67]/5 rounded-full blur-3xl" />

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
            Find Yourself Here
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#4F3421] mb-6">
            Who It's For
          </h2>
          <p className="text-lg lg:text-xl text-[#4F3421]/70 max-w-2xl mx-auto">
            This app is built for real people with real emotions — no spiritual belief required
          </p>
        </motion.div>

        {/* Personas Grid */}
        <div className="grid sm:grid-cols-2 gap-6 lg:gap-8 mb-16">
          {personas.map((persona, index) => (
            <motion.div
              key={persona.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="bg-gradient-to-br from-white to-[#E9DDD6]/40 rounded-3xl p-8 shadow-xl border border-[#4F3421]/10"
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className={`w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br ${persona.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
              >
                <persona.icon className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
              </motion.div>

              <h3 className="text-xl lg:text-2xl font-bold text-[#4F3421] mb-3">
                {persona.title}
              </h3>
              <p className="text-base text-[#4F3421]/70 mb-4 leading-relaxed">
                {persona.description}
              </p>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border-l-4 border-[#FC8728]">
                <p className="text-sm lg:text-base text-[#4F3421]/80 italic">
                  "{persona.quote}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* No Belief Required Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="bg-gradient-to-r from-[#FC8728] to-[#8B644D] rounded-3xl p-8 lg:p-12 text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: 0.6 }}
            className="inline-block bg-white/20 backdrop-blur-sm rounded-full p-4 mb-6"
          >
            <Shield className="w-12 h-12 text-white" />
          </motion.div>
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            No Spiritual Belief Required
          </h3>
          <p className="text-lg lg:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Everything works on a <span className="font-bold underline">psychological level</span>.
            Whether you're religious, spiritual, or completely secular — this app meets you where you are.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
