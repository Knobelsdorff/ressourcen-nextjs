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
import { Loader2, Mail, Lock, Clock } from "lucide-react";

type ViewState = "magic-link" | "magic-link-success" | "password-login";

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
  const [viewState, setViewState] = useState<ViewState>("magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(returnTo);
    }
  }, [user, router, returnTo]);

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

        setViewState("magic-link-success");
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

      // Success - show success state
      setViewState("magic-link-success");
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
    if (!email || !email.includes("@")) {
      setError("Bitte gib zuerst deine E-Mail ein.");
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createSPAClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/reset?email=${encodeURIComponent(email)}`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || "Fehler beim Senden des Reset-Links.");
        setIsLoading(false);
        return;
      }

      setError("");
      alert("Reset-Link wurde gesendet. Bitte schaue in dein Postfach.");
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-lg p-8 md:p-10"
        >
          <h1 className="text-3xl md:text-4xl font-medium text-amber-900 mb-3">
            Dein Zugang
          </h1>
          <p className="text-base md:text-lg text-amber-700 mb-8 leading-relaxed">
            {zeigeLinkHinweis
              ? "Kein Problem – wir schicken dir einfach einen neuen Link."
              : "Wenn du schon eine persönliche Geschichte erstellt hast, kannst du hier zurück in deinen Raum."}
          </p>

          {/* Hinweis nach einem abgelaufenen oder ungültigen Zugangslink */}
          <AnimatePresence>
            {zeigeLinkHinweis && viewState !== "magic-link-success" && (
              <motion.div
                key="link-hinweis"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 leading-relaxed">
                    <p className="font-medium mb-1">
                      {linkFehler === "fehler"
                        ? "Dieser Link konnte nicht geöffnet werden."
                        : "Dieser Link ist nicht mehr gültig."}
                    </p>
                    <p className="text-amber-700">
                      Gib unten deine E-Mail-Adresse ein – du bekommst sofort einen neuen Zugang.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Magic Link Success State */}
          <AnimatePresence mode="wait">
            {viewState === "magic-link-success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-8"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-medium text-amber-900 mb-2">
                    Link ist unterwegs.
                  </h2>
                  <p className="text-base text-amber-700 mb-2">
                    Schau kurz in dein Postfach. Manchmal landet er im Spam.
                  </p>
                  <p className="text-sm text-amber-600/70 mt-4">
                    Öffne den Link am besten auf diesem Gerät.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setViewState("magic-link");
                    setEmail("");
                    setZeigeLinkHinweis(false);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Nochmal versuchen
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Magic Link Form */}
                <form onSubmit={handleMagicLinkSubmit} className="mb-6">
                  <div className="mb-6">
                    <Label htmlFor="email" className="text-amber-900 mb-2 block">
                      E-Mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="deine@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full text-lg py-6"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-lg py-6 mb-3"
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

                  <p className="text-sm text-amber-600/70 text-center">
                    Kein Passwort. Kein Newsletter. Nur dein Zugang.
                  </p>
                </form>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-sm text-red-700">{error}</p>
                  </motion.div>
                )}

                {/* Password Login Toggle */}
                <div className="border-t border-amber-100 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="text-sm text-amber-700 hover:text-amber-900 transition-colors w-full text-center mb-4"
                    aria-expanded={showPasswordSection}
                  >
                    Mit Passwort anmelden
                  </button>

                  {/* Password Login Form */}
                  <AnimatePresence>
                    {showPasswordSection && (
                      <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handlePasswordLogin}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <Label htmlFor="password-email" className="text-amber-900 mb-2 block text-sm">
                            E-Mail
                          </Label>
                          <Input
                            id="password-email"
                            type="email"
                            placeholder="deine@email.de"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="w-full"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="password" className="text-amber-900 mb-2 block text-sm">
                            Passwort
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="w-full"
                            required
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="remember"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked === true)}
                            disabled={isLoading}
                          />
                          <Label
                            htmlFor="remember"
                            className="text-sm text-amber-700 cursor-pointer"
                          >
                            Angemeldet bleiben
                          </Label>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Wird angemeldet...
                              </>
                            ) : (
                              "Anmelden"
                            )}
                          </Button>

                          <div className="flex justify-start text-xs">
                            <button
                              type="button"
                              onClick={handlePasswordReset}
                              className="text-amber-600 hover:text-amber-700 transition-colors"
                            >
                              Passwort vergessen?
                            </button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      }
    >
      <ZugangPageInner />
    </Suspense>
  );
}
