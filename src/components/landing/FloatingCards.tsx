"use client";

import { motion } from "framer-motion";
import { Activity, Calendar, Heart, MessageCircle, Settings, Sparkles, TrendingUp } from "lucide-react";

export function MoodTrackerCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50, rotate: 5 }}
      animate={{ opacity: 1, x: 0, rotate: 3 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      whileHover={{ rotate: 0, scale: 1.05 }}
      className="absolute top-10 right-10 w-64 sm:w-80 bg-white rounded-3xl shadow-2xl p-6 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-700">Mood Tracker</span>
        <Settings className="w-4 h-4 text-gray-400" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-2xl">😊</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Sad</span>
              <span className="text-xs text-gray-500">Happy</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "75%" }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-yellow-400 to-green-400"
              />
            </div>
            <span className="text-xs text-gray-500 mt-1 block">Neutral</span>
          </div>
        </div>

        <div className="bg-orange-50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Stress Level</span>
            <span className="text-xs text-yellow-600 font-semibold">Level 3 (Normal)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-8 bg-green-400 rounded-full"></div>
            <div className="w-2 h-10 bg-green-400 rounded-full"></div>
            <div className="w-2 h-12 bg-yellow-400 rounded-full"></div>
            <div className="w-2 h-10 bg-yellow-400 rounded-full"></div>
            <div className="w-2 h-8 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ChatCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="absolute bottom-20 right-20 w-72 sm:w-96 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-2xl p-6 border border-orange-200"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">Doctor Freud AI</h4>
          <p className="text-xs text-gray-500">AI Chatbot, Here for You 24</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-gray-600">
            Hi, Doctor. I'm feeling really down lately, and I'm not sure where to start. Can you help me?
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-white">
            Ok, here's the symptoms for me →
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Today</span>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-green-500 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}

export function ActivityCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50, rotate: -5 }}
      animate={{ opacity: 1, x: 0, rotate: -2 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      whileHover={{ rotate: 0, scale: 1.05 }}
      className="absolute top-40 left-10 w-56 sm:w-72 bg-white rounded-3xl shadow-2xl p-5 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-gray-700">Health Journal</span>
        </div>
        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">31/365</span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">How would you</span>
          <span className="text-gray-400">30d</span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex flex-col gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((cell) => (
                <div
                  key={cell}
                  className={`w-3 h-3 rounded-sm ${
                    Math.random() > 0.3 ? 'bg-purple-400' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-purple-400 border-2 border-white flex items-center justify-center text-xs">😊</div>
          <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center text-xs">😐</div>
          <div className="w-6 h-6 rounded-full bg-red-400 border-2 border-white flex items-center justify-center text-xs">😢</div>
        </div>
        <span className="text-xs text-gray-500">I feel neutral</span>
      </div>
    </motion.div>
  );
}

export function HeartRateCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      whileHover={{ scale: 1.05 }}
      className="absolute bottom-32 left-20 w-48 sm:w-60 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-2xl p-5 border border-green-200"
    >
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-5 h-5 text-green-600" />
        <span className="text-sm font-semibold text-gray-700">Heart Rate</span>
      </div>

      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900">95 <span className="text-lg text-gray-500">bpm</span></div>
      </div>

      <div className="flex items-end gap-1 h-16">
        {[60, 75, 85, 95, 90, 80, 70, 75, 85].map((height, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
            className={`flex-1 rounded-t ${
              height > 85 ? 'bg-red-400' : height > 70 ? 'bg-green-400' : 'bg-green-300'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
