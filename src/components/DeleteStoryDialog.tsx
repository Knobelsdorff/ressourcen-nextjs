"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface DeleteStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  storyTitle?: string;
}

export default function DeleteStoryDialog({
  isOpen,
  onClose,
  onConfirm,
  storyTitle
}: DeleteStoryDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-amber-900">
                  Power Story entfernen?
                </h3>
                <button
                  onClick={onClose}
                  className="text-amber-600 hover:text-amber-900 transition-colors p-1"
                  aria-label="Schließen"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <p className="text-amber-700 mb-6 leading-relaxed">
                Diese Power Story wird aus deinem Raum entfernt.
                <br />
                Du kannst jederzeit eine neue erstellen.
              </p>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  Entfernen
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
