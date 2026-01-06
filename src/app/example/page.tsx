"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthModal } from "@/components/modals/auth-modal";
import ExampleAudioPlayer from "@/components/example/ExampleAudioPlayer";
import { Loader2 } from "lucide-react";

interface ExampleResource {
  id: string;
  title: string;
  content: string | null;
  resource_figure: any;
  audio_url?: string;
  voice_id?: string;
  created_at: string;
}

export default function ExamplePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [resource, setResource] = useState<ExampleResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExampleResource = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/example-resource');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Fehler beim Laden der Beispiel-Ressourcenfigur');
        }

        if (data.success && data.resource) {
          setResource(data.resource);
        } else {
          throw new Error('Beispiel-Ressourcenfigur nicht gefunden');
        }
      } catch (err: any) {
        console.error('Error fetching example resource:', err);
        setError(err.message || 'Fehler beim Laden der Beispiel-Ressourcenfigur');
      } finally {
        setLoading(false);
      }
    };

    fetchExampleResource();
  }, []);

  const handleStartFlow = () => {
    if (user) {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-amber-700 text-lg">Lade Beispiel-Ressourcenfigur...</p>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-amber-900 mb-4">
            Beispiel-Ressourcenfigur nicht verfügbar
          </h2>
          <p className="text-amber-700 mb-6">
            {error || 'Die Beispiel-Ressourcenfigur konnte nicht geladen werden.'}
          </p>
          <Button
            onClick={() => router.push('/landingpage')}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Zurück zur Landingpage
          </Button>
        </div>
      </div>
    );
  }

  if (!resource.audio_url) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-amber-900 mb-4">
            Keine Audio-Datei verfügbar
          </h2>
          <p className="text-amber-700 mb-6">
            Die Beispiel-Ressourcenfigur hat keine Audio-Datei.
          </p>
          <Button
            onClick={() => router.push('/landingpage')}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Zurück zur Landingpage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">
            Hör dir eine Power Story an
          </h1>
          <p className="text-xl md:text-2xl text-amber-700">
            Erlebe, wie eine Power Story klingt und sich anfühlt
          </p>
        </motion.div>

        {/* Audio Player */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <ExampleAudioPlayer
            audioUrl={resource.audio_url}
            title={resource.title}
          />
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-lg md:text-xl text-amber-700 mb-6">
            Möchtest du deine eigene Power Story erstellen?
          </p>
          {user ? (
            <Button
              onClick={handleStartFlow}
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
            >
              Jetzt selbst erstellen
            </Button>
          ) : (
            <AuthModal isOnLandingPage={true}>
              <Button
                size="lg"
                className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
              >
                Jetzt selbst erstellen
              </Button>
            </AuthModal>
          )}
        </motion.div>
      </div>
    </div>
  );
}

