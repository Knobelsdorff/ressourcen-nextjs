// components/AudioPlayback.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, Download, Heart, ChevronRight, Loader2 } from "lucide-react";
import { ResourceFigure, AudioState } from "@/app/page";
import { useAuth } from "@/components/providers/auth-provider";

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
  const { user } = useAuth();
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
    return audioState.storyText !== generatedStory || audioState.voiceId !== selectedVoice.id;
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
          adminPreview: isAdmin && adminPreview
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
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
    } catch (err) {
      setError('Failed to generate audio. Please try again.');
      console.error('Audio generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load audio on component mount or when needed
  useEffect(() => {
    if (needsNewAudio() && selectedVoice) {
      generateAudio(generatedStory, selectedVoice.id);
    }
  }, [needsNewAudio, selectedVoice, generatedStory]);

  // Regeneriere Audio, wenn der Admin-Sparmodus umgeschaltet wird
  useEffect(() => {
    if (selectedVoice) {
      generateAudio(generatedStory, selectedVoice.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPreview]);

  // Handle voice change
  const handleVoiceChange = (voice: Voice) => {
    setSelectedVoice(voice);
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Only generate new audio if voice actually changed
    if (audioState?.voiceId !== voice.id) {
      generateAudio(generatedStory, voice.id);
    }
    
    setShowVoiceSelection(false);
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

  const downloadAudio = () => {
    if (!audioState?.audioUrl) return;
    
    const a = document.createElement('a');
    a.href = audioState.audioUrl;
    a.download = `${selectedFigure.name}-story.mp3`;
    a.target = '_blank'; // Important for Supabase URLs
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

                  <motion.button
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={downloadAudio}
                    className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 text-amber-700 rounded-full hover:from-orange-200 hover:to-amber-200 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Download className="w-5 h-5" />
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
              </motion.div>
            )}
          </div>
        </motion.div>

            {/* Voice Selection */}
            {availableVoices.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-3xl p-6 shadow-lg border border-orange-100 mb-6"
              >
                <h3 className="text-lg font-medium text-amber-900 flex items-center gap-2 mb-4">
                  <Volume2 className="w-5 h-5" />
                  Stimme wählen
                </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {availableVoices.slice(0, 4).map((voice) => {
                const firstName = voice.name.split(' ')[0];
                
                // Erstelle einzigartige deutsche Beschreibung basierend auf Voice-ID
                let description = '';
                if (voice.id === '8N2ng9i2uiUWqstgmWlH') { // Beth
                  description = 'sanft & mütterlich';
                } else if (voice.id === 'E0OS48T5F0KU7O2NInWS') { // Lucy
                  description = 'warm & erzählend';
                } else if (voice.id === 'Z3R5wn05IrDiVCyEkUrK') { // Arabella
                  description = 'elegant & geheimnisvoll';
                } else if (voice.id === 'SaqYcK3ZpDKBAImA8AdW') { // Jane
                  description = 'intim & vertraut';
                } else if (voice.id === 'oae6GCCzwoEbfc5FHdEu') { // William
                  description = 'ruhig & weise';
                } else if (voice.id === '8TMmdpPgqHKvDOGYP2lN') { // Gregory
                  description = 'warm & tief';
                } else if (voice.id === 'iMHt6G42evkXunaDU065') { // Stefan
                  description = 'professionell & klar';
                } else if (voice.id === 'fNQuGwgi0iD0nacRyExh') { // Timothy
                  description = 'sanft & träumerisch';
                } else {
                  // Fallback basierend auf voiceType
                  if (voice.voiceType === 'maternal') {
                    description = 'warm & fürsorglich';
                  } else if (voice.voiceType === 'paternal') {
                    description = 'stark & weise';
                  } else if (voice.voiceType === 'elderly') {
                    description = 'erfahren & liebevoll';
                  } else if (voice.voiceType === 'friendly') {
                    description = 'freundlich & unterstützend';
                  } else {
                    description = 'beruhigend & klar';
                  }
                }

                const isSelected = selectedVoice?.id === voice.id;
                
                return (
                  <motion.button
                    key={voice.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleVoiceChange(voice)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-amber-500 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 shadow-md'
                        : 'border-amber-200 bg-white hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{voice.emoji}</div>
                      <p className="font-medium text-amber-900 text-sm mb-1">
                        {firstName}
                      </p>
                      <p className="text-xs text-amber-600">
                        {description}
                      </p>
                      {isSelected && (
                        <div className="mt-2 flex justify-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            
          </motion.div>
        )}

        {/* Weiter Button - immer sichtbar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center mt-8"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNext}
            disabled={!selectedVoice}
            className={`px-8 py-3 rounded-xl text-white shadow-lg transition-all flex items-center gap-2 text-lg font-medium ${
              selectedVoice
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                : 'bg-amber-300 cursor-not-allowed opacity-60'
            }`}
          >
            Weiter zur Reflexion
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
            {/* Hinweis: zusätzlicher Button unten entfernt für klare visuelle Hierarchie */}
      </motion.div>
    </div>
  );
}