"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { BookOpen, Settings, CheckCircle, AlertTriangle, Trash2, Download, Volume2, User, Mail, Calendar, Clock, Star, Trophy, Target, Shield, HelpCircle, MessageCircle, Bug, Key, Trash, Crown, Zap, TrendingUp, Play, Pause } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";

interface SavedStory {
  id: string;
  title: string;
  content: string;
  resource_figure: any;
  question_answers: any[];
  audio_url?: string;
  voice_id?: string;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'stories'>('stories');
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingAudioFor, setGeneratingAudioFor] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Profil-spezifische States
  const [fullName, setFullName] = useState('');
  const [pronunciationHint, setPronunciationHint] = useState('');
  const [fullNameLoading, setFullNameLoading] = useState(false);
  const [fullNameError, setFullNameError] = useState('');
  const [fullNameSuccess, setFullNameSuccess] = useState('');
  const [userStats, setUserStats] = useState({
    totalStories: 0,
    totalAudioTime: 0,
    favoriteFigure: '',
    favoriteVoice: '',
    streak: 0,
    badges: [] as string[],
    lastActivity: null as Date | null
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    plan: 'Free',
    credits: 0,
    expiresAt: null as Date | null,
    isPro: false
  });

  // Funktion zur Bestimmung des Ressourcen-Typs
  const getResourceTypeLabel = (resourceFigure: any) => {
    if (!resourceFigure) return 'Ressource';
    
    const category = resourceFigure.category;
    const name = resourceFigure.name?.toLowerCase() || '';
    
    // Spezielle Behandlung für Orte
    if (name.includes('ort') || name.includes('platz') || name.includes('wald') || 
        name.includes('strand') || name.includes('berg') || name.includes('garten') ||
        name.includes('zimmer') || name.includes('raum') || name.includes('platz')) {
      return 'Ort';
    }
    
    // Kategorien-basierte Labels
    switch (category) {
      case 'real':
        return 'Reale Ressource';
      case 'fictional':
        return 'Fiktive Ressource';
      case 'place':
        return 'Ort';
      default:
        return 'Ressource';
    }
  };

  // Berechne Benutzerstatistiken
  const calculateUserStats = useCallback((stories: SavedStory[]) => {
    if (!stories.length) return;

    // Zähle Figuren und Stimmen
    const figureCounts: { [key: string]: number } = {};
    const voiceCounts: { [key: string]: number } = {};
    
    stories.forEach(story => {
      const figureName = story.resource_figure?.name || 'Unbekannt';
      figureCounts[figureName] = (figureCounts[figureName] || 0) + 1;
      
      if (story.voice_id) {
        voiceCounts[story.voice_id] = (voiceCounts[story.voice_id] || 0) + 1;
      }
    });

    // Finde beliebteste Figur und Stimme
    const favoriteFigure = Object.keys(figureCounts).reduce((a, b) => 
      figureCounts[a] > figureCounts[b] ? a : b, 'Keine'
    );
    
    const favoriteVoiceId = Object.keys(voiceCounts).reduce((a, b) => 
      voiceCounts[a] > voiceCounts[b] ? a : b, 'Keine'
    );

    // Mappe Voice-ID zu Vorname + Beschreibung (nur unsere Stimmauswahl)
    const voiceIdToName: { [key: string]: string } = {
      // Weibliche Stimmen
      'E0OS48T5F0KU7O2NInWS': 'Lucy - warm & erzählend',
      'SaqYcK3ZpDKBAImA8AdW': 'Jane - intim & vertraut', 
      'Z3R5wn05IrDiVCyEkUrK': 'Arabella - elegant & geheimnisvoll',
      '8N2ng9i2uiUWqstgmWlH': 'Beth - sanft & mütterlich',
      // Männliche Stimmen
      'oae6GCCzwoEbfc5FHdEu': 'William - ruhig & weise',
      '8TMmdpPgqHKvDOGYP2lN': 'Gregory - warm & tief',
      'iMHt6G42evkXunaDU065': 'Stefan - professionell & klar',
      'fNQuGwgi0iD0nacRyExh': 'Timothy - sanft & träumerisch'
    };
    
    const favoriteVoice = favoriteVoiceId !== 'Keine' 
      ? voiceIdToName[favoriteVoiceId] || favoriteVoiceId 
      : 'Keine';

    // Berechne Streak (vereinfacht: Anzahl aufeinanderfolgender Tage mit Aktivität)
    const today = new Date();
    const lastActivity = stories.length > 0 ? new Date(stories[0].created_at) : null;
    
    setUserStats({
      totalStories: stories.length,
      totalAudioTime: stories.filter(s => s.audio_url).length * 3, // Schätzung: 3 Min pro Audio
      favoriteFigure,
      favoriteVoice,
      streak: lastActivity ? Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      badges: stories.length >= 5 ? ['Erste Schritte'] : [] as string[],
      lastActivity
    });
  }, []);

  // Lade Geschichten aus Supabase
  const loadStories = useCallback(async () => {
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    console.log('Loading stories for user:', user.id, user.email);
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase
        .from('saved_stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Error loading stories:', error);
        setError(`Fehler beim Laden der Geschichten: ${error.message}`);
      } else {
        console.log('Stories loaded successfully:', data);
        setStories(data || []);
        calculateUserStats(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  }, [user, calculateUserStats]);

  useEffect(() => {
    if (user) {
      loadStories();
      // Prüfe auch nach temporären Geschichten
      checkForPendingStories();
      // Lade den vollständigen Namen
      loadFullName();
    }
  }, [user, loadStories, checkForPendingStories, loadFullName]);

  // Zusätzlicher useEffect für E-Mail-Bestätigung
  useEffect(() => {
    if (user) {
      // Kurze Verzögerung, um sicherzustellen, dass der User vollständig authentifiziert ist
      const timer = setTimeout(() => {
        checkForPendingStories();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, checkForPendingStories]);

  // Zusätzlicher useEffect für URL-Parameter (E-Mail-Bestätigung)
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const confirmed = urlParams.get('confirmed');
      
      console.log('Dashboard: URL params check', { confirmed, user: !!user });
      
      if (confirmed === 'true') {
        // E-Mail wurde bestätigt, prüfe nach temporären Geschichten
        console.log('Dashboard: E-Mail confirmed, checking for pending stories...');
        setTimeout(() => {
          checkForPendingStories();
        }, 500);
        
        // Entferne den confirmed Parameter aus der URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('confirmed');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [user, checkForPendingStories]);

  const loadFullName = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, pronunciation_hint')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading full name:', error);
      } else if (data) {
        setFullName(data.full_name || '');
        setPronunciationHint((data as any).pronunciation_hint || '');
      }
    } catch (err) {
      console.error('Error loading full name:', err);
    }
  }, [user]);

  const saveFullName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFullNameLoading(true);
    setFullNameError('');
    setFullNameSuccess('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, pronunciation_hint: pronunciationHint })
        .eq('id', user.id);

      if (error) {
        setFullNameError(error.message);
      } else {
        setFullNameSuccess('Name erfolgreich gespeichert!');
      }
    } catch (err) {
      setFullNameError('Fehler beim Speichern');
    } finally {
      setFullNameLoading(false);
    }
  };

  const checkForPendingStories = useCallback(async () => {
    console.log('Dashboard: Checking for pending stories...');
    
    if (!user) {
      console.log('Dashboard: No user found, skipping pending story check');
      return;
    }
    
    const savedPendingStory = localStorage.getItem('pendingStory');
    console.log('Dashboard: Pending story exists:', !!savedPendingStory);
    
    if (!savedPendingStory) {
      console.log('Dashboard: No pending story found');
      return;
    }
    
    try {
      const storyData = JSON.parse(savedPendingStory);
      console.log('Dashboard: Story data:', {
        generatedStory: storyData.generatedStory?.substring(0, 50) + '...',
        selectedFigure: storyData.selectedFigure?.name,
        questionAnswers: storyData.questionAnswers?.length || 0
      });
      
      const { data, error } = await supabase
        .from('saved_stories')
        .insert({
          user_id: user.id,
          story_text: storyData.generatedStory,
          figure_name: storyData.selectedFigure.name,
          figure_emoji: storyData.selectedFigure.emoji,
          voice_name: null, // Wird später gesetzt
          audio_url: storyData.audioState?.audioUrl || null,
          voice_id: storyData.selectedVoiceId || null,
          question_answers: storyData.questionAnswers || []
        })
        .select();

      if (error) {
        console.error('Error saving pending story from dashboard:', error);
        // Versuche es erneut nach einer kurzen Pause
        setTimeout(() => {
          checkForPendingStories();
        }, 2000);
      } else {
        console.log('Pending story saved from dashboard:', data);
        // Lösche temporäre Daten
        localStorage.removeItem('pendingStory');
        // Lade Geschichten neu
        loadStories();
      }
    } catch (err) {
      console.error('Error processing pending story:', err);
    }
  }, [user, loadStories]);

  // Cleanup Audio-Elemente beim Unmount
  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioElements]);

  

  const deleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('saved_stories')
        .delete()
        .eq('id', storyId);

      if (error) {
        console.error('Error deleting story:', error);
        alert('Fehler beim Löschen der Geschichte');
      } else {
        // Aktualisiere die lokale Liste
        setStories(stories.filter(story => story.id !== storyId));
        setDeleteConfirmId(null); // Bestätigung schließen
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Ein unerwarteter Fehler ist aufgetreten');
    }
  };

  const handleDeleteClick = (storyId: string) => {
    setDeleteConfirmId(storyId);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const downloadStory = (story: SavedStory) => {
    const content = `
Titel: ${story.title}
${getResourceTypeLabel(story.resource_figure)}: ${story.resource_figure?.name || 'Unbekannt'}
Erstellt: ${new Date(story.created_at).toLocaleDateString('de-DE')}

${story.content}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAudio = (story: SavedStory) => {
    if (!story.audio_url) return;
    
    const a = document.createElement('a');
    a.href = story.audio_url;
    a.download = `${story.title}_audio.mp3`;
    a.click();
  };





  const generateAudio = async (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    setGeneratingAudioFor(storyId);
    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: story.content,
                  voiceId: '21m00Tcm4TlvDq8ikWAM', // Standard-Stimme
                  adminPreview: false // Dashboard generiert immer vollständiges Audio
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Generieren des Audios');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Aktualisiere die Geschichte in der lokalen Liste
      const updatedStory = {
        ...story,
        audio_url: audioUrl,
                voice_id: '21m00Tcm4TlvDq8ikWAM'
      };
      
      setStories(stories.map(s => s.id === storyId ? updatedStory : s));
      
      // Speichere das Audio in der Datenbank
      const { error } = await supabase
        .from('saved_stories')
        .update({
          audio_url: audioUrl,
          voice_id: '21m00Tcm4TlvDq8ikWAM'
        })
        .eq('id', storyId);

      if (error) {
        console.error('Error saving audio to database:', error);
      }
      
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Fehler beim Generieren des Audios. Bitte versuche es erneut.');
    } finally {
      setGeneratingAudioFor(null);
    }
  };

  const playAudio = useCallback((audioUrl: string, storyId: string) => {
    // Stoppe alle anderen Audio-Elemente
    Object.values(audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Erstelle oder verwende existierendes Audio-Element
    let audio = audioElements[storyId];
    if (!audio) {
      audio = new Audio(audioUrl);
      setAudioElements(prev => ({ ...prev, [storyId]: audio }));
      
      // Event Listener für Audio-Ende
      audio.addEventListener('ended', () => {
        setPlayingAudioId(null);
      });
      
      audio.addEventListener('error', () => {
        setPlayingAudioId(null);
        console.error('Audio playback error');
      });
    }
    
    // Setze neue URL falls nötig
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
    }
    
    // Spiele Audio ab
    audio.play().then(() => {
      setPlayingAudioId(storyId);
    }).catch(console.error);
  }, [audioElements]);

  const pauseAudio = useCallback((storyId: string) => {
    const audio = audioElements[storyId];
    if (audio) {
      audio.pause();
      setPlayingAudioId(null);
    }
  }, [audioElements]);

  const stopAllAudio = useCallback(() => {
    Object.values(audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setPlayingAudioId(null);
  }, [audioElements]);

        return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-amber-900 mb-2">
            Dashboard
          </h1>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white rounded-2xl shadow-lg p-2 flex space-x-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Profil</span>
            </button>
            
            <button
              onClick={() => setActiveTab('stories')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'stories'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Geschichten ({stories.length})</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* Basis-Informationen */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Basis-Informationen</h2>
                </div>
              {user ? (
                  <div className="space-y-6">
                    {/* E-Mail Info */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5 text-amber-600" />
                        <span className="font-semibold text-amber-900">E-Mail-Adresse</span>
                      </div>
                      <p className="text-amber-800 text-sm font-medium">{user.email}</p>
                    </div>
                    
                    {/* Personalisierungs-Einstellungen */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h3 className="font-semibold text-blue-900">Personalisierung für Geschichten</h3>
                      </div>
                      
                      <form onSubmit={saveFullName} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="fullName" className="block text-sm font-semibold text-blue-900 mb-2">
                              Vorname/Spitzname
                            </label>
                            <input
                              type="text"
                              id="fullName"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full px-3 py-2.5 border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                              placeholder="z.B. Andy, Maria, Tom"
                            />
                            <p className="text-blue-600 text-xs mt-1.5">
                              Wird in deinen Geschichten verwendet
                            </p>
                          </div>

                          <div>
                            <label htmlFor="pronunciationHint" className="block text-sm font-semibold text-blue-900 mb-2">
                              Aussprache-Hinweis
                              <span className="text-blue-500 text-xs font-normal ml-1">(optional)</span>
                            </label>
                            <input
                              type="text"
                              id="pronunciationHint"
                              value={pronunciationHint}
                              onChange={(e) => setPronunciationHint(e.target.value)}
                              className="w-full px-3 py-2.5 border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                              placeholder="z.B. An-ge-la, Mi-cha-el"
                            />
                            <p className="text-blue-600 text-xs mt-1.5">
                              Für korrekte Audio-Aussprache
                            </p>
                          </div>
                        </div>
                        
                        {fullNameError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                            {fullNameError}
                          </div>
                        )}
                        
                        {fullNameSuccess && (
                          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                            {fullNameSuccess}
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={fullNameLoading}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                          >
                            {fullNameLoading ? 'Speichern...' : 'Einstellungen speichern'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
              ) : (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-700 text-sm">
                    Bitte melde dich an, um dein Profil zu sehen.
                  </p>
                </div>
              )}
              </div>

              {/* Nutzungs-Statistiken */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Nutzungs-Statistiken</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-900">{userStats.totalStories}</p>
                            <p className="text-blue-700 text-sm">Ressourcen</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-900">{userStats.totalAudioTime}</p>
                    <p className="text-purple-700 text-sm">Min. Audio</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <Star className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-green-900">{userStats.favoriteFigure}</p>
                    <p className="text-green-700 text-sm">Lieblingsfigur</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <Volume2 className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-orange-900">{userStats.favoriteVoice}</p>
                    <p className="text-orange-700 text-sm">Lieblingsstimme</p>
                  </div>
                </div>
              </div>

              {/* Abo-Status */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Crown className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Abo-Status</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-amber-600" />
                      <span className="font-medium text-amber-900">Aktueller Plan</span>
                    </div>
                    <p className="text-amber-700 text-lg font-semibold">{subscriptionStatus.plan}</p>
                    {subscriptionStatus.isPro && (
                      <p className="text-amber-600 text-sm">Pro-Version aktiv</p>
                    )}
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Credits</span>
                    </div>
                    <p className="text-blue-700 text-lg font-semibold">{subscriptionStatus.credits}</p>
                    <p className="text-blue-600 text-sm">Verfügbar</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Ablauf</span>
                    </div>
                    <p className="text-green-700 text-lg font-semibold">
                      {subscriptionStatus.expiresAt 
                        ? new Date(subscriptionStatus.expiresAt).toLocaleDateString('de-DE')
                        : 'Unbegrenzt'
                      }
                    </p>
                  </div>
                </div>
                {!subscriptionStatus.isPro && (
                  <div className="mt-4 text-center">
                    <button className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 font-medium">
                      Upgrade zu Pro
                    </button>
                  </div>
                )}
              </div>


              {/* Account-Management */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Account-Management</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <Key className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-blue-900">Passwort ändern</p>
                      <p className="text-blue-700 text-sm">Sicherheitseinstellungen</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                    <Mail className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-green-900">E-Mail ändern</p>
                      <p className="text-green-700 text-sm">Kontaktdaten aktualisieren</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                    <Download className="w-5 h-5 text-orange-600" />
                    <div className="text-left">
                      <p className="font-medium text-orange-900">Daten exportieren</p>
                      <p className="text-orange-700 text-sm">Alle Daten herunterladen</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                    <Trash className="w-5 h-5 text-red-600" />
                    <div className="text-left">
                      <p className="font-medium text-red-900">Account löschen</p>
                      <p className="text-red-700 text-sm">Dauerhaft entfernen</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Support */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <HelpCircle className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Support & Hilfe</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-blue-900">FAQ</p>
                      <p className="text-blue-700 text-sm">Häufige Fragen</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-green-900">Kontakt</p>
                      <p className="text-green-700 text-sm">Support kontaktieren</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                    <Star className="w-5 h-5 text-purple-600" />
                    <div className="text-left">
                      <p className="font-medium text-purple-900">Feedback</p>
                      <p className="text-purple-700 text-sm">Verbesserungsvorschläge</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                    <Bug className="w-5 h-5 text-orange-600" />
                    <div className="text-left">
                      <p className="font-medium text-orange-900">Bug melden</p>
                      <p className="text-orange-700 text-sm">Problem melden</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-amber-900">Geschichten</h2>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Lade Geschichten...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600">{error}</p>
                </div>
              ) : stories.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Noch keine Geschichten gespeichert.</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Erstelle eine neue Ressourcen-Geschichte, um sie hier zu sehen.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stories.map((story) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50 border border-amber-200 rounded-xl p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-amber-900 mb-2">
                            {story.title}
                          </h3>
                          <p className="text-amber-700 text-sm mb-2">
                            <strong>{getResourceTypeLabel(story.resource_figure)}:</strong> {story.resource_figure?.name || 'Unbekannt'}
                          </p>
                          <p className="text-amber-600 text-sm">
                            <strong>Erstellt am:</strong> {new Date(story.created_at).toLocaleDateString('de-DE', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {deleteConfirmId === story.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => deleteStory(story.id)}
                                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                              >
                                Bestätigen
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                              >
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteClick(story.id)}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="Geschichte löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Audio-Fokus Bereich */}
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-center">
                          <div className="mb-4">
                            {story.audio_url ? (
                            <div className="space-y-3">
                                <div className="flex justify-center">
                                  {playingAudioId === story.id ? (
                                <button
                                      onClick={() => pauseAudio(story.id)}
                                      className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-4 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-3 text-lg font-medium"
                                    >
                                      <Pause className="w-6 h-6" />
                                      Pause
                                </button>
                                  ) : (
                                    <button
                                      onClick={() => playAudio(story.audio_url!, story.id)}
                                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-3 text-lg font-medium"
                                    >
                                      <Play className="w-6 h-6" />
                                      Audio abspielen
                                    </button>
                                  )}
                                </div>
                                <p className="text-amber-600 text-sm">
                                  {playingAudioId === story.id ? '🔊 Audio wird abgespielt' : '✓ Audio verfügbar - Klicke zum Abspielen'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => generateAudio(story.id)}
                                    disabled={generatingAudioFor === story.id}
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg font-medium"
                                  >
                                    {generatingAudioFor === story.id ? (
                                      <>
                                        <span className="animate-spin">⏳</span>
                                        Audio wird generiert...
                                      </>
                                    ) : (
                                      <>
                                        <span>🎵</span>
                                        Audio generieren
                                      </>
                                    )}
                                  </button>
                                </div>
                                <p className="text-amber-600 text-sm">
                                  Erstelle eine Audio-Version deiner Geschichte
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Pro-Version Hinweis für Text und Downloads */}
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <span className="text-2xl">👑</span>
                              <h4 className="text-lg font-semibold text-purple-900">Pro-Version</h4>
                            </div>
                            <p className="text-purple-700 text-sm mb-4">
                              Textanzeige, Bearbeitung und Downloads sind in der Pro-Version verfügbar
                            </p>
                            
                            {/* Pro-Features Liste */}
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span className="text-purple-500">📝</span>
                                <span>Text anzeigen und bearbeiten</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span className="text-purple-500">📄</span>
                                <span>Text als TXT herunterladen</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span className="text-purple-500">🎵</span>
                                <span>Audio als MP3 herunterladen</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span className="text-purple-500">🎤</span>
                                <span>Stimme nachträglich ändern</span>
                              </div>
                            </div>
                            
                            
                            <button className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 text-sm font-medium">
                              Upgrade zu Pro
                              </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>


      </div>
        </div>
    );
}