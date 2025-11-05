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
      console.log('Paywall: Creating checkout session for user:', user.id);
      const result = await createCheckoutSession(user.id);

      if (!result) {
        console.error('Paywall: Checkout session creation returned null');
        setError('Fehler beim Erstellen der Checkout-Session. Bitte versuche es erneut.');
        setLoading(false);
        return;
      }

      if (!result.url) {
        console.error('Paywall: Checkout session has no URL:', result);
        setError('Fehler beim Erstellen der Checkout-Session. Bitte versuche es erneut.');
        setLoading(false);
        return;
      }

      console.log('Paywall: Redirecting to Stripe Checkout:', result.url);
      // Weiterleitung zu Stripe Checkout
      window.location.href = result.url;
    } catch (err: any) {
      console.error('Paywall: Checkout error:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>

          <h2 className="text-2xl font-bold text-amber-900 mb-2">
            Zugang aktivieren
          </h2>

          {message && (
            <p className="text-amber-700 mb-6">{message}</p>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <div className="text-left space-y-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">2 weitere Ressourcen</p>
                  <p className="text-sm text-amber-700">Deine kostenlose 3-Tage-Trial-Periode ist abgelaufen. Erstelle 2 weitere Ressourcen (insgesamt 3 Ressourcen).</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">3 Monate Zugang</p>
                  <p className="text-sm text-amber-700">Täglich nutzbar, wann immer du willst</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Professionelle Audio-Stimmen</p>
                  <p className="text-sm text-amber-700">Premium-Qualität für jede Ressource</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-4xl font-bold text-amber-900">179€</span>
              <span className="text-amber-600">einmalig</span>
            </div>
            <p className="text-sm text-amber-700">
              Statt 1,5 Sitzungen (330€) nur 179€
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Sitzungszeit für tiefere Arbeit nutzen
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                disabled={loading}
              >
                Später
              </button>
            )}
            <button
              onClick={handleCheckout}
              disabled={loading || !user}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Wird geladen...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Jetzt aktivieren
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Sichere Zahlung über Stripe
          </p>
        </div>
      </motion.div>
    </div>
  );
}

