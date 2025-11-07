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
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'premium'>('standard');

  const handleCheckout = async (planType: 'standard' | 'premium') => {
    if (!user?.id) {
      setError('Bitte melde dich zuerst an.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Paywall] Creating checkout session for user:', user.id, 'planType:', planType);
      const result = await createCheckoutSession(user.id, planType);

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
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative my-8"
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>

          <h2 className="text-2xl font-bold text-amber-900 mb-2">
            Zugang aktivieren
          </h2>

          {/* Early Adopter Badge */}
          <div className="mb-4 inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
            🎉 Early Adopter Preis - 50% Rabatt
          </div>
          <p className="text-sm text-amber-600 mb-4">
            Wir sind noch in der Beta-Phase. Early Adopters erhalten diesen Preis dauerhaft, auch wenn wir später die Preise für neue Kunden erhöhen.
          </p>

          {message && (
            <p className="text-amber-700 mb-6">{message}</p>
          )}

          {/* Plan Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Standard Plan */}
            <div
              onClick={() => setSelectedPlan('standard')}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                selectedPlan === 'standard'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-amber-200 bg-white hover:border-amber-300'
              }`}
            >
              <div className="text-left">
                <h3 className="text-xl font-bold text-amber-900 mb-2">Standard</h3>
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-amber-900">49€</span>
                    <span className="text-amber-600 text-sm">einmalig</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 line-through">99€</span>
                    <span className="text-xs text-green-600 font-semibold">50% Rabatt</span>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Early Adopter Preis - dauerhaft gesichert
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">2 weitere Ressourcen (insgesamt 3)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">3 Monate Zugang</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">Professionelle Audio-Stimmen</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">Streaming (kein Download)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Plan */}
            <div
              onClick={() => setSelectedPlan('premium')}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all relative ${
                selectedPlan === 'premium'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-purple-200 bg-white hover:border-purple-300'
              }`}
            >
              {selectedPlan === 'premium' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  EMPFOHLEN
                </div>
              )}
              <div className="text-left">
                <h3 className="text-xl font-bold text-purple-900 mb-2 flex items-center gap-2">
                  Premium
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </h3>
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-purple-900">79€</span>
                    <span className="text-purple-600 text-sm">einmalig</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 line-through">149€</span>
                    <span className="text-xs text-green-600 font-semibold">47% Rabatt</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    Early Adopter Preis - dauerhaft gesichert
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-purple-700">4 weitere Ressourcen (insgesamt 5)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-purple-700">6 Monate Zugang</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-purple-700">Professionelle Audio-Stimmen</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-semibold text-purple-900">Exklusive Premium-Features</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-purple-700">Streaming (kein Download)</p>
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
              onClick={() => handleCheckout(selectedPlan)}
              disabled={loading || !user}
              className={`flex-1 px-4 py-3 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold ${
                selectedPlan === 'premium'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Wird geladen...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {selectedPlan === 'premium' ? 'Premium aktivieren' : 'Standard aktivieren'}
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

