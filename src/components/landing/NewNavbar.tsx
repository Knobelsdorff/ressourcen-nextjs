"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NewNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              freud.ai
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#mission" className="text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium">
              Our Mission
            </a>
            <a href="#features" className="text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium">
              Features
            </a>
            <a href="#professionals" className="text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium">
              For Professionals
            </a>
            <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2.5 rounded-full font-medium text-sm hover:shadow-lg hover:scale-105 transition-all">
              Try Demo →
            </button>
            <button className="text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium flex items-center gap-1">
              Download App
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden text-gray-700 p-2"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden pb-4 space-y-3 overflow-hidden"
            >
              <a href="#mission" className="block text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium py-2">
                Our Mission
              </a>
              <a href="#features" className="block text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium py-2">
                Features
              </a>
              <a href="#professionals" className="block text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium py-2">
                For Professionals
              </a>
              <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2.5 rounded-full font-medium text-sm">
                Try Demo →
              </button>
              <button className="w-full text-gray-700 hover:text-orange-600 transition-colors text-sm font-medium py-2">
                Download App ↓
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
