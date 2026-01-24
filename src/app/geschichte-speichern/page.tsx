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

type ViewState = "save-story" | "magic-link-sent";

export default function GeschichteSpeichernPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [viewState, setViewState] = useState<ViewState>("save-story");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSaveStory = async (e: React.FormEvent) => {
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
        setError(magicLinkError.message || "Fehler beim Senden des Links.");
        setIsLoading(false);
        return;
      }

      // Success - show magic link sent state
      setViewState("magic-link-sent");
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      setIsLoading(false);
    }
  };

  // Save ankommen resource when user logs in
  useEffect(() => {
    const saveAnkommenResourceIfExists = async () => {
      if (!user) return;

      try {
        // Check if ankommen resource exists in localStorage
        const ankommenData = localStorage.getItem('ankommen_resource');
        if (!ankommenData) return;

        const ankommenResource = JSON.parse(ankommenData);
        console.log('[GeschichteSpeichern] Found ankommen resource, attempting to save');

        const supabase = createSPAClient();

        // Check if this story already exists for the user
        const { data: existing } = await supabase
          .from('saved_stories')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', ankommenResource.title)
          .eq('audio_url', ankommenResource.audio_url);

        if (existing && existing.length > 0) {
          console.log('[GeschichteSpeichern] Ankommen story already exists for user');
          localStorage.removeItem('ankommen_resource');
          return;
        }

        // Save the ankommen story for the user
        const { error } = await (supabase as any)
          .from('saved_stories')
          .insert({
            user_id: user.id,
            title: ankommenResource.title || 'Ankommen-Geschichte',
            content: ankommenResource.content,
            resource_figure: ankommenResource.resource_figure || 'Ankommen',
            question_answers: [],
            audio_url: ankommenResource.audio_url,
            voice_id: ankommenResource.voice_id || null,
          });

        if (error) {
          console.error('[GeschichteSpeichern] Error saving ankommen story:', error);
        } else {
          console.log('[GeschichteSpeichern] Ankommen story saved successfully');
          localStorage.removeItem('ankommen_resource');
        }
      } catch (err) {
        console.error('[GeschichteSpeichern] Error in saveAnkommenResourceIfExists:', err);
      }
    };

    saveAnkommenResourceIfExists();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <AnimatePresence mode="wait">
          {viewState === "magic-link-sent" ? (
            <motion.div
              key="magic-link-sent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl shadow-lg p-8 md:p-10"
            >
              {/* Magic Link Sent State */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Mail className="w-8 h-8 text-amber-600" />
                </motion.div>

                <h1 className="text-2xl md:text-3xl font-medium text-amber-900 mb-4">
                  Link ist unterwegs
                </h1>

                <p className="text-base md:text-lg text-amber-700 mb-2 leading-relaxed">
                  Schau kurz in dein Postfach.
                  <br />
                  Manchmal landet er im Spam.
                </p>

                <p className="text-sm text-amber-600/70 mt-6">
                  Öffne den Link am besten auf diesem Gerät.
                </p>

                <Button
                  onClick={() => {
                    setViewState("save-story");
                    setEmail("");
                  }}
                  variant="outline"
                  className="w-full mt-8 border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  Nochmal versuchen
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="save-story"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl shadow-lg p-8 md:p-10"
            >
              {/* Save Story Form */}
              <h1 className="text-2xl md:text-3xl font-medium text-amber-900 mb-3">
                Dein persönlicher Raum
              </h1>

              <p className="text-base md:text-lg text-amber-700 mb-8 leading-relaxed">
                Wenn du möchtest,
                <br />
                kannst du diese Geschichte für dich behalten
                <br />
                und jederzeit darauf zugreifen.
                <br />
                <br />
                Dafür brauchst du einen Zugang.
              </p>

              <form onSubmit={handleSaveStory}>
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

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white text-lg py-6 mb-4"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    "Geschichte für mich speichern"
                  )}
                </Button>

                <p className="text-sm text-amber-600/70 text-center leading-relaxed">
                  Kein Newsletter.
                  <br />
                  Kein Spam.
                  <br />
                  Nur dein Raum.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
