"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function HeroMockUI() {
  return (
    <div className="relative w-full h-[600px] flex items-center justify-center px-4">
      {/* Left Peeking Card */}
      <motion.div
        initial={{ opacity: 0, x: -50, rotate: -8 }}
        animate={{ opacity: 1, x: 0, rotate: -6 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-56 bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-200 z-0"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">💖</span>
          <span className="font-semibold text-gray-900 text-sm">Liebende Person</span>
        </div>
        <p className="text-xs text-gray-700 mb-2">
          Was gibt dir Kraft?
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-500 rounded-full px-3 py-1">
            <Check className="w-3 h-3 text-green-600" />
            <span className="text-gray-800">Ihre Liebe</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-300 rounded-full px-3 py-1">
            <div className="w-3 h-3 border border-gray-400 rounded"></div>
            <span className="text-gray-700">Ihr Vertrauen</span>
          </div>
        </div>
      </motion.div>

      {/* Right Peeking Card */}
      <motion.div
        initial={{ opacity: 0, x: 50, rotate: 8 }}
        animate={{ opacity: 1, x: 0, rotate: 6 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-56 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl shadow-xl p-4 border-2 border-green-200 z-0"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs text-green-800 font-medium">Ausgewählt:</div>
            <div className="text-sm font-bold text-amber-900">Schutzengel</div>
          </div>
        </div>
        <button className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-semibold shadow-lg">
          Weiter →
        </button>
      </motion.div>

      {/* Center Main Card - Resource Selection */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="relative bg-white rounded-3xl shadow-2xl overflow-visible z-10 w-full max-w-sm"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-50 via-amber-50 to-orange-50 px-6 py-6 text-center">
          <h3 className="text-xl font-light text-amber-900 mb-1">
            Wähle deine Ressource
          </h3>
          <p className="text-xs text-amber-700">
            Finde was dir Kraft gibt
          </p>
        </div>

        {/* Resource Cards Grid */}
        <div className="p-4 grid grid-cols-2 gap-3 pb-16">
          {/* Card 1 - Angel */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="relative h-32 rounded-2xl shadow-lg border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 text-3xl">
              😇
            </div>
            <div className="absolute bottom-0 left-0 right-0 text-center p-2">
              <div className="font-bold text-yellow-900 text-xs mb-0.5">
                Schutzengel
              </div>
              <div className="text-[10px] text-yellow-800 leading-tight">
                Dein himmlischer Beschützer
              </div>
            </div>
          </motion.div>

          {/* Card 2 - Heart */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="relative h-32 rounded-2xl shadow-lg border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 text-3xl">
              💖
            </div>
            <div className="absolute bottom-0 left-0 right-0 text-center p-2">
              <div className="font-bold text-yellow-900 text-xs mb-0.5">
                Liebende Person
              </div>
              <div className="text-[10px] text-yellow-800 leading-tight">
                Jemand der dich liebt
              </div>
            </div>
          </motion.div>

          {/* Card 3 - Place */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="relative h-32 rounded-2xl shadow-lg border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 text-3xl">
              🏠
            </div>
            <div className="absolute bottom-0 left-0 right-0 text-center p-2">
              <div className="font-bold text-yellow-900 text-xs mb-0.5">
                Sicherer Ort
              </div>
              <div className="text-[10px] text-yellow-800 leading-tight">
                Dein Rückzugsort
              </div>
            </div>
          </motion.div>

          {/* Card 4 - Custom */}
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="relative h-32 rounded-2xl shadow-lg border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 text-3xl">
              ➕
            </div>
            <div className="absolute bottom-0 left-0 right-0 text-center p-2">
              <div className="font-bold text-blue-900 text-xs mb-0.5">
                Custom
              </div>
              <div className="text-[10px] text-blue-800 leading-tight">
                Erstelle deine eigene
              </div>
            </div>
          </motion.div>
        </div>

        {/* Selection Footer - Floating */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute -bottom-3 left-3 right-3 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 shadow-xl rounded-2xl p-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-green-800 font-medium">Deine Ressource:</div>
                <div className="text-xs font-bold text-amber-900">😇 Schutzengel</div>
              </div>
            </div>
            <button className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-semibold shadow-lg">
              Weiter →
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
