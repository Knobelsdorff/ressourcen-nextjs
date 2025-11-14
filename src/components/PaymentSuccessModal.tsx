"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";

interface PaymentSuccessModalProps {
  onClose: () => void;
  message?: string;
}

export default function PaymentSuccessModal({ onClose, message }: PaymentSuccessModalProps) {
  // Automatisch schließen nach 5 Sekunden (ohne automatisches Neuladen)
  // Das Dashboard prüft selbstständig den Zugang und lädt bei Bedarf neu
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
      // Entferne URL-Parameter, um Endlosschleifen zu vermeiden
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment');
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', newUrl.toString());
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" suppressHydrationWarning>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
      >
        <div className="text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 mb-3"
          >
            Zahlung erfolgreich!
          </motion.h2>

          {/* Message */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-6"
          >
            {message || "Dein Zugang wurde aktiviert. Die Seite wird automatisch aktualisiert..."}
          </motion.p>

          {/* Loading Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 text-amber-600"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Aktualisiere...</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

