"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, Sparkles } from "lucide-react";

export default function FinalCTASection() {
  return (
    <section className="relative py-20 lg:py-32 bg-gradient-to-br from-[#4F3421] via-[#8B644D] to-[#4F3421] overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-10 left-10 w-64 h-64 border-4 border-[#FC8728] rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-10 right-10 w-96 h-96 border-4 border-[#99AF67] rounded-full"
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="space-y-8 lg:space-y-10"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-block"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-[#FC8728] to-[#FC8728]/70 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          {/* Heading */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight"
            >
              Ready to Reset Your
              <br />
              <span className="text-[#FC8728]">Nervous System?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-lg lg:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed"
            >
              Join thousands finding calm through personalized AI-powered stories.
              Your first story is free.
            </motion.p>
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(252, 135, 40, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              className="group bg-gradient-to-r from-[#FC8728] to-[#FC8728]/90 text-white px-12 py-6 rounded-full font-bold text-lg shadow-2xl flex items-center gap-3"
            >
              Start Your Free Story
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-6 h-6" />
              </motion.div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-sm text-white px-12 py-6 rounded-full font-bold text-lg border-2 border-white/30 hover:bg-white/20 transition-all flex items-center gap-3"
            >
              <Download className="w-5 h-5" />
              Download App
            </motion.button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6 lg:gap-8 pt-8"
          >
            {[
              "✓ No credit card required",
              "✓ Works immediately",
              "✓ Private & secure",
            ].map((badge, index) => (
              <motion.span
                key={badge}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                className="text-white/80 text-sm lg:text-base font-medium"
              >
                {badge}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* Bottom Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-16 lg:mt-20 bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20"
        >
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", delay: 0.9 + star * 0.05 }}
              >
                <span className="text-[#FC8728] text-2xl">★</span>
              </motion.div>
            ))}
          </div>
          <p className="text-white/90 text-lg lg:text-xl italic mb-4">
            "I've tried everything — therapy, meditation apps, breathing exercises. This is the first thing that actually works when I'm in the middle of a panic attack."
          </p>
          <p className="text-white/70 text-sm lg:text-base font-semibold">
            — Sarah M., User since 2024
          </p>
        </motion.div>
      </div>
    </section>
  );
}
