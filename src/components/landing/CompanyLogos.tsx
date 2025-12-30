"use client";

import { motion } from "framer-motion";

export default function CompanyLogos() {
  const companies = [
    { name: "REGENERON", color: "text-orange-600" },
    { name: "Lilly", color: "text-red-600", isScript: true },
    { name: "GILEAD", color: "text-orange-600" },
    { name: "AstraZeneca", color: "text-purple-600", isScript: true },
  ];

  return (
    <section className="relative py-12 sm:py-16 bg-gradient-to-br from-orange-100 via-orange-200 to-orange-300 overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="w-full h-full opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <span className="text-sm sm:text-base text-orange-800 font-medium">
            Our Singular Purpose
          </span>
        </motion.div>

        {/* Company Logos Grid */}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16">
          {companies.map((company, index) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.1, y: -5 }}
              className="cursor-pointer"
            >
              <span
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${company.color} ${
                  company.isScript ? "font-serif italic" : "tracking-tight"
                }`}
              >
                {company.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Decorative Icons */}
        <div className="flex items-center justify-center gap-6 mt-12">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ rotate: 180 }}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg"
          >
            <span className="text-orange-600 text-xl">✨</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ rotate: -180 }}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg"
          >
            <span className="text-orange-600 text-xl">📊</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.7 }}
            whileHover={{ rotate: 180 }}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg"
          >
            <span className="text-orange-600 text-xl">💡</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
