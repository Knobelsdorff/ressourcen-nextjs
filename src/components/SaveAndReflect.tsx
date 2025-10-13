// components/SaveAndReflect.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Trash2, Heart, Clock, User, MessageSquare, Volume2, Sparkles, RefreshCw, X, AlertTriangle, Lock } from "lucide-react";
import { ResourceFigure, AudioState } from "@/app/page";
import { QuestionAnswer } from "@/components/RelationshipSelection";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";

interface SavedStory {
  id: string;
  timestamp: number;
  resourceFigure: ResourceFigure;
  questionAnswers: QuestionAnswer[];
  generatedStory: string;
  audioState: AudioState | null;
  createdAt: string;
  title?: string;
}

interface SaveAndReflectProps {
  resourceFigure: ResourceFigure;
  questionAnswers: QuestionAnswer[];
  generatedStory: string;
  audioState: AudioState | null;
  onDiscard: () => void;
}

export default function SaveAndReflect({
  resourceFigure,
  questionAnswers,
  generatedStory,
  audioState,
  onDiscard
}: SaveAndReflectProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [storyTitle, setStoryTitle] = useState("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [localAudioState, setLocalAudioState] = useState<AudioState | null>(audioState);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Automatisches Speichern nach erfolgreicher Anmeldung
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
      saveStoryToDatabase();
    }
  }, [user, showAuthModal]);

  const generateStoryId = () => {
    return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const saveStoryToDatabase = async () => {
    console.log('SaveAndReflect: saveStoryToDatabase called');
    
    // Prüfe, ob der Benutzer angemeldet ist
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);

      const title = storyTitle.trim() || `Reise mit ${resourceFigure.name}`;

      if (user) {
        // Speichere in Supabase
        const { data, error } = await supabase
          .from('saved_stories')
          .insert({
            user_id: user.id,
            title: title,
            content: generatedStory,
            resource_figure: resourceFigure,
            question_answers: questionAnswers,
            audio_url: audioState?.audioUrl || null,
            voice_id: audioState?.voiceId || null
          })
          .select();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(`Fehler beim Speichern in der Datenbank: ${error.message}`);
        }
      }

      // Zusätzlich im localStorage speichern (für Offline-Funktionalität)
      const storyData: SavedStory = {
        id: generateStoryId(),
        timestamp: Date.now(),
        resourceFigure,
        questionAnswers,
        generatedStory,
        audioState,
        createdAt: formatDate(Date.now()),
        title: title
      };

      const existingStoriesJson = localStorage.getItem('ressourcen_stories');
      const existingStories: SavedStory[] = existingStoriesJson ? JSON.parse(existingStoriesJson) : [];
      const updatedStories = [storyData, ...existingStories];
      localStorage.setItem('ressourcen_stories', JSON.stringify(updatedStories));

      console.log('Story saved successfully, showing success message');
      setShowSuccessMessage(true);
      
      // Weiterleitung nach 2 Sekunden
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
        window.location.href = '/dashboard';
      }, 2000);

    } catch (error: any) {
      console.error('Error saving story:', error);
      setError(error.message || 'Fehler beim Speichern der Geschichte');
    } finally {
      setIsSaving(false);
    }
  };

  // Entferne automatisches Speichern - nur manuell über Button

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: generatedStory,
          voiceId: '21m00Tcm4TlvDq8ikWAM' // Standard voice
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Generieren des Audios');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const newAudioState: AudioState = {
        audioUrl,
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        storyText: generatedStory,
        duration: 0,
        isGenerated: true
      };
      
      setLocalAudioState(newAudioState);
      
      // Aktualisiere auch den globalen audioState
      if (audioState) {
        audioState.audioUrl = audioUrl;
        audioState.voiceId = '21m00Tcm4TlvDq8ikWAM';
      }
      
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Fehler beim Generieren des Audios. Bitte versuche es erneut.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleDiscardConfirm = () => {
    setShowDiscardModal(false);
    onDiscard();
  };

  const getStorySummary = () => {
    const answeredQuestions = questionAnswers.filter(qa => 
      qa.answer.trim().length > 0 || qa.selectedBlocks.length > 0
    ).length;

    return {
      totalQuestions: questionAnswers.length,
      answeredQuestions,
      storyLength: generatedStory.length,
      hasAudio: !!localAudioState?.audioUrl,
      voiceUsed: localAudioState?.voiceId || 'None',
      audioDuration: localAudioState?.duration || 0
    };
  };

  const summary = getStorySummary();

  if (showSuccessMessage) {
    return (
      <div className="min-h-screen p-4 lg:p-12 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-8xl mb-6"
          >
            ✨
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-light text-amber-900 mb-4"
          >
            Geschichte erfolgreich gespeichert!
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-amber-700 text-lg"
          >
            Du wirst automatisch zum Dashboard weitergeleitet...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-12" suppressHydrationWarning>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-amber-900 mb-4">
            Speichern & Reflektieren
          </h1>
          <p className="text-amber-700 text-lg">
            Deine Geschichte ist bereit! Lass uns sie speichern und einen Moment innehalten.
          </p>
        </motion.div>

        {/* Story Summary */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 border border-amber-200"
        >
          <h2 className="text-2xl font-semibold text-amber-900 mb-4 flex items-center gap-2">
            <Heart className="w-6 h-6" />
            Deine Geschichte
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/60 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{summary.answeredQuestions}</div>
              <div className="text-sm text-amber-700">Beantwortete Fragen</div>
            </div>
            <div className="bg-white/60 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{summary.storyLength}</div>
              <div className="text-sm text-amber-700">Zeichen</div>
            </div>
            <div className="bg-white/60 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{summary.hasAudio ? '✓' : '✗'}</div>
              <div className="text-sm text-amber-700">Audio verfügbar</div>
            </div>
            <div className="bg-white/60 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{resourceFigure.emoji}</div>
              <div className="text-sm text-amber-700">{resourceFigure.name}</div>
            </div>
          </div>

          {/* Story Title Input */}
          <div className="mb-4">
            <label htmlFor="story-title" className="block text-sm font-medium text-amber-800 mb-2">
              Titel für deine Geschichte (optional)
            </label>
            <input
              id="story-title"
              type="text"
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              placeholder={`Reise mit ${resourceFigure.name}`}
              className="w-full px-4 py-3 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-amber-900 placeholder-amber-500"
              maxLength={100}
            />
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}


        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDiscardModal(true)}
            className="px-8 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors text-lg font-medium flex items-center gap-2 shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
            Geschichte verwerfen
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              console.log('SaveAndReflect: Button clicked - starting save process');
              try {
                await saveStoryToDatabase();
                console.log('SaveAndReflect: Save process completed');
              } catch (error) {
                console.error('SaveAndReflect: Save process failed:', error);
              }
            }}
            disabled={isSaving}
            className={`px-8 py-3 rounded-xl transition-all text-lg font-medium flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed justify-center ${
              user 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Speichern & Reflektieren...
              </>
            ) : user ? (
              <>
                <Save className="w-5 h-5" />
                Speichern & Reflektieren
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Anmelden & Speichern
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Discard Confirmation Modal */}
        <AnimatePresence>
          {showDiscardModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Geschichte verwerfen?
                  </h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Möchtest du diese Geschichte wirklich verwerfen? Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDiscardModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDiscardConfirm}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Verwerfen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Account erstellen
                </h2>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-gray-600 mb-6">
                Erstelle einen Account, um deine Ressource zu speichern und später darauf zuzugreifen.
              </p>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    // Weiterleitung zur Hauptseite
                    window.location.href = '/';
                  }}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Zur Hauptseite (Anmeldung)
                </button>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}