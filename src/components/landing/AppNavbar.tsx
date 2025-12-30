"use client";

import { motion } from "framer-motion";

export default function AppNavbar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4">
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[1400px] mt-4 bg-[#4F3421] rounded-full shadow-2xl"
      >
        <div className="px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Left - Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center"
            >
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                Ressourcen
              </h1>
            </motion.div>

            {/* Right - Login Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "#FC8728" }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#8B644D] text-white px-5 py-2 lg:px-6 lg:py-2.5 rounded-full font-semibold text-sm hover:bg-[#FC8728] transition-colors"
              >
                Login
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.nav>
    </div>
  );
}
