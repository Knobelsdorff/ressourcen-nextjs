'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Sparkles } from 'lucide-react';
import { createCheckoutSession } from '@/lib/access';
import { useAuth } from '@/components/providers/auth-provider';

interface PaywallProps {
  onClose?: () => void;
  message?: string;
}

export default function Paywall({ onClose, message }: PaywallProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleCheckout = async () => {
    if (!user?.id) {
      setError('Bitte melde dich zuerst an.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Paywall] Creating subscription checkout session for user:', user.id);
      const result = await createCheckoutSession(user.id, 'subscription');

      if (!result) {
        console.error('[Paywall] Checkout session creation returned null');
        setError('Fehler beim Erstellen der Checkout-Session. Bitte öffne die Browser-Konsole (F12) für Details und versuche es erneut.');
        setLoading(false);
        return;
      }

      if (!result.url) {
        console.error('[Paywall] Checkout session has no URL:', result);
        setError('Fehler beim Erstellen der Checkout-Session. Bitte öffne die Browser-Konsole (F12) für Details und versuche es erneut.');
        setLoading(false);
        return;
      }

      console.log('[Paywall] Redirecting to Stripe Checkout:', result.url);
      // Weiterleitung zu Stripe Checkout
      window.location.href = result.url;
    } catch (err: any) {
      console.error('[Paywall] Checkout error:', err);
      setError(`Ein Fehler ist aufgetreten: ${err.message || 'Unbekannter Fehler'}. Bitte öffne die Browser-Konsole (F12) für Details.`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full sm:p-8 p-4 relative my-8"
      >
        <div className="text-center">
          <div className="mx-auto sm:w-16 sm:h-16 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center sm:mb-4 mb-2">
            <Lock className="sm:w-8 sm:h-8 w-6 h-6 text-amber-600" />
          </div>

          <h2 className="text-2xl md:text-3xl font-light text-amber-900 mb-6">
            Dein persönlicher Raum für innere Ruhe
          </h2>

          {/* Monatliches Abo */}
          <div className="max-w-md mx-auto mb-6">
            <div className="border border-amber-200 bg-white rounded-xl p-6 md:p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-light text-amber-900">15 €</span>
                    <span className="text-amber-600 text-base">/ Monat</span>
                  </div>
                </div>
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-base text-amber-700">Unbegrenzte personalisierte Power Storys</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-base text-amber-700">Zugriff jederzeit</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-base text-amber-700">Monatlich kündbar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex sm:flex-row flex-col-reverse gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors max-sm:text-sm"
                disabled={loading}
              >
                Später
              </button>
            )}
            <button
              onClick={handleCheckout}
              disabled={loading || !user}
              className="flex-1 px-6 py-3 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Wird geladen...
                </>
              ) : (
                "Zugang freischalten"
              )}
            </button>
          </div>

          <p className="text-sm text-amber-600/70 mt-6">
            Du kannst dir Zeit lassen.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

