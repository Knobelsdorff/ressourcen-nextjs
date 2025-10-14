'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight } from 'lucide-react';

interface UserNameInputProps {
  userName: string;
  onUserNameChange: (name: string) => void;
  onNext: () => void;
}

export default function UserNameInput({ userName, onUserNameChange, onNext }: UserNameInputProps) {
  const [inputName, setInputName] = useState(userName);

  const handleNext = () => {
    if (inputName.trim().length > 0) {
      onUserNameChange(inputName.trim());
      onNext();
    }
  };

  const canProceed = inputName.trim().length > 0;

  return (
    <div className="min-h-screen p-4 lg:p-12">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <User className="w-8 h-8 text-white" />
          </motion.div>
          
          <h1 className="text-3xl lg:text-4xl font-light text-amber-900 mb-4">
            Wie heißt du?
          </h1>
          <p className="text-lg text-amber-700 max-w-md mx-auto leading-relaxed">
            Dein Name macht deine Ressource noch persönlicher und wärmer.
          </p>
        </div>

        {/* Input Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-orange-100"
        >
          <div className="space-y-6">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-amber-800 mb-3">
                Dein Name
              </label>
              <input
                id="userName"
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canProceed) {
                    handleNext();
                  }
                }}
                placeholder="Wie soll dich deine Ressource nennen?"
                className="w-full px-6 py-4 text-lg border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder-amber-400"
                autoFocus
              />
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Beispiel:</strong> Wenn du "Markus" eingibst, könnte deine Ressource sagen: 
                "Markus, ich bin immer gerne für dich da und werde dich immer beschützen."
              </p>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center mt-8"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={!canProceed}
            className={`px-8 py-4 rounded-xl text-white shadow-lg transition-all flex items-center gap-3 text-lg font-medium ${
              canProceed
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                : 'bg-amber-300 cursor-not-allowed opacity-60'
            }`}
          >
            Weiter
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
