// Email-Verification-Modal für Replay/Speichern (Variante 3C)
"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function EmailVerificationModal({
  isOpen,
  onClose,
  onVerified,
}: EmailVerificationModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  const supabase = createSPAClient();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/`,
        },
      });

      if (signInError) {
        setError(signInError.message || 'Fehler beim Senden der E-Mail');
        return;
      }

      setSuccess(true);
      setShowOtpInput(true);
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const otpToken = otp.trim().replace(/\s/g, '');

      if (otpToken.length !== 6) {
        setError('Bitte geben Sie einen 6-stelligen Code ein');
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpToken,
        type: 'email',
      });

      if (verifyError) {
        // Versuche auch magiclink type
        const { error: magicLinkError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpToken,
          type: 'magiclink',
        });

        if (magicLinkError) {
          setError(magicLinkError.message || 'Ungültiger Code');
          return;
        }
      }

      // Erfolgreich verifiziert: Speichere Cookie
      document.cookie = `email_verified=true; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
      
      // Callback aufrufen
      onVerified();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailVerified = () => {
    if (typeof document === 'undefined') return false;
    return document.cookie.includes('email_verified=true');
  };

  // Prüfe beim Öffnen, ob bereits verifiziert
  if (isOpen && isEmailVerified()) {
    onVerified();
    onClose();
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                E-Mail bestätigen
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!showOtpInput ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <p className="text-gray-600">
                  Um Audio erneut abzuspielen und zu speichern, bestätigen Sie bitte Ihre E-Mail-Adresse.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="ihre@email.de"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Wird gesendet...' : 'Code senden'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                {success && (
                  <div className="flex items-center gap-2 text-green-600 text-sm mb-4">
                    <CheckCircle className="w-4 h-4" />
                    <span>Code wurde an {email} gesendet</span>
                  </div>
                )}

                <p className="text-gray-600">
                  Bitte geben Sie den 6-stelligen Code aus Ihrer E-Mail ein.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bestätigungscode
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center text-2xl tracking-widest"
                    placeholder="000000"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpInput(false);
                      setOtp('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Zurück
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || otp.length !== 6}
                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Wird geprüft...' : 'Bestätigen'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

