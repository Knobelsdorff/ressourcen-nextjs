"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSPAClient } from "@/lib/supabase/client";

// Verhindere Prerendering/Static Export für diese Seite
export const dynamic = 'force-dynamic';

function ResetPasswordInner() {
      const supabase = createSPAClient();
      const searchParams = useSearchParams();
      const [password, setPassword] = useState("");
      const [confirm, setConfirm] = useState("");
      const [message, setMessage] = useState<string | null>(null);
      const [error, setError] = useState<string | null>(null);
      const [submitting, setSubmitting] = useState(false);
      const [ready, setReady] = useState(false);

          // Verarbeite den Reset-Link
          useEffect(() => {
            const run = async () => {
              setError(null);
              const code = searchParams.get("code");
              const tokenHash = searchParams.get("token_hash");
              const email = searchParams.get("email") || undefined; // optional, nur für verifyOtp mit token
              const errorCode = searchParams.get("error_code");
              const errorDescription = searchParams.get("error_description");
              
              try {
                // Explizite Fehler aus Query anzeigen
                if (errorCode) {
                  if (errorCode === 'otp_expired') {
                    setError('Der Reset-Link ist abgelaufen. Bitte fordere einen neuen Link an.');
                  } else {
                    setError(errorDescription || 'Der Reset-Link ist ungültig oder abgelaufen.');
                  }
                  return;
                }

                // Wenn Code vorhanden ist, versuche ihn zu verifizieren
                if (code) {
                  let success = false;
                  let lastError = '';
                  
                  console.log('Reset code found:', code);
                  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
                  
                  // Methode 1: exchangeCodeForSession (funktioniert oft mit ConfirmationURL)
                  try {
                    console.log('Trying exchangeCodeForSession...');
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (!error) {
                      success = true;
                      console.log('exchangeCodeForSession succeeded:', data);
                    } else {
                      lastError = error.message;
                      console.log('exchangeCodeForSession failed:', error.message, error);
                    }
                  } catch (e) {
                    lastError = e instanceof Error ? e.message : 'Unknown error';
                    console.log('exchangeCodeForSession error:', e);
                  }
                  
                  // Methode 2: verifyOtp als Fallback
                  if (!success) {
                    try {
                      console.log('Trying verifyOtp with token_hash...');
                      const { error } = await supabase.auth.verifyOtp({ 
                        type: 'recovery', 
                        token_hash: code 
                      });
                      if (!error) {
                        success = true;
                        console.log('verifyOtp with token_hash succeeded');
                      } else {
                        lastError = error.message;
                        console.log('verifyOtp with token_hash failed:', error.message);
                      }
                    } catch (e) {
                      lastError = e instanceof Error ? e.message : 'Unknown error';
                      console.log('verifyOtp with token_hash error:', e);
                    }
                  }
                  
                  // Methode 3: verifyOtp mit token (benötigt Email)
                  if (!success && email) {
                    try {
                      console.log('Trying verifyOtp with token and email...');
                      const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token: code, email });
                      if (!error) {
                        success = true;
                        console.log('verifyOtp with token+email succeeded');
                      } else {
                        lastError = error.message;
                        console.log('verifyOtp with token+email failed:', error.message);
                      }
                    } catch (e) {
                      lastError = e instanceof Error ? e.message : 'Unknown error';
                      console.log('verifyOtp with token+email error:', e);
                    }
                  }
                  
                  if (!success) {
                    // Zeige spezifische Fehlermeldung
                    if (lastError.includes('code verifier')) {
                      setError('Der Reset-Link ist nicht kompatibel. Bitte öffne den Link im selben Browser, in dem du den Reset angefordert hast.');
                    } else if (lastError.includes('expired') || lastError.includes('invalid')) {
                      setError('Der Reset-Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Link an.');
                    } else {
                      setError(`Reset-Link konnte nicht verifiziert werden: ${lastError}`);
                    }
                  }
                } else if (tokenHash) {
                  const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
                  if (error) {
                    setError(error.message || "Der Reset-Link ist ungültig oder abgelaufen.");
                  }
                } else {
                  // Kein Code vorhanden - zeige Hinweis
                  setError('Kein Reset-Link gefunden. Bitte fordere einen neuen Link an.');
                }
              } catch (e) {
                setError("Der Reset-Link konnte nicht verifiziert werden.");
              } finally {
                setReady(true);
              }
            };
            run();
          }, [searchParams, supabase]);


      const handleUpdate = async (e: React.FormEvent) => {
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
          const { error } = await supabase.auth.updateUser({ password });
          if (error) {
            setError(error.message);
          } else {
            setMessage("Passwort wurde aktualisiert. Du wirst weitergeleitet…");
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1000);
          }
        } catch (e) {
          setError("Aktualisierung fehlgeschlagen");
        } finally {
          setSubmitting(false);
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
          <div className="w-full max-w-md bg-white border border-orange-100 rounded-2xl p-6 shadow">
            <h1 className="text-2xl font-semibold text-amber-900 mb-4">Neues Passwort setzen</h1>
            {!ready && (
              <div className="mb-3 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">Prüfe Reset-Link…</div>
            )}
            {message && (
              <div className="mb-3 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm">{message}</div>
            )}
            {error && (
              <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
            )}
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm text-amber-800 mb-1">Neues Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-amber-800 mb-1">Passwort bestätigen</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !ready}
                className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              >
                {submitting ? "Aktualisiere…" : "Passwort speichern"}
              </button>
            </form>
          </div>
        </div>
      );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">Lade…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}


