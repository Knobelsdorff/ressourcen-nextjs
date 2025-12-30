"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { faqData, faqCategories } from "@/data/faq";
import AppNavbar from "@/components/landing/AppNavbar";

export default function FAQPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredFAQs = faqData.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-white">
      <AppNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-[#E9DDD6] to-[#99AF67]/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#4F3421] mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-lg sm:text-xl text-[#4F3421]/70 mb-8">
              Everything you need to know about our AI-powered emotional regulation app
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#4F3421]/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-full border-2 border-[#4F3421]/20 focus:border-[#FC8728] focus:outline-none text-[#4F3421] bg-white shadow-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory("All")}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                selectedCategory === "All"
                  ? "bg-[#4F3421] text-white shadow-lg"
                  : "bg-[#E9DDD6] text-[#4F3421] hover:bg-[#8B644D]/20"
              }`}
            >
              All Questions
            </motion.button>
            {faqCategories.map((category) => (
              <motion.button
                key={category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                  selectedCategory === category
                    ? "bg-[#4F3421] text-white shadow-lg"
                    : "bg-[#E9DDD6] text-[#4F3421] hover:bg-[#8B644D]/20"
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredFAQs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-xl text-[#4F3421]/60">
                No questions found. Try a different search term.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="bg-white rounded-2xl border-2 border-[#4F3421]/10 shadow-lg hover:shadow-xl transition-all overflow-hidden"
                >
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#E9DDD6]/30 transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3 mb-1">
                        {faq.category && (
                          <span className="text-xs font-semibold text-[#FC8728] bg-[#FC8728]/10 px-3 py-1 rounded-full">
                            {faq.category}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-[#4F3421]">
                        {faq.question}
                      </h3>
                    </div>
                    <motion.div
                      animate={{ rotate: openId === faq.id ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="w-6 h-6 text-[#4F3421]" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {openId === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pt-2 bg-gradient-to-br from-[#E9DDD6]/30 to-[#99AF67]/10">
                          <p className="text-base sm:text-lg text-[#4F3421]/80 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-[#4F3421] to-[#8B644D]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Still have questions?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Try our app for free and experience it yourself
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-[#4F3421] px-10 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-white/50 transition-all"
            >
              Start Your Free Trial →
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
