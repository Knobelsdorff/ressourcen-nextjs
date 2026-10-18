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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#38261966] p-4 backdrop-blur-[5px]"
      suppressHydrationWarning
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-success-title"
        initial={{ scale: 0.97, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-[30px] border border-[#e4ded6] bg-[#fdfbf8] p-8 shadow-[0_24px_90px_#38261930]"
      >
        <div className="text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e5ebd8]"
          >
            <CheckCircle className="h-11 w-11 text-[#526735]" aria-hidden="true" />
          </motion.div>

          {/* Title */}
          <motion.h2
            id="payment-success-title"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-3 text-2xl font-bold tracking-[-0.035em] text-[#49301e] [font-family:'Trebuchet_MS',Arial,sans-serif]"
          >
            Zahlung erfolgreich!
          </motion.h2>

          {/* Message */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6 leading-relaxed text-[#69594c]"
            role="status"
          >
            {message || "Dein Zugang wurde aktiviert. Die Seite wird automatisch aktualisiert..."}
          </motion.p>

          {/* Loading Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 text-[#857465]"
          >
            <Sparkles className="h-5 w-5 animate-pulse text-[#ff891f]" aria-hidden="true" />
            <span className="text-sm font-medium">Aktualisiere...</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
