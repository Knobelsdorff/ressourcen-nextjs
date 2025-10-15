// components/AudioPlayback.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, Heart, ChevronRight, Loader2, Save } from "lucide-react";
import { ResourceFigure, AudioState } from "@/app/page";
import { useAuth } from "@/components/providers/auth-provider";
import { createSPAClient } from "@/lib/supabase/client";
import { supabase } from "@/lib/supabase";

interface Voice {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
  accent?: string;
  previewUrl?: string;
  emoji: string;
  voiceType?: string;
  characteristics?: string[];
}

interface AudioPlaybackProps {
  selectedFigure: ResourceFigure;
  generatedStory: string;
  onNext: () => void;
  audioState: AudioState | null;
  onAudioStateChange: (audioState: AudioState | null) => void;
  selectedVoiceId?: string;
}

// Voices will be loaded dynamically from API

export default function AudioPlayback({
  selectedFigure,
  generatedStory,
  onNext,
  audioState,
  onAudioStateChange,
  selectedVoiceId
}: AudioPlaybackProps) {
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isGenerating, setIsGenerating] = useState(true); // Sofortiger Ladebildschirm
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingStory, setPendingStory] = useState<any>(null); // Temporäre Speicherung
  const { user, signIn, signUp } = useAuth();

  // Lade Testmodus aus localStorage - nur nach Mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedTestMode = localStorage.getItem('test_sparmodus') === '1';
      setTestMode(savedTestMode);
    }
    // Sofortiger Ladebildschirm für bessere UX
    setIsGenerating(true);
  }, []);

  // Automatisches Speichern nach erfolgreicher Anmeldung
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
      // Speichere die temporäre Geschichte
      if (pendingStory) {
        savePendingStoryToDatabase();
      } else {
        saveStoryToDatabase();
      }
    }
  }, [user, showAuthModal, pendingStory]);

  // Prüfe beim Mount, ob eine temporäre Geschichte vorhanden ist
  useEffect(() => {
    if (user && !showAuthModal) {
      const savedPendingStory = localStorage.getItem('pendingStory');
      if (savedPendingStory) {
        console.log('Found pending story, saving to database...');
        const storyData = JSON.parse(savedPendingStory);
        setPendingStory(storyData);
        savePendingStoryToDatabase();
      }
    }
  }, [user]);

  const savePendingStory = () => {
    console.log('Saving pending story to localStorage...');
    const storyData = {
      selectedFigure,
      generatedStory,
      audioState,
      selectedVoiceId,
      questionAnswers: [], // Leer für jetzt
      timestamp: Date.now()
    };
    
    // Speichere in localStorage
    localStorage.setItem('pendingStory', JSON.stringify(storyData));
    setPendingStory(storyData);
    console.log('Pending story saved:', storyData);
  };

  const savePendingStoryToDatabase = async () => {
    console.log('AudioPlayback: savePendingStoryToDatabase called');
    
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    try {
      console.log('Saving pending story to database...');
      
      const { data, error } = await supabase
        .from('saved_stories')
        .insert({
          user_id: user.id,
          title: `Reise mit ${pendingStory.selectedFigure.name}`,
          content: pendingStory.generatedStory,
          resource_figure: pendingStory.selectedFigure,
          question_answers: pendingStory.questionAnswers,
          audio_url: pendingStory.audioState?.audioUrl || null,
          voice_id: pendingStory.selectedVoiceId || null
        })
        .select();

      if (error) {
        console.error('Error saving pending story:', error);
        alert(`Fehler beim Speichern: ${error.message}`);
      } else {
        console.log('Pending story saved successfully:', data);
        alert('Ressource erfolgreich gespeichert!');
        // Lösche temporäre Daten
        localStorage.removeItem('pendingStory');
        setPendingStory(null);
        onNext(); // Weiterleitung nach erfolgreichem Speichern
      }
    } catch (err) {
      console.error('Error saving pending story:', err);
      alert(`Fehler beim Speichern: ${err}`);
    }
  };

  const saveStoryToDatabase = async () => {
    console.log('AudioPlayback: saveStoryToDatabase called');
    
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    try {
      console.log('Saving story to database...');
      
      const { data, error } = await supabase
        .from('saved_stories')
        .insert({
          user_id: user.id,
          title: `Reise mit ${selectedFigure.name}`,
          content: generatedStory,
          resource_figure: selectedFigure,
          question_answers: [], // Leer für jetzt
          audio_url: audioState?.audioUrl || null,
          voice_id: selectedVoiceId || null
        })
        .select();

      if (error) {
        console.error('Error saving story:', error);
        alert(`Fehler beim Speichern: ${error.message}`);
      } else {
        console.log('Story saved successfully:', data);
        alert('Ressource erfolgreich gespeichert!');
        onNext(); // Weiterleitung nach erfolgreichem Speichern
      }
    } catch (err) {
      console.error('Error saving story:', err);
      alert(`Fehler beim Speichern: ${err}`);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsSubmitting(true);

    try {
      if (authMode === 'register') {
        if (password !== confirmPassword) {
          setAuthError('Passwörter stimmen nicht überein');
          return;
        }
        if (password.length < 6) {
          setAuthError('Passwort muss mindestens 6 Zeichen lang sein');
          return;
        }

        const { error } = await signUp(email, password);
        
        if (error) {
          // Bessere Fehlermeldungen
          if (error.message.includes('already registered') || 
              error.message.includes('already been registered') ||
              error.message.includes('User already registered') ||
              error.message.includes('already exists')) {
            setAuthError('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail.');
          } else if (error.message.includes('Invalid email')) {
            setAuthError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
          } else {
            setAuthError(`Fehler: ${error.message}`);
          }
        } else {
          // Erfolgreiche Registrierung - zeige Erfolgsmeldung
          setAuthSuccess('Registrierung erfolgreich! Bitte überprüfe deine E-Mails und klicke auf den Bestätigungslink.');
          setTimeout(() => {
            setShowAuthModal(false);
            setAuthSuccess('');
          }, 5000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setAuthError(error.message);
        } else {
          setAuthSuccess('Anmeldung erfolgreich!');
          setTimeout(() => {
            setShowAuthModal(false);
            setAuthSuccess('');
          }, 1000);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bestimme das Geschlecht der Ressourcenfigur: priorisiere Pronomen, fallback auf Namen
  const figureGender = (() => {
    const pronouns = (selectedFigure.pronouns || '').toLowerCase();
    const primary = pronouns.split('/')[0]?.trim();
    if (primary?.startsWith('sie')) return 'female' as const;
    if (primary?.startsWith('er')) return 'male' as const;

    const name = selectedFigure.name.toLowerCase();
    if (
      name.includes('oma') ||
      name.includes('mutter') ||
      name.includes('mama') ||
      name.includes('grandma') ||
      name.includes('großmutter') ||
      name.includes('freundin') ||
      name.includes('lehrerin') ||
      name.includes('partnerin')
    ) return 'female' as const;

    return 'male' as const;
  })();

  // Lade verfügbare Stimmen von der API und filtere nach Geschlecht
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('/api/voices?collections_only=true');
        const data = await response.json();
        const allVoices: Voice[] = Array.isArray(data?.voices) ? data.voices : [];

        // Strenger Filter: nur exaktes Geschlecht gemäß Pronomen
        const genderSpecificVoices = allVoices.filter((voice: Voice) => {
          const vg = (voice.gender || '').toLowerCase();
          return figureGender === 'female' ? vg === 'female' : vg === 'male';
        });

        setAvailableVoices(genderSpecificVoices);
        console.log(`Loaded ${genderSpecificVoices.length} ${figureGender} voices for ${selectedFigure.name}`);
      } catch (error) {
        console.error('Error fetching voices:', error);
        // Fallback zu allen Stimmen
        try {
          const response = await fetch('/api/voices');
          const data = await response.json();
          const allVoices: Voice[] = Array.isArray(data?.voices) ? data.voices : [];

          // Strenger Fallback-Filter
          const genderSpecificVoices = allVoices.filter((voice: Voice) => {
            const vg = (voice.gender || '').toLowerCase();
            return figureGender === 'female' ? vg === 'female' : vg === 'male';
          });

          setAvailableVoices(genderSpecificVoices);
        } catch (fallbackError) {
          console.error('Error fetching fallback voices:', fallbackError);
        }
      }
    };
    
    fetchVoices();
  }, [figureGender]);

  // Setze die ausgewählte Stimme basierend auf selectedVoiceId
  useEffect(() => {
    if (selectedVoiceId && availableVoices.length > 0) {
      const voice = availableVoices.find(v => v.id === selectedVoiceId);
      if (voice) {
        setSelectedVoice(voice);
      }
    }
  }, [selectedVoiceId, availableVoices]);
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Admin-Sparmodus
  const isAdmin = (() => {
    const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const email = (user?.email || '').toLowerCase();
    return email && list.includes(email);
  })();
  const [adminPreview, setAdminPreview] = useState<boolean>(() => {
    try { return localStorage.getItem('admin_sparmodus') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('admin_sparmodus', adminPreview ? '1' : '0'); } catch {}
  }, [adminPreview]);

  // Check if we need to generate new audio
  const needsNewAudio = useCallback(() => {
    if (!audioState || !selectedVoice) return true;
    // If we already have an audio URL and both voice and story match, no regeneration needed
    const storyUnchanged = audioState.storyText === generatedStory;
    const voiceUnchanged = audioState.voiceId === selectedVoice.id;
    return !(audioState.audioUrl && storyUnchanged && voiceUnchanged);
  }, [audioState, generatedStory, selectedVoice]);

  // Generate audio with Supabase storage
  const generateAudio = async (text: string, voiceId: string) => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voiceId: voiceId,
          adminPreview: (isAdmin && adminPreview) || testMode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate audio`);
      }

      const result = await response.json();
      
      // Update parent state with new audio data from Supabase
      const newAudioState: AudioState = {
        audioUrl: result.audioUrl, // Supabase public URL
        voiceId,
        storyText: text,
        duration: 0, // Will be updated when metadata loads
        isGenerated: true,
        filename: result.filename
      };
      
      onAudioStateChange(newAudioState);
      setIsGenerating(false); // Audio erfolgreich geladen
    } catch (err: any) {
      console.error('Audio generation error:', err);
      
      // Spezifische Fehlermeldungen basierend auf dem Fehlertyp
      let errorMessage = 'Failed to generate audio. Please try again.';
      
      if (err.message?.includes('timeout')) {
        errorMessage = 'Audio generation timed out. Please try again.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message?.includes('HTTP')) {
        errorMessage = `Server error: ${err.message}`;
      } else if (err.message && err.message !== 'Failed to generate audio') {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load audio on component mount or when needed
  useEffect(() => {
    if (selectedVoice && generatedStory.trim().length > 0) {
      if (needsNewAudio()) {
        // Sofortiger Ladebildschirm für bessere UX
        setIsGenerating(true);
        generateAudio(generatedStory, selectedVoice.id);
      } else if (audioState?.audioUrl) {
        // We already have matching audio; ensure we are not stuck in loading state
        setIsGenerating(false);
        setError(null);
      }
    }
  }, [needsNewAudio, selectedVoice, generatedStory, audioState?.audioUrl]);

  // Regeneriere Audio nur wenn nötig, wenn der Admin-Sparmodus umgeschaltet wird
  useEffect(() => {
    if (selectedVoice && generatedStory.trim().length > 0) {
      if (needsNewAudio()) {
        setIsGenerating(true);
        generateAudio(generatedStory, selectedVoice.id);
      } else if (audioState?.audioUrl) {
        setIsGenerating(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPreview]);

  // Handle voice change
  const handleVoiceChange = (voice: Voice) => {
    // SOFORTIGER Ladebildschirm - vor allem anderen!
    setIsGenerating(true);
    
    // Sofortige UI Updates für bessere UX
    setSelectedVoice(voice);
    setIsPlaying(false);
    setCurrentTime(0);
    setShowVoiceSelection(false);
    
    // Only generate new audio if voice actually changed
    if (audioState?.voiceId !== voice.id || !audioState?.audioUrl || audioState.storyText !== generatedStory) {
      generateAudio(generatedStory, voice.id);
    } else {
      // Falls gleiche Stimme und Story sowie vorhandene URL, nicht regenerieren
      setTimeout(() => setIsGenerating(false), 300);
    }
  };

  // Enhanced progress bar click handler for seeking
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressBarRef.current;
    
    if (!audio || !progressBar || !duration) return;
    
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressBarWidth = rect.width;
    const clickRatio = clickX / progressBarWidth;
    const newTime = clickRatio * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioState?.audioUrl) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      // Update duration in parent state
      if (audioState && audio.duration !== audioState.duration) {
        onAudioStateChange({
          ...audioState,
          duration: audio.duration
        });
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const updateBuffered = () => setBufferedRanges(audio.buffered);
    const handleError = () => {
      setError('Failed to load audio. Please try regenerating.');
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('progress', updateBuffered);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('progress', updateBuffered);
      audio.removeEventListener('error', handleError);
    };
  }, [audioState, onAudioStateChange]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !audioState?.audioUrl) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('Audio play failed:', err);
        setError('Failed to play audio. Please try again.');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = 0;
    setCurrentTime(0);
    if (isPlaying) {
      audio.play();
    }
  };


  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercentage = duration > 0 && bufferedRanges && bufferedRanges.length > 0 
    ? (bufferedRanges.end(bufferedRanges.length - 1) / duration) * 100 
    : 0;

  // Verhindere Hydration-Mismatch - zeige Loading bis Mount
  if (!mounted) {
    return (
      <div className="min-h-screen p-4 lg:p-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-orange-100 mb-6"
          >
            {/* Loading State */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="flex justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
              <p className="text-amber-700">
                Erstelle und lade deine Audiogeschichte hoch...
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-12">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="text-5xl mb-4">🎧</div>
          <h2 className="text-2xl lg:text-3xl font-light text-amber-900 mb-2">
            Höre deine Geschichte
          </h2>
          <p className="text-amber-700">
            Lass <span className="font-medium">{selectedFigure.name}</span> dich zu innerer Sicherheit führen
          </p>
        </motion.div>

        {/* Main Audio Player Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-orange-100 mb-6"
        >
          {/* Resource Figure Display */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">{selectedFigure.emoji}</div>
            <h3 className="text-xl font-medium text-amber-900">{selectedFigure.name}</h3>
            {selectedFigure.description && (
              <p className="text-amber-600 text-sm mt-1">{selectedFigure.description}</p>
            )}
          </div>

          {/* Audio Controls */}
          <div className="space-y-8">
            {/* Admin-Sparmodus wird bereits bei Frage 6 gesetzt – hier kein zweiter Schalter */}
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-center"
              >
                {error}
                <button
                  onClick={() => selectedVoice && generateAudio(generatedStory, selectedVoice.id)}
                  className="ml-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Erneut versuchen
                </button>
              </motion.div>
            )}

            {/* Loading State */}
            {(isGenerating || isLoading) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="flex justify-center mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
                <p className="text-amber-700">
                  {isGenerating ? 'Erstelle und lade deine Audiogeschichte hoch...' : 'Lade Audio...'}
                </p>
              </motion.div>
            )}

            {/* Enhanced Audio Player */}
            {audioState?.audioUrl && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Beautiful Progress Bar */}
                <div className="space-y-3">
                  <div 
                    ref={progressBarRef}
                    onClick={handleProgressBarClick}
                    className="relative w-full h-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full overflow-hidden cursor-pointer group shadow-inner"
                  >
                    {/* Buffered Progress */}
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-200 to-amber-200 rounded-full"
                      style={{ width: `${bufferedPercentage}%` }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    {/* Current Progress */}
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-full shadow-sm"
                      style={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.1 }}
                    >
                      {/* Animated shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse" />
                    </motion.div>
                    
                    {/* Interactive hover indicator */}
                    <motion.div
                      className="absolute inset-y-0 w-1 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ 
                        left: `${progressPercentage}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <div className="absolute -top-2 -bottom-2 w-4 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full shadow-lg -translate-x-1/2" />
                    </motion.div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-amber-600">
                    <span className="font-medium">{formatTime(currentTime)}</span>
                    <div className="flex items-center gap-2">
                      {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span className="font-medium">{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Control Buttons */}
                <div className="flex items-center justify-center space-x-6">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: -15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={restart}
                    className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 text-amber-700 rounded-full hover:from-orange-200 hover:to-amber-200 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlayPause}
                    disabled={isLoading}
                    className="p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-7 h-7" />
                    ) : (
                      <Play className="w-7 h-7 ml-1" />
                    )}
                  </motion.button>

                </div>

                {/* Hidden Audio Element */}
                <audio 
                  ref={audioRef} 
                  src={audioState.audioUrl} 
                  preload="metadata"
                  crossOrigin="anonymous"
                  onLoadedData={() => setIsLoading(false)}
                />

                {/* Speichern Button - innerhalb des Audio-Players */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-12"
                >
                  <div className="flex justify-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        if (user) {
                          // Direkt speichern wenn angemeldet
                          await saveStoryToDatabase();
                        } else {
                          // Temporäre Speicherung für unangemeldete User
                          savePendingStory();
                          setShowAuthModal(true); // Auth-Modal öffnen
                        }
                      }}
                      className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-3 text-lg font-semibold border border-amber-400/20"
                    >
                      <Save className="w-5 h-5" />
                      Speichern
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
            {/* Hinweis: zusätzlicher Button unten entfernt für klare visuelle Hierarchie */}
      </motion.div>

      {/* Auth Modal - MOTIVIEREND & ANSPRECHEND */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            {/* Header mit Benefits */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="text-4xl mb-3"
              >
                ✨
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">
                {authMode === 'register' ? 'Deine innere Sicherheit für immer!' : 'Willkommen zurück!'}
              </h2>
              <p className="text-amber-100 text-sm leading-relaxed">
                {authMode === 'register' 
                  ? 'Erstelle einen Account und habe jederzeit Zugang zu deiner persönlichen Quelle für Sicherheit, Geborgenheit und inneren Schutz'
                  : 'Melde dich an, um auf deine gespeicherten Ressourcen zuzugreifen'
                }
              </p>
            </div>

            {/* Benefits Section */}
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="grid grid-cols-1 gap-4 mb-6">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    🛡️
                  </div>
                  <span className="text-gray-700 font-medium">Jederzeit stabilisieren & regulieren</span>
                </motion.div>
                
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    💝
                  </div>
                  <span className="text-gray-700 font-medium">Sofortige Geborgenheit in schwierigen Momenten</span>
                </motion.div>
                
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    🌟
                  </div>
                  <span className="text-gray-700 font-medium">Persönliche Ressourcen-Sammlung aufbauen</span>
                </motion.div>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    placeholder="deine@email.de"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passwort
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    placeholder="Mindestens 6 Zeichen"
                  />
                </div>
                
                {authMode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passwort bestätigen
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      placeholder="Passwort wiederholen"
                    />
                  </div>
                )}
                
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm"
                  >
                    {authError}
                  </motion.div>
                )}
                
                {authSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm"
                  >
                    {authSuccess}
                  </motion.div>
                )}
                
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Wird verarbeitet...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>{authMode === 'register' ? '✨ Account erstellen' : '🔑 Anmelden'}</span>
                    </div>
                  )}
                </motion.button>
              </form>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
                  className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                >
                  {authMode === 'register' ? 'Bereits ein Account? Hier anmelden' : 'Noch kein Account? Hier registrieren'}
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}