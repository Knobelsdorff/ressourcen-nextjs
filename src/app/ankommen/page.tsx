"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AudioPlayer from "@/components/audio/AudioPlayer";
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
  const reduceMotion = useReducedMotion();

  // Die Hauskurve aus globals.css – ruhig, ohne Nachschwingen.
  const ease = [0.22, 1, 0.36, 1] as const;

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
      <div className="ankommen-page ankommen-state">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 motion-reduce:animate-none" aria-hidden="true" />
          <p className="ankommen-loading-text">Die Geschichte wird vorbereitet…</p>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="ankommen-page ankommen-state">
        <div className="ankommen-state-card">
          <h2>Geschichte nicht verfügbar</h2>
          <p>{error || 'Die Geschichte konnte gerade nicht geladen werden. Das liegt nicht an dir – versuch es später noch einmal.'}</p>
          <Button onClick={() => router.push('/')} className="ankommen-button">
            Zurück zum Start
          </Button>
        </div>
      </div>
    );
  }

  if (!resource.audio_url) {
    return (
      <div className="ankommen-page ankommen-state">
        <div className="ankommen-state-card">
          <h2>Noch keine Aufnahme da</h2>
          <p>Zu dieser Geschichte gibt es gerade keine Audio-Datei.</p>
          <Button onClick={() => router.push('/')} className="ankommen-button">
            Zurück zum Start
          </Button>
        </div>
      </div>
    );
  }

  // Get resource figure name for subtitle
  const resourceFigureName = resource.resource_figure?.name || null;

  return (
    <div className="ankommen-page">
      <div className="ankommen-inner">
        {/* Kopfbereich – sagt zuerst, dass nichts verlangt wird. */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease }}
          className="ankommen-head"
        >
          <div className="ankommen-mark" aria-hidden="true">
            <span />
            <i />
            <i />
          </div>
          <h1>Du musst nichts tun.</h1>
          <p className="ankommen-lead">
            Eine wohlwollende Präsenz ist nun für dich da.
            <br />
            Du kannst einfach zuhören – oder jederzeit pausieren.
          </p>
        </motion.div>

        {/* Der Player als Anker der Seite. */}
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease, delay: 0.12 }}
        >
          <AudioPlayer
            audioUrl={resource.audio_url}
            title={resource.title}
            variant="compact"
            className="ankommen-card"
            onEnded={handleAudioEnded}
            onPlay={() =>
              trackEvent({
                eventType: 'audio_play',
                metadata: { page_path: '/ankommen' },
              })
            }
            header={
              <div className="mb-5 text-center">
                <h2>{resource.title}</h2>
                {resourceFigureName && (
                  <p className="mt-1 text-sm text-secondary-500">{resourceFigureName}</p>
                )}
              </div>
            }
          />
        </motion.div>

        {/* Der wichtigste Satz der Seite – auf eigener Fläche, nicht als Fußnote. */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.65, ease, delay: 0.24 }}
          className="ankommen-reassurance"
        >
          Wenn du nichts spürst, ist das in Ordnung.
          <br />
          Manche Geschichten wirken leise – und erst später.
        </motion.p>

        {/*
          Erst nach dem Hören: der nächste Schritt. Während der Geschichte
          steht hier bewusst nichts, was zum Weitergehen drängt.
        */}
        <AnimatePresence>
          {audioEnded && (
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="ankommen-next"
            >
              <p>
                Wenn du magst, können die Geschichten noch genauer zu dir passen.
                Du beantwortest ein paar kurze Fragen – ganz ohne Druck.
              </p>
              <div>
                <Button onClick={handlePersonalizeClick} className="ankommen-button">
                  Eine persönliche Geschichte erstellen
                </Button>
              </div>
              <div>
                <button type="button" onClick={() => router.push('/')} className="ankommen-skip">
                  Später vielleicht
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
