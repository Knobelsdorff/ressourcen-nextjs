"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { createSPAClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Lock } from "lucide-react";

type ViewState = "magic-link" | "magic-link-success" | "password-login";

export default function ZugangPage() {
  const router = useRouter();
  const { user } = useAuth();
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
      router.push("/dashboard");
    }
  }, [user, router]);

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

      const supabase = createSPAClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/dashboard`;

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

      // Success - redirect to dashboard
      router.push("/dashboard");
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
          
          {/* New User Guidance Block */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6 pb-6 border-b border-amber-100"
          >
            <p className="text-sm md:text-base text-amber-700/80 mb-3 leading-relaxed">
              Wenn du neu hier bist, kannst du mit einer ersten Geschichte beginnen.
            </p>
            <Button
              onClick={() => router.push("/ankommen")}
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-900"
            >
              Eine Geschichte anhören
            </Button>
          </motion.div>

          <p className="text-base md:text-lg text-amber-700 mb-8 leading-relaxed">
            Wenn du schon eine persönliche Geschichte erstellt hast, kannst du hier zurück in deinen Raum.
          </p>

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
                    Schau kurz in dein Postfach. Wenn du möchtest, öffne den Link auf diesem Gerät.
                  </p>
                  <p className="text-sm text-amber-600/70 mt-4">
                    Manchmal landet er im Spam.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setViewState("magic-link");
                    setEmail("");
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
                      "Zugangslink senden"
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
