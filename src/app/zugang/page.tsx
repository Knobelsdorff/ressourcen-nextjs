"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { createSPAClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Clock, Check } from "lucide-react";

type Methode = "link" | "passwort";

function getSafeReturnTo(param: string | null): string {
  if (!param || !param.startsWith('/') || param.startsWith('//')) {
    return '/dashboard';
  }
  return param;
}

function ZugangPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const { user } = useAuth();
  // Gesetzt, wenn jemand über einen abgelaufenen Zugangslink hierher kam.
  const linkFehler = searchParams.get('fehler');
  const [zeigeLinkHinweis, setZeigeLinkHinweis] = useState(!!linkFehler);

  // Aktive Anmelde-Methode. Magic-Link ist der Normalfall.
  const [methode, setMethode] = useState<Methode>("link");
  // Bestätigung nach dem Versand des Zugangslinks
  const [linkGesendet, setLinkGesendet] = useState(false);
  // Bestätigung nach dem Versand des Passwort-Reset-Links
  const [resetGesendet, setResetGesendet] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(returnTo);
    }
  }, [user, router, returnTo]);

  // Beim Wechsel der Methode alte Meldungen verwerfen, damit ein Fehler
  // nie neben dem Formular steht, zu dem er nicht gehört.
  const wechsleMethode = (neu: Methode) => {
    setMethode(neu);
    setError("");
    setResetGesendet(false);
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        setError("Bitte gib eine gültige E-Mail-Adresse ein.");
        setIsLoading(false);
        return;
      }

      // Nach einem abgelaufenen Zugangslink: neuen Langzeit-Link anfordern
      // statt eines 24h-Codes – sonst landet die Person gleich wieder hier.
      if (zeigeLinkHinweis) {
        const res = await fetch("/api/auth/request-access-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Fehler beim Senden des Zugangslinks.");
          setIsLoading(false);
          return;
        }

        setLinkGesendet(true);
        setIsLoading(false);
        return;
      }

      const supabase = createSPAClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}${returnTo}`;

      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
        },
      });

      if (magicLinkError) {
        setError(magicLinkError.message || "Fehler beim Senden des Zugangslinks.");
        setIsLoading(false);
        return;
      }

      setLinkGesendet(true);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        setError("Bitte gib eine gültige E-Mail-Adresse ein.");
        setIsLoading(false);
        return;
      }

      if (!password) {
        setError("Bitte gib dein Passwort ein.");
        setIsLoading(false);
        return;
      }

      const supabase = createSPAClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (signInError) {
        setError(signInError.message || "E-Mail oder Passwort falsch.");
        setIsLoading(false);
        return;
      }

      router.push(returnTo);
    } catch (err: any) {
      setError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Bitte gib zuerst deine E-Mail-Adresse ein.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const supabase = createSPAClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/reset?email=${encodeURIComponent(normalizedEmail)}`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || "Fehler beim Senden des Reset-Links.");
        setIsLoading(false);
        return;
      }

      // Inline-Bestätigung statt blockierendem alert()
      setResetGesendet(true);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-2xl shadow-lg sm:p-10 p-6"
        >
          {linkGesendet ? (
            /* ---------- Bestätigung: Link ist unterwegs ---------- */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail className="w-7 h-7 text-amber-700" />
              </div>
              <h1 className="text-2xl font-medium text-amber-900 mb-3">
                Link ist unterwegs
              </h1>
              <p className="text-amber-800 leading-relaxed mb-2">
                Wir haben den Zugangslink an{" "}
                <span className="font-medium break-all">{email.toLowerCase().trim()}</span>{" "}
                geschickt.
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                Öffne ihn am besten auf diesem Gerät. Manchmal landet er im Spam-Ordner.
              </p>

              <div className="mt-8 pt-6 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => {
                    setLinkGesendet(false);
                    setZeigeLinkHinweis(false);
                    setError("");
                  }}
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium transition-colors"
                >
                  Andere E-Mail-Adresse verwenden
                </button>
              </div>
            </motion.div>
          ) : (
            /* ---------- Anmeldung ---------- */
            <>
              <h1 className="sm:text-3xl text-2xl font-medium text-amber-900 mb-2">
                Dein Zugang
              </h1>
              <p className="text-amber-800 leading-relaxed sm:mb-8 mb-6">
                {zeigeLinkHinweis
                  ? "Kein Problem – wir schicken dir einfach einen neuen Link."
                  : "Melde dich an, um zu deinen Power Storys zu gelangen."}
              </p>

              {/* Hinweis nach einem abgelaufenen oder ungültigen Zugangslink */}
              <AnimatePresence initial={false}>
                {zeigeLinkHinweis && (
                  <motion.div
                    key="link-hinweis"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 bg-amber-50 border border-amber-400 rounded-lg p-4 mb-6">
                      <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-900 leading-relaxed">
                        <p className="font-medium mb-1">
                          {linkFehler === "fehler"
                            ? "Dieser Link konnte nicht geöffnet werden."
                            : "Dieser Link ist nicht mehr gültig."}
                        </p>
                        <p className="text-amber-800">
                          Gib unten deine E-Mail-Adresse ein – du bekommst sofort einen neuen Zugang.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Methoden-Umschalter */}
              <div
                role="tablist"
                aria-label="Anmelde-Methode"
                className="grid grid-cols-2 gap-1 p-1 bg-amber-50 border border-amber-200 rounded-lg mb-6"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={methode === "link"}
                  onClick={() => wechsleMethode("link")}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    methode === "link"
                      ? "bg-white text-amber-900 shadow-sm"
                      : "text-amber-700 hover:text-amber-900"
                  }`}
                >
                  Per E-Mail-Link
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methode === "passwort"}
                  onClick={() => wechsleMethode("passwort")}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    methode === "passwort"
                      ? "bg-white text-amber-900 shadow-sm"
                      : "text-amber-700 hover:text-amber-900"
                  }`}
                >
                  Mit Passwort
                </button>
              </div>

              {/* Fehlermeldung – gehört immer zum gerade sichtbaren Formular */}
              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      role="alert"
                      className="p-3 mb-5 bg-amber-50/70 border border-amber-500 rounded-lg"
                    >
                      <p className="text-sm text-amber-900">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {methode === "link" ? (
                  /* ---------- Magic Link ---------- */
                  <motion.form
                    key="link"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={handleMagicLinkSubmit}
                  >
                    <div className="mb-5">
                      <Label htmlFor="email" className="text-amber-900 mb-2 block">
                        E-Mail-Adresse
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="deine@email.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full py-6 text-base border-amber-400 text-amber-900 placeholder:text-amber-500/60 focus-visible:ring-amber-700"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full bg-amber-700 hover:bg-amber-800 text-white py-6 text-base disabled:bg-amber-200 disabled:text-amber-500"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Wird gesendet...
                        </>
                      ) : (
                        zeigeLinkHinweis ? "Neuen Link anfordern" : "Zugangslink senden"
                      )}
                    </Button>

                    <p className="text-sm text-amber-700 text-center mt-4 leading-relaxed">
                      Du bekommst eine E-Mail mit einem Link.
                      <br />
                      Kein Passwort nötig.
                    </p>
                  </motion.form>
                ) : (
                  /* ---------- Passwort ---------- */
                  <motion.form
                    key="passwort"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={handlePasswordLogin}
                  >
                    <div className="mb-4">
                      <Label htmlFor="password-email" className="text-amber-900 mb-2 block">
                        E-Mail-Adresse
                      </Label>
                      <Input
                        id="password-email"
                        type="email"
                        autoComplete="email"
                        placeholder="deine@email.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full border-amber-400 text-amber-900 placeholder:text-amber-500/60 focus-visible:ring-amber-700"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="password" className="text-amber-900 mb-2 block">
                        Passwort
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full border-amber-400 text-amber-900 placeholder:text-amber-500/60 focus-visible:ring-amber-700"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor="remember"
                          className="text-sm text-amber-800 cursor-pointer"
                        >
                          Angemeldet bleiben
                        </Label>
                      </div>

                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={isLoading}
                        className="text-sm text-amber-700 hover:text-amber-900 transition-colors disabled:opacity-50"
                      >
                        Passwort vergessen?
                      </button>
                    </div>

                    {/* Bestätigung des Reset-Links */}
                    <AnimatePresence initial={false}>
                      {resetGesendet && (
                        <motion.div
                          key="reset-ok"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-start gap-2.5 p-3 mb-5 bg-amber-50 border border-amber-400 rounded-lg">
                            <Check className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-900 leading-relaxed">
                              Wir haben dir einen Link zum Zurücksetzen geschickt.
                              Schau in dein Postfach.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      type="submit"
                      disabled={isLoading || !email || !password}
                      className="w-full bg-amber-700 hover:bg-amber-800 text-white py-6 text-base disabled:bg-amber-200 disabled:text-amber-500"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Wird angemeldet...
                        </>
                      ) : (
                        "Anmelden"
                      )}
                    </Button>

                    <p className="text-sm text-amber-700 text-center mt-4">
                      Noch kein Passwort?{" "}
                      <button
                        type="button"
                        onClick={() => wechsleMethode("link")}
                        className="text-amber-800 hover:text-amber-900 font-medium underline underline-offset-2 transition-colors"
                      >
                        Per E-Mail-Link anmelden
                      </button>
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ZugangPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
        </div>
      }
    >
      <ZugangPageInner />
    </Suspense>
  );
}
