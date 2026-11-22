"use client";

import WellnessMark from "@/components/WellnessMark";
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
import { T, useTextFn } from "@/components/site-text/T";
import { account } from "@/content/texts/account";

type Methode = "link" | "passwort";

function getSafeReturnTo(param: string | null): string {
  if (!param || !param.startsWith('/') || param.startsWith('//')) {
    return '/dashboard';
  }
  return param;
}

function ZugangPageInner() {
  const router = useRouter();
  const tx = useTextFn();
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
        setError(tx(account["common.invalidEmail"]));
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
          setError(data.error || tx(account["login.error.sendLink"]));
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
        setError(magicLinkError.message || tx(account["login.error.sendLink"]));
        setIsLoading(false);
        return;
      }

      setLinkGesendet(true);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || tx(account["common.unexpected"]));
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
        setError(tx(account["common.invalidEmail"]));
        setIsLoading(false);
        return;
      }

      if (!password) {
        setError(tx(account["login.error.passwordMissing"]));
        setIsLoading(false);
        return;
      }

      const supabase = createSPAClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (signInError) {
        setError(signInError.message || tx(account["login.error.wrongCredentials"]));
        setIsLoading(false);
        return;
      }

      router.push(returnTo);
    } catch (err: any) {
      setError(err.message || tx(account["common.unexpected"]));
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError(tx(account["login.error.emailFirst"]));
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
        setError(resetError.message || tx(account["login.error.sendReset"]));
        setIsLoading(false);
        return;
      }

      // Inline-Bestätigung statt blockierendem alert()
      setResetGesendet(true);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || tx(account["common.unexpected"]));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen wellness-page-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="wellness-auth-card bg-white rounded-2xl shadow-lg sm:p-10 p-6"
        >
          <WellnessMark />
          {linkGesendet ? (
            /* ---------- Bestätigung: Link ist unterwegs ---------- */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail className="w-7 h-7 text-primary-700" />
              </div>
              <h1 className="text-2xl font-medium text-primary-900 mb-3">
                <T t={account["common.linkSentTitle"]} />
              </h1>
              <p className="text-primary-800 leading-relaxed mb-2">
                <T t={account["login.sentText"]} vars={{ email: email.toLowerCase().trim() }} classNames={{ strong: "font-medium break-all" }} />
              </p>
              <p className="text-sm text-primary-700 leading-relaxed">
                <T t={account["login.sentHint"]} />
              </p>

              <div className="mt-8 pt-6 border-t border-primary-200">
                <button
                  type="button"
                  onClick={() => {
                    setLinkGesendet(false);
                    setZeigeLinkHinweis(false);
                    setError("");
                  }}
                  className="text-sm text-primary-700 hover:text-primary-900 font-medium transition-colors"
                >
                  <T t={account["login.otherEmail"]} />
                </button>
              </div>
            </motion.div>
          ) : (
            /* ---------- Anmeldung ---------- */
            <>
              <h1 className="sm:text-3xl text-2xl font-medium text-primary-900 mb-2">
                <T t={account["login.title"]} />
              </h1>
              <p className="text-primary-800 leading-relaxed sm:mb-8 mb-6">
                <T t={zeigeLinkHinweis ? account["login.subtitleExpired"] : account["login.subtitle"]} />
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
                    <div className="flex gap-3 bg-primary-50 border border-primary-400 rounded-lg p-4 mb-6">
                      <Clock className="w-5 h-5 text-primary-700 shrink-0 mt-0.5" />
                      <div className="text-sm text-primary-900 leading-relaxed">
                        <p className="font-medium mb-1">
                          <T t={linkFehler === "fehler" ? account["login.linkBroken"] : account["login.linkExpired"]} />
                        </p>
                        <p className="text-primary-800">
                          <T t={account["login.linkHint"]} />
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Methoden-Umschalter */}
              <div
                role="tablist"
                aria-label={tx(account["login.methodAria"])}
                className="grid grid-cols-2 gap-1 p-1 bg-primary-50 border border-primary-200 rounded-lg mb-6"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={methode === "link"}
                  onClick={() => wechsleMethode("link")}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    methode === "link"
                      ? "bg-white text-primary-900 shadow-sm"
                      : "text-primary-700 hover:text-primary-900"
                  }`}
                >
                  <T t={account["login.methodLink"]} />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={methode === "passwort"}
                  onClick={() => wechsleMethode("passwort")}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    methode === "passwort"
                      ? "bg-white text-primary-900 shadow-sm"
                      : "text-primary-700 hover:text-primary-900"
                  }`}
                >
                  <T t={account["login.methodPassword"]} />
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
                      className="p-3 mb-5 bg-primary-50/70 border border-primary-500 rounded-lg"
                    >
                      <p className="text-sm text-primary-900">{error}</p>
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
                      <Label htmlFor="email" className="text-primary-900 mb-2 block">
                        <T t={account["login.emailLabel"]} />
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder={tx(account["common.emailPlaceholder"])}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full py-6 text-base border-primary-400 text-primary-900 placeholder:text-primary-500/60 focus-visible:ring-primary-700"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full bg-primary-700 hover:bg-primary-800 text-white py-6 text-base disabled:bg-primary-200 disabled:text-primary-500"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          <T t={account["common.sending"]} />
                        </>
                      ) : (
                        <T t={zeigeLinkHinweis ? account["login.sendNewLink"] : account["login.sendLink"]} />
                      )}
                    </Button>

                    <p className="text-sm text-primary-700 text-center mt-4 leading-relaxed">
                      <T t={account["login.linkInfo"]} />
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
                      <Label htmlFor="password-email" className="text-primary-900 mb-2 block">
                        <T t={account["login.emailLabel"]} />
                      </Label>
                      <Input
                        id="password-email"
                        type="email"
                        autoComplete="email"
                        placeholder={tx(account["common.emailPlaceholder"])}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full border-primary-400 text-primary-900 placeholder:text-primary-500/60 focus-visible:ring-primary-700"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="password" className="text-primary-900 mb-2 block">
                        <T t={account["login.passwordLabel"]} />
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder={tx(account["login.passwordPlaceholder"])}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full border-primary-400 text-primary-900 placeholder:text-primary-500/60 focus-visible:ring-primary-700"
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
                          className="text-sm text-primary-800 cursor-pointer"
                        >
                          <T t={account["login.remember"]} />
                        </Label>
                      </div>

                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={isLoading}
                        className="text-sm text-primary-700 hover:text-primary-900 transition-colors disabled:opacity-50"
                      >
                        <T t={account["login.forgot"]} />
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
                          <div className="flex items-start gap-2.5 p-3 mb-5 bg-primary-50 border border-primary-400 rounded-lg">
                            <Check className="w-4 h-4 text-primary-700 shrink-0 mt-0.5" />
                            <p className="text-sm text-primary-900 leading-relaxed">
                              <T t={account["login.resetSent"]} />
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      type="submit"
                      disabled={isLoading || !email || !password}
                      className="w-full bg-primary-700 hover:bg-primary-800 text-white py-6 text-base disabled:bg-primary-200 disabled:text-primary-500"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          <T t={account["login.signingIn"]} />
                        </>
                      ) : (
                        <T t={account["login.signIn"]} />
                      )}
                    </Button>

                    <p className="text-sm text-primary-700 text-center mt-4">
                      <T t={account["login.noPassword"]} />{" "}
                      <button
                        type="button"
                        onClick={() => wechsleMethode("link")}
                        className="text-primary-800 hover:text-primary-900 font-medium underline underline-offset-2 transition-colors"
                      >
                        <T t={account["login.useLink"]} />
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
        <div className="min-h-screen wellness-page-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
        </div>
      }
    >
      <ZugangPageInner />
    </Suspense>
  );
}
