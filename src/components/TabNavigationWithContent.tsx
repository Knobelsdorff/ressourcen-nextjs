"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TabNavigationWithContentProps {
  activeTab: 'real' | 'fictional' | 'places';
  onTabChange: (tab: 'real' | 'fictional' | 'places') => void;
  className?: string;
  children?: React.ReactNode;
}

export default function TabNavigationWithContent({ 
  activeTab, 
  onTabChange, 
  className = "",
  children
}: TabNavigationWithContentProps) {
  const tabs = [
    { key: 'real', label: 'Real' },
    { key: 'fictional', label: 'Fiktiv' },
    { key: 'places', label: 'Orte' }
  ] as const;

  return (
    <div className={`bg-white ${className}`}>
      {/* Tab Navigation */}
      <div className="flex justify-center pt-6 pb-0">
        <div className="flex space-x-6">
          {tabs.map(({ key, label }) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTabChange(key)}
              className={`px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 ${
                activeTab === key
                  ? 'bg-orange-400 text-white shadow-md'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {label}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Orange line across full width */}
      <div className="w-full h-1 bg-orange-400"></div>
      
      {/* Content Area */}
      <div className="pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
