'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { createCheckoutSession } from '@/lib/access';
import { useAuth } from '@/components/providers/auth-provider';
import { track } from '@/lib/product-analytics/client';

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

    // Funnel: harte Sperre (weitere Story ohne Abo) – kein Soft-Paywall-View.
    track('subscription_cta_clicked', { variant: 'create-limit', location: 'paywall' }, { beacon: true });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#38261966] p-4 backdrop-blur-[5px]">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative my-8 w-full max-w-lg rounded-[30px] border border-[#e4ded6] bg-[#fdfbf8] p-5 shadow-[0_24px_90px_#38261930] sm:p-9"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e5ebd8] sm:h-16 sm:w-16">
            <Lock className="h-6 w-6 text-[#49301e] sm:h-7 sm:w-7" aria-hidden="true" />
          </div>

          <h2
            id="paywall-title"
            className="mb-6 text-2xl font-bold leading-tight tracking-[-0.035em] text-[#49301e] sm:text-3xl [font-family:'Trebuchet_MS',Arial,sans-serif]"
          >
            Dein persönlicher Raum für innere Ruhe
          </h2>

          {/* Monatliches Abo */}
          <div className="mx-auto mb-6 max-w-md">
            <div className="rounded-[26px] border border-[#e4ded6] border-t-[5px] border-t-[#9db36a] bg-white p-6 shadow-[0_4px_18px_#49301e05] md:p-8">
              <div className="mb-6 flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold tracking-[-0.04em] text-[#49301e] [font-family:'Trebuchet_MS',Arial,sans-serif]">15 €</span>
                <span className="text-base text-[#69594c]">/ Monat</span>
              </div>
              <ul className="space-y-4 text-left">
                {[
                  'Unbegrenzte personalisierte Power Storys',
                  'Zugriff jederzeit',
                  'Monatlich kündbar',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#dfe7cd]">
                      <Check className="h-3.5 w-3.5 text-[#49301e]" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <span className="text-base leading-snug text-[#69594c]">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-2xl border border-[#e9bba5] bg-[#fff0e9] p-3">
              <p className="text-sm text-[#8a3b12]">{error}</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {onClose && (
              <button
                onClick={onClose}
                className="min-h-[52px] flex-1 rounded-full border border-[#d9cfc5] px-5 py-3 text-[15px] font-semibold text-[#69594c] transition-colors hover:bg-[#eee9e4] hover:text-[#49301e] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#7952b8] disabled:opacity-50"
                disabled={loading}
              >
                Später
              </button>
            )}
            <button
              onClick={handleCheckout}
              disabled={loading || !user}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-[#49301e] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_3px_0_#38261912] transition-all hover:bg-[#63452e] hover:shadow-[0_5px_14px_#49301e18] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#7952b8] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Wird geladen...
                </>
              ) : (
                'Zugang freischalten'
              )}
            </button>
          </div>

          <p className="mt-6 text-sm text-[#857465]">
            Du kannst dir Zeit lassen.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
