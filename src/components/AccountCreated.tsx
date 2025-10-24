"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Mail, Clock, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface AccountCreatedProps {
  onClose: () => void;
}

export default function AccountCreated({ onClose }: AccountCreatedProps) {
  const { user } = useAuth();
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);

  // Prüfe, ob E-Mail bestätigt wurde
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      setIsEmailConfirmed(true);
    }
  }, [user]);

  // Prüfe URL-Parameter für E-Mail-Bestätigung
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const confirmed = urlParams.get('confirmed');
      
      if (confirmed === 'true') {
        setIsEmailConfirmed(true);
        // Automatisch schließen nach 3 Sekunden
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    }
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" suppressHydrationWarning>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-amber-900 mb-4">
            Account erstellt! 🎉
          </h1>
          
          {!isEmailConfirmed ? (
            <p className="text-amber-700 text-lg">
              Bitte prüfe deine E-Mails und klicke auf den Bestätigungslink.
            </p>
          ) : (
            <p className="text-amber-700 text-lg">
              Account bestätigt! Du kannst diesen Tab schließen.
            </p>
          )}
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200"
        >
          {!isEmailConfirmed ? (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold text-amber-900 mb-4">
                E-Mail-Bestätigung erforderlich
              </h2>
              
              <p className="text-amber-700 mb-6">
                Wir haben dir eine E-Mail mit einem Bestätigungslink gesendet. 
                Bitte klicke auf den Link, um deinen Account zu aktivieren.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Nächste Schritte:</span>
                </div>
                <ul className="text-blue-700 mt-2 space-y-1">
                  <li>1. Prüfe dein E-Mail-Postfach</li>
                  <li>2. Klicke auf den Bestätigungslink</li>
                  <li>3. Du wirst automatisch zum Dashboard weitergeleitet</li>
                </ul>
              </div>
              
              <p className="text-sm text-amber-600">
                Du kannst diesen Tab schließen, sobald du deine E-Mail bestätigt hast.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold text-amber-900 mb-4">
                Account bestätigt! ✅
              </h2>
              
              <p className="text-amber-700 mb-6">
                Dein Account wurde erfolgreich bestätigt. 
                Du wirst automatisch zum Dashboard weitergeleitet.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Alles bereit!</span>
                </div>
                <p className="text-green-700 mt-2">
                  Deine Ressource wurde gespeichert und ist im Dashboard verfügbar.
                </p>
              </div>
              
              <p className="text-sm text-amber-600">
                Du kannst diesen Tab schließen.
              </p>
            </div>
          )}
        </motion.div>

        {/* Close Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8"
        >
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <X className="w-5 h-5" />
            Tab schließen
          </button>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
