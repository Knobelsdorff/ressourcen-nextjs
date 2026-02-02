"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import AnkommenAudioPlayer from "@/components/ankommen/AnkommenAudioPlayer";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface ExampleResource {
  id: string;
  title: string;
  content: string | null;
  resource_figure: any;
  audio_url?: string;
  voice_id?: string;
  created_at: string;
}

export default function AnkommenPage() {
  const router = useRouter();
  const [resource, setResource] = useState<ExampleResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioEnded, setAudioEnded] = useState(false);

  useEffect(() => {
    // Track page view
    trackEvent({
      eventType: 'page_view',
      metadata: {
        page_path: '/ankommen',
      },
    });

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

          // Speichere Ankommen-Resource in localStorage für spätere Zuordnung zum User-Account
          if (typeof window !== 'undefined') {
            localStorage.setItem('ankommen_resource', JSON.stringify({
              id: data.resource.id,
              title: data.resource.title,
              content: data.resource.content,
              resource_figure: data.resource.resource_figure,
              audio_url: data.resource.audio_url,
              voice_id: data.resource.voice_id,
              visited_at: new Date().toISOString(),
            }));
            console.log('[Ankommen] Saved example resource to localStorage for later association');
          }
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

  const handleAudioEnded = () => {
    setAudioEnded(true);
    trackEvent({
      eventType: 'audio_complete',
      storyId: resource?.id,
      metadata: {
        page_path: '/ankommen',
      },
    });
  };

  const handlePersonalizeClick = () => {
    trackEvent({
      eventType: 'click_personalize',
      metadata: {
        page_path: '/ankommen',
      },
    });
    router.push("/figur");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-amber-700 text-lg">Lade Geschichte...</p>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-amber-900 mb-4">
            Geschichte nicht verfügbar
          </h2>
          <p className="text-amber-700 mb-6">
            {error || 'Die Geschichte konnte nicht geladen werden.'}
          </p>
          <Button
            onClick={() => router.push('/')}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Zurück
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
            Die Geschichte hat keine Audio-Datei.
          </p>
          <Button
            onClick={() => router.push('/')}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  // Get resource figure name for subtitle
  const resourceFigureName = resource.resource_figure?.name || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-8 md:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Top area - Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-medium text-amber-900 mb-3 md:mb-4">
            Du musst nichts tun.
          </h1>
          <p className="text-sm md:text-base text-amber-700/80 max-w-md mx-auto leading-relaxed">
            Die Geschichte nun für dich da.
            <br />
            Du kannst einfach zuhören.
            <br />
            Oder jederzeit pausieren.
          </p>
        </motion.div>

        {/* Center area - Audio Player */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 md:mb-12"
        >
          <AnkommenAudioPlayer
            audioUrl={resource.audio_url}
            title={resource.title}
            subtitle={resourceFigureName}
            onEnded={handleAudioEnded}
          />
        </motion.div>

        {/* Micro-reassurance */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mb-8 md:mb-12"
        >
          <p className="text-sm text-amber-700/70 max-w-md mx-auto leading-relaxed">
            Wenn du nichts spürst, ist das in Ordnung.
            <br />
            Manche Geschichten wirken leise – und erst später.
          </p>
        </motion.div>

        {/* Post-audio reveal */}
        <AnimatePresence>
          {audioEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              <p className="text-base md:text-lg text-amber-800 max-w-lg mx-auto leading-relaxed">
                Wenn du magst, können die Geschichten noch genauer zu dir passen.
                <br />
                Du beantwortest ein paar kurze Fragen – ganz ohne Druck.
              </p>
              <div>
                <Button
                  onClick={handlePersonalizeClick}
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-base md:text-lg px-8 py-4 md:py-5 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Eine persönliche Geschichte erstellen
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

