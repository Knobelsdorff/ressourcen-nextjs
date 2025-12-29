"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface StatsCardProps {
  value: string;
  label: string;
  delay?: number;
  className?: string;
}

export default function StatsCard({ value, label, delay = 0, className = "" }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border border-gray-100 ${className}`}
    >
      <div className="flex items-start justify-between mb-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.3, type: "spring" }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent"
        >
          {value}
        </motion.div>
        <motion.div
          whileHover={{ rotate: 45, scale: 1.2 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
        </motion.div>
      </div>
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{label}</p>
    </motion.div>
  );
}
