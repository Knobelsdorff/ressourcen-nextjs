"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSPAClient } from "@/lib/supabase/client";

// Verhindere Prerendering/Static Export für diese Seite
export const dynamic = 'force-dynamic';

function SetPasswordInner() {
  const supabase = createSPAClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [resourceId, setResourceId] = useState<string | null>(null);

  // Check user session and extract resource_id
  useEffect(() => {
    const checkSession = async () => {
      try {
        // User should already be authenticated via recovery link
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData?.session?.user) {
          console.error('[Set Password] No active session:', sessionError);
          setError('Keine aktive Sitzung gefunden. Bitte klicke erneut auf den Link in deiner Email.');
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

        setReady(true);
      } catch (e) {
        console.error('[Set Password] Error checking session:', e);
        setError('Fehler beim Laden der Sitzung. Bitte versuche es erneut.');
        setReady(true);
      }
    };

    checkSession();
  }, [supabase, router, resourceId]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein");
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
        setMessage("Passwort wurde erfolgreich eingerichtet! Du wirst weitergeleitet...");

        // Weiterleitung zum Dashboard mit resource falls vorhanden
        setTimeout(() => {
          const dashboardUrl = resourceId
            ? `/dashboard?resource=${resourceId}`
            : '/dashboard';
          window.location.href = dashboardUrl;
        }, 1500);
      }
    } catch (e) {
      setError("Passwort konnte nicht gespeichert werden");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4">
      <div className="w-full max-w-md bg-white border border-orange-200 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">
            Willkommen!
          </h1>
          <p className="text-amber-700">
            Bitte richte dein Passwort ein, um fortzufahren.
          </p>
        </div>

        {!ready && (
          <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Prüfe deinen Link...
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
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-300 text-red-800 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Neues Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              placeholder="Mindestens 6 Zeichen"
              autoComplete="new-password"
              required
              disabled={!ready || !!error}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              placeholder="Passwort wiederholen"
              autoComplete="new-password"
              required
              disabled={!ready || !!error}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !ready || !!error}
            className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {submitting ? "Passwort wird eingerichtet..." : "Passwort einrichten"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-amber-700">
          Nach dem Einrichten kannst du dich jederzeit mit deiner E-Mail und diesem Passwort anmelden.
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4">
        <div className="text-amber-900 text-lg">Lade...</div>
      </div>
    }>
      <SetPasswordInner />
    </Suspense>
  );
}
