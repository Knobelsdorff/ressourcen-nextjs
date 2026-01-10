"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { createSPAClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";

type ViewState = "form" | "success";

export default function ZugangErhaltenPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [viewState, setViewState] = useState<ViewState>("form");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      setViewState("success");
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
          <AnimatePresence mode="wait">
            {viewState === "success" ? (
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
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h1 className="text-3xl md:text-4xl font-medium text-amber-900 mb-3">
                  Dein persönlicher Raum
                </h1>
                
                <p className="text-base md:text-lg text-amber-700 mb-8 leading-relaxed">
                  Damit deine Geschichten für dich gespeichert bleiben
                  <br />
                  und jederzeit abrufbar sind, brauchst du einen Zugang.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
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
                      "Zugang per E-Mail erhalten"
                    )}
                  </Button>

                  <p className="text-sm text-amber-600/70 text-center">
                    Kein Newsletter. Kein Spam. Nur dein Raum.
                  </p>
                </form>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-sm text-red-700">{error}</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
