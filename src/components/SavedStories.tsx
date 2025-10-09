"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase, SavedStory } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Play, Download, AlertTriangle } from "lucide-react";

export default function SavedStories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStories();
    }
  }, [user]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      
      // Versuche zuerst Supabase
      try {
        const { data, error } = await supabase
          .from('saved_stories')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setStories(data || []);
        setUseLocalStorage(false);
        return;
      } catch (supabaseError) {
        console.log('Supabase nicht verfügbar, verwende localStorage');
        setUseLocalStorage(true);
      }

      // Fallback zu localStorage
      const existingStoriesJson = localStorage.getItem('ressourcen_stories');
      if (existingStoriesJson) {
        const localStories = JSON.parse(existingStoriesJson);
        setStories(localStories);
      } else {
        setStories([]);
      }
    } catch (err) {
      setError('Fehler beim Laden der Geschichten');
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    try {
      if (!useLocalStorage) {
        // Versuche Supabase
        try {
          const { error } = await supabase
            .from('saved_stories')
            .delete()
            .eq('id', storyId);

          if (error) throw error;
        } catch (supabaseError) {
          console.log('Supabase nicht verfügbar, verwende localStorage');
          setUseLocalStorage(true);
        }
      }

      // Immer localStorage aktualisieren
      const existingStoriesJson = localStorage.getItem('ressourcen_stories');
      if (existingStoriesJson) {
        const localStories = JSON.parse(existingStoriesJson);
        const updatedStories = localStories.filter((story: any) => story.id !== storyId);
        localStorage.setItem('ressourcen_stories', JSON.stringify(updatedStories));
      }
      
      setStories(stories.filter(story => story.id !== storyId));
    } catch (err) {
      setError('Fehler beim Löschen der Geschichte');
      console.error('Error deleting story:', err);
    }
  };

  const playAudio = (audioUrl: string) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const downloadStory = (story: SavedStory) => {
    const content = `
Geschichte: ${story.title}

Ressource: ${story.resource_figure.name}
${story.resource_figure.description || ''}

Geschichte:
${story.content}

Erstellt am: ${new Date(story.created_at).toLocaleDateString('de-DE')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Lade deine Geschichten...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-amber-900 mb-2">Meine Geschichten</h2>
        <p className="text-gray-600">
          {stories.length === 0 
            ? 'Du hast noch keine Geschichten gespeichert' 
            : `${stories.length} Geschichte${stories.length === 1 ? '' : 'n'} gefunden`
          }
        </p>
        {useLocalStorage && (
          <div className="mt-2 flex items-center justify-center gap-2 text-yellow-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Lokaler Speicher (Datenbank nicht verfügbar)</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <AnimatePresence>
        {stories.map((story, index) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-amber-900 mb-2">
                  {story.title}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    {story.resource_figure.name}
                  </span>
                  <span>
                    {new Date(story.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {story.audio_url && (
                  <button
                    onClick={() => playAudio(story.audio_url!)}
                    className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Audio abspielen"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
                
                <button
                  onClick={() => downloadStory(story)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Geschichte herunterladen"
                >
                  <Download className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => deleteStory(story.id)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  title="Geschichte löschen"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-amber-900 mb-2">Ressource</h4>
              <p className="text-amber-800">
                {story.resource_figure.description || 'Keine Beschreibung verfügbar'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Geschichte</h4>
              <p className="text-gray-700 leading-relaxed">
                {story.content}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {stories.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-24 h-24 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">📚</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Noch keine Geschichten
          </h3>
          <p className="text-gray-500">
            Erstelle deine erste Ressource und lass dir eine Geschichte generieren!
          </p>
        </motion.div>
      )}
    </div>
  );
}
