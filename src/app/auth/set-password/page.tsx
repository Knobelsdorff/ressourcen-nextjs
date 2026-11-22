"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSPAClient } from "@/lib/supabase/client";
import WellnessMark from '@/components/WellnessMark';
import { T, useTextFn } from "@/components/site-text/T";
import { account } from "@/content/texts/account";

// Verhindere Prerendering/Static Export für diese Seite
export const dynamic = 'force-dynamic';

function SetPasswordInner() {
  const supabase = createSPAClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tx = useTextFn();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [resourceId, setResourceId] = useState<string | null>(null);

  // Check user session and extract resource_id
  useEffect(() => {
    const checkSession = async () => {
      try {
        // User should already be authenticated via recovery link
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData?.session?.user) {
          console.error('[Set Password] No active session:', sessionError);
          setError(tx(account["setPassword.noSession"]));
          setReady(true);
          return;
        }

        console.log('[Set Password] User authenticated, showing password setup form');

        // Extract resource_id from user metadata if available
        if (sessionData.session.user.user_metadata?.resource_id) {
          setResourceId(sessionData.session.user.user_metadata.resource_id);
          console.log('[Set Password] Resource ID from session:', sessionData.session.user.user_metadata.resource_id);
        }

        // Check if user already has password set
        if (sessionData.session.user.user_metadata?.password_set === true) {
          console.log('[Set Password] User already has password set, redirecting to dashboard');
          const dashboardUrl = resourceId ? `/dashboard?resource=${resourceId}` : '/dashboard';
          router.push(dashboardUrl);
          return;
        }

        setSessionValid(true);
        setReady(true);
      } catch (e) {
        console.error('[Set Password] Error checking session:', e);
        setError(tx(account["setPassword.sessionError"]));
        setReady(true);
      }
    };

    checkSession();
  }, [supabase, router, resourceId, tx]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 6) {
      setError(tx(account["common.passwordTooShort"]));
      return;
    }
    if (password !== confirm) {
      setError(tx(account["common.passwordMismatch"]));
      return;
    }

    try {
      setSubmitting(true);

      // Setze Passwort und markiere als eingerichtet
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          password_set: true,
          password_set_at: new Date().toISOString()
        }
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        // Zugangslink entwerten – ab jetzt gilt die Passwort-Anmeldung.
        try {
          await fetch('/api/auth/complete-password-setup', { method: 'POST' });
        } catch (e) {
          console.warn('[Set Password] Zugangslink konnte nicht entwertet werden:', e);
        }

        setMessage(tx(account["setPassword.success"]));

        // Weiterleitung zum Dashboard mit resource falls vorhanden
        setTimeout(() => {
          const dashboardUrl = resourceId
            ? `/dashboard?resource=${resourceId}`
            : '/dashboard';
          window.location.href = dashboardUrl;
        }, 1500);
      }
    } catch (e) {
      setError(tx(account["setPassword.failed"]));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center wellness-page-background p-4">
      <div className="wellness-auth-card w-full max-w-md bg-white border border-orange-200 rounded-2xl p-8 shadow-xl">
        <WellnessMark />
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary-900 mb-2">
            <T t={account["setPassword.title"]} />
          </h1>
          <p className="text-primary-700">
            <T t={account["setPassword.text"]} />
          </p>
          <p className="text-primary-600 text-sm mt-3">
            <T t={account["setPassword.bookmark"]} />
          </p>
        </div>

        {!ready && (
          <div className="mb-4 p-4 rounded-lg bg-primary-50 border border-primary-200 text-primary-800 text-sm">
            <T t={account["setPassword.checking"]} />
          </div>
        )}

        {message && (
          <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
        )}

        {error && (
          <div role="alert" className="mb-4 p-4 rounded-lg bg-red-50 border border-red-300 text-red-800 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-5">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-primary-900 mb-2">
              <T t={account["common.newPassword"]} />
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder={tx(account["setPassword.newPlaceholder"])}
              autoComplete="new-password"
              required
              disabled={!ready || !sessionValid || submitting}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-primary-900 mb-2">
              <T t={account["common.confirmPassword"]} />
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder={tx(account["setPassword.confirmPlaceholder"])}
              autoComplete="new-password"
              required
              disabled={!ready || !sessionValid || submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !ready || !sessionValid}
            className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            <T t={submitting ? account["setPassword.saving"] : account["setPassword.save"]} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-primary-700">
          <T t={account["setPassword.after"]} />
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center wellness-page-background p-4">
        <div className="text-primary-900 text-lg"><T t={account["common.loading"]} /></div>
      </div>
    }>
      <SetPasswordInner />
    </Suspense>
  );
}
