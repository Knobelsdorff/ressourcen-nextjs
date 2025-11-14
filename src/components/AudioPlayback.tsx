// components/AudioPlayback.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, Heart, ChevronRight, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { ResourceFigure, AudioState } from "@/app/page";
import { useAuth } from "@/components/providers/auth-provider";
import { createSPAClient } from "@/lib/supabase/client";
import { supabase } from "@/lib/supabase";
import { canCreateResource, incrementResourceCount, canAccessResource } from "@/lib/access";
import { trackEvent } from "@/lib/analytics";
import Paywall from "./Paywall";
import { isEnabled } from "@/lib/featureFlags";
import { getBackgroundMusicUrl, DEFAULT_MUSIC_VOLUME } from "@/data/backgroundMusic";
import IdealFamilyIconFinal from "./IdealFamilyIconFinal";
import JesusIconFinal from "./JesusIconFinal";
import ArchangelMichaelIconFinal from "./ArchangelMichaelIconFinal";
import AngelIconFinal from "./AngelIconFinal";
import SuperheroIconFinal from "./SuperheroIconFinal";

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
  sparModus?: boolean;
  questionAnswers?: any[];
  onShowAccountCreated?: () => void;
}

// Voices will be loaded dynamically from API

export default function AudioPlayback({
  selectedFigure,
  generatedStory,
  onNext,
  audioState,
  onAudioStateChange,
  selectedVoiceId,
  sparModus = false,
  questionAnswers = [],
  onShowAccountCreated
}: AudioPlaybackProps) {
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isGenerating, setIsGenerating] = useState(true); // Sofortiger Ladebildschirm
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('Vorbereitung...');
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
  const [backgroundMusicElement, setBackgroundMusicElement] = useState<HTMLAudioElement | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [hasAutoSaved, setHasAutoSaved] = useState(false); // Track ob bereits automatisch gespeichert wurde
  const { user, session, signIn, signUp } = useAuth();
  const router = useRouter();

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

  // Reset hasAutoSaved wenn sich die Story ändert (neue Story generiert)
  useEffect(() => {
    setHasAutoSaved(false);
  }, [generatedStory]);

  // Automatisches Speichern: Speichere Ressource automatisch, sobald Story und Audio vorhanden sind
  useEffect(() => {
    const autoSave = async () => {
      // Prüfe ob alle Bedingungen erfüllt sind
      if (!user) {
        return; // User muss eingeloggt sein
      }
      
      if (!generatedStory || generatedStory.trim().length === 0) {
        return; // Story muss vorhanden sein
      }
      
      if (!audioState?.audioUrl) {
        return; // Audio muss vorhanden sein
      }
      
      if (hasAutoSaved) {
        return; // Bereits gespeichert, nicht erneut speichern
      }
      
      if (isGenerating) {
        return; // Warte bis Audio-Generierung abgeschlossen ist
      }
      
      console.log('[AutoSave] Automatisches Speichern wird ausgelöst...');
      
      // Setze Flag sofort, um mehrfaches Speichern zu verhindern
      setHasAutoSaved(true);
      
      // Verwende die bestehende saveStoryToDatabase Funktion
      try {
        await saveStoryToDatabase();
        console.log('[AutoSave] Ressource wurde automatisch gespeichert');
      } catch (error) {
        console.error('[AutoSave] Fehler beim automatischen Speichern:', error);
        // Setze Flag zurück, damit es bei nächster Gelegenheit erneut versucht wird
        setHasAutoSaved(false);
      }
    };
    
    autoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, generatedStory, audioState?.audioUrl, hasAutoSaved, isGenerating]);

  const savePendingStory = () => {
    console.log('Saving pending story to localStorage...');
    const storyData = {
      selectedFigure,
      generatedStory,
      audioState,
      selectedVoiceId,
      questionAnswers: questionAnswers || [],
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
    
    if (!pendingStory) {
      console.log('No pending story found');
      return;
    }
    
    try {
      // Feature-Gating: Prüfe ob User noch Ressourcen erstellen kann
      // Nur wenn Paywall-Feature aktiviert ist
      const paywallEnabled = isEnabled('PAYWALL_ENABLED');
      
      if (paywallEnabled) {
        const { data: existingStories } = await supabase
          .from('saved_stories')
          .select('id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        
        const resourceCount = existingStories?.length || 0;
        console.log(`[savePendingStoryToDatabase] User has ${resourceCount} resource(s)`);
        
        // 1. Ressource ist gratis (immer erlaubt)
        if (resourceCount === 0) {
          console.log('[savePendingStoryToDatabase] First resource is free - allowing save');
        } else {
          // Ab der 2. Ressource: IMMER Paywall prüfen
          console.log(`[savePendingStoryToDatabase] User has ${resourceCount} resource(s), checking access for next resource...`);
          const canCreate = await canCreateResource(user.id);
          
          if (!canCreate) {
            console.log('[savePendingStoryToDatabase] User cannot create more resources - showing paywall');
            setShowPaywall(true);
            return;
          }
        }
      }
      
      console.log('Saving pending story to database...');
      
      const { data, error } = await (supabase as any)
        .from('saved_stories')
        .insert({
          user_id: user.id,
          title: pendingStory.selectedFigure.name,
          content: pendingStory.generatedStory,
          resource_figure: pendingStory.selectedFigure.name,
          question_answers: Array.isArray(pendingStory.questionAnswers) ? pendingStory.questionAnswers : [],
          audio_url: pendingStory.audioState?.audioUrl || null,
          voice_id: pendingStory.selectedVoiceId || null
        })
        .select();

      if (error) {
        console.error('Error saving pending story:', error);
        // Kein Popup - nur Console-Log
      } else {
        console.log('Pending story saved successfully:', data);
        // Kein Popup - nur Console-Log
        // Lösche temporäre Daten
        localStorage.removeItem('pendingStory');
        setPendingStory(null);
        onNext(); // Weiterleitung nach erfolgreichem Speichern
      }
    } catch (err) {
      console.error('Error saving pending story:', err);
      // Kein Popup - nur Console-Log
    }
  };

  const saveStoryToDatabase = async () => {
    console.log('AudioPlayback: saveStoryToDatabase called');
    
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    try {
      // Feature-Gating: Prüfe ob User noch Ressourcen erstellen kann
      // Nur wenn Paywall-Feature aktiviert ist
      const paywallEnabled = isEnabled('PAYWALL_ENABLED');
      
      if (paywallEnabled) {
      // 1. Ressource ist gratis für 3 Tage, danach benötigt man Zugang
      const { data: existingStories } = await supabase
        .from('saved_stories')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      const resourceCount = existingStories?.length || 0;
      
        // 1. Ressource ist gratis (immer erlaubt)
      if (resourceCount === 0) {
        console.log('First resource is free - allowing save');
      } else {
          // Ab der 2. Ressource: IMMER Paywall prüfen (keine 3-Tage-Regel für 2. Ressource)
          console.log(`User has ${resourceCount} resource(s), checking access for next resource...`);
          const canCreate = await canCreateResource(user.id);
          
          if (!canCreate) {
            console.log('User cannot create more resources - showing paywall');
            setShowPaywall(true);
            return;
          }
        }
      }

      console.log('Checking for existing duplicate story...');
      
      let shouldSkipSave = false;
      
      try {
        // Robuste Duplikat-Prüfung - prüfe nach title, content und user_id
        console.log('AudioPlayback: Checking for duplicates with title:', selectedFigure.name, 'and content:', generatedStory.substring(0, 50) + '...');
        
        const { data: existingStories, error: checkError } = await supabase
          .from('saved_stories')
          .select('id, title, content, created_at')
          .eq('user_id', user.id)
          .eq('title', selectedFigure.name)
          .eq('content', generatedStory)
          .order('created_at', { ascending: false });

        if (checkError) {
          console.error('Error checking for duplicates:', checkError);
          console.log('Continuing with save despite duplicate check error...');
        } else if (existingStories && existingStories.length > 0) {
          console.log('AudioPlayback: Duplicate story found, skipping save to prevent duplicates');
          console.log('AudioPlayback: Found', existingStories.length, 'existing stories with same title');
          shouldSkipSave = true;
        } else {
          console.log('AudioPlayback: No duplicates found, proceeding with save');
        }
      } catch (duplicateCheckError) {
        console.error('Error during duplicate check:', duplicateCheckError);
        console.log('Continuing with save despite duplicate check error...');
      }

      if (shouldSkipSave) {
        return;
      }

      console.log('No duplicates found, saving story to database...');
      
      // Debug: Logge die questionAnswers vor dem Speichern
      console.log('[AudioPlayback] questionAnswers before save:', JSON.stringify(questionAnswers, null, 2));
      questionAnswers.forEach((qa: any, index: number) => {
        console.log(`[AudioPlayback] Question ${qa.questionId || index} before save:`, {
          questionId: qa.questionId,
          selectedBlocks: qa.selectedBlocks,
          selectedBlocksCount: qa.selectedBlocks?.length || 0,
          customBlocks: qa.customBlocks,
          customBlocksCount: qa.customBlocks?.length || 0,
          answer: qa.answer,
          fullQA: qa
        });
      });
      
      const { data, error } = await (supabase as any)
        .from('saved_stories')
        .insert({
          user_id: user.id,
          title: selectedFigure.name,
          content: generatedStory,
          resource_figure: selectedFigure.name,
          question_answers: Array.isArray(questionAnswers) ? questionAnswers : [],
          audio_url: audioState?.audioUrl || null,
          voice_id: selectedVoiceId || null
        })
        .select();

      if (error) {
        console.error('Error saving story:', error);
        // Kein Popup - nur Console-Log
      } else {
        console.log('Story saved successfully:', data);
        
        // Track Resource Creation Event (nur wenn User eingeloggt ist)
        if (user && data && data[0]) {
          try {
            await trackEvent({
              eventType: 'resource_created',
              storyId: data[0].id,
              resourceFigureName: selectedFigure.name,
              voiceId: selectedVoiceId || undefined,
            }, { accessToken: session?.access_token || null });
            console.log('✅ Resource creation event tracked successfully');
          } catch (trackError) {
            console.error('❌ Failed to track resource_created event:', trackError);
            // Nicht kritisch - Ressource wurde bereits gespeichert
          }
        } else {
          console.warn('⚠️ Cannot track resource_created event:', {
            hasUser: !!user,
            hasData: !!data,
            hasDataItem: !!(data && data[0]),
            hasSession: !!session,
            hasAccessToken: !!session?.access_token
          });
        }
        
        // Erhöhe Ressourcen-Zähler nur wenn User bereits Zugang hat (nicht für 1. gratis Ressource)
        // Prüfe ob user_access existiert - wenn ja, dann increment
        const { data: userAccess } = await supabase
          .from('user_access')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        // Nur Zähler erhöhen, wenn User bereits Zugang hat (also nach Zahlung)
        if (userAccess) {
          await incrementResourceCount(user.id);
        }
        // Kein Popup - nur Console-Log
      }
    } catch (err) {
      console.error('Error saving story:', err);
      // Kein Popup - nur Console-Log
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
          // Erfolgreiche Registrierung - zeige AccountCreated Seite
          setShowAuthModal(false);
          if (onShowAccountCreated) {
            onShowAccountCreated();
          }
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setAuthError(error.message);
        } else {
          setAuthSuccess('Anmeldung erfolgreich!');
          // Speichere temporäre Ressource sofort nach Login
          setTimeout(() => {
            if (pendingStory) {
              savePendingStoryToDatabase();
            }
          }, 500);
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

  const handleSaveStory = async () => {
    // Speichere IMMER zuerst als temporäre Geschichte
    savePendingStory();
    
    if (user) {
      // Prüfe ZUERST ob User Ressource speichern kann (Paywall-Prüfung)
      // Nur wenn Paywall-Feature aktiviert ist
      const paywallEnabled = isEnabled('PAYWALL_ENABLED');
      
      if (paywallEnabled) {
        console.log('[handleSaveStory] Checking if user can save resource...');
        
        const { data: existingStories } = await supabase
          .from('saved_stories')
          .select('id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        
        const resourceCount = existingStories?.length || 0;
        console.log(`[handleSaveStory] User has ${resourceCount} resource(s) in database`);
        
        // 1. Ressource ist gratis (immer erlaubt)
        if (resourceCount === 0) {
          console.log('[handleSaveStory] First resource is free - allowing save');
        } else {
          // Ab der 2. Ressource: IMMER Paywall prüfen
          console.log(`[handleSaveStory] User has ${resourceCount} resource(s), checking access for next resource...`);
          const canCreate = await canCreateResource(user.id);
          
          if (!canCreate) {
            console.log('[handleSaveStory] User cannot create more resources - showing paywall');
            setShowPaywall(true);
            return; // Wichtig: Früher Return, damit nicht gespeichert wird
          }
        }
      }
      
      // Wenn angemeldet und Zugang erlaubt, versuche sofort in der Datenbank zu speichern
      try {
        await saveStoryToDatabase();
        
        // Lösche temporäre Daten nach erfolgreichem Speichern
        localStorage.removeItem('pendingStory');
        setPendingStory(null);
        // Direkt zum Dashboard navigieren nach erfolgreichem Speichern
        router.push('/dashboard');
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
        // Trotzdem zum Dashboard navigieren (temporäre Geschichte bleibt erhalten)
        router.push('/dashboard');
      }
    } else {
      // Für unangemeldete User: Auth-Modal öffnen
      setShowAuthModal(true);
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

  // Generate audio with Supabase storage and progress tracking
  const generateAudio = async (text: string, voiceId: string) => {
    let progressInterval: NodeJS.Timeout | null = null;
    let statusInterval: NodeJS.Timeout | null = null;
    
    try {
      setIsGenerating(true);
      setError(null);
      setGenerationProgress(0);
      setGenerationStatus('Vorbereitung...');

      // Simulate realistic progress based on text length
      const textLength = text.length;
      const estimatedTime = Math.max(30, Math.min(120, textLength / 20)); // 30-120 seconds based on text length
      
      progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until completion
          const increment = Math.random() * 3 + 1; // 1-4% per interval
          return Math.min(90, prev + increment);
        });
      }, 1000);

      // Update status messages
      statusInterval = setInterval(() => {
        setGenerationStatus(prev => {
          const statuses = [
            'Text wird analysiert...',
            'Stimme wird vorbereitet...',
            'Audio wird generiert...',
            'Qualität wird optimiert...',
            'Finalisierung läuft...'
          ];
          const currentIndex = statuses.indexOf(prev);
          const nextIndex = (currentIndex + 1) % statuses.length;
          return statuses[nextIndex];
        });
      }, 15000);

      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voiceId: voiceId,
          adminPreview: sparModus // Use sparModus setting
        }),
      });

      if (!response.ok) {
        if (progressInterval) clearInterval(progressInterval);
        if (statusInterval) clearInterval(statusInterval);
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate audio`);
      }

      // Clear intervals and set final progress
      if (progressInterval) clearInterval(progressInterval);
      if (statusInterval) clearInterval(statusInterval);
      setGenerationProgress(100);
      setGenerationStatus('Fertig!');

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
      
      // Clear intervals on error
      if (progressInterval) clearInterval(progressInterval);
      if (statusInterval) clearInterval(statusInterval);
      
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

  // Cleanup: Stoppe Hintergrundmusik beim Unmount
  useEffect(() => {
    return () => {
      if (backgroundMusicElement) {
        backgroundMusicElement.pause();
        backgroundMusicElement.currentTime = 0;
      }
    };
  }, [backgroundMusicElement]);

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
      
      // Stoppe oder fade out Hintergrundmusik wenn Stimme endet
      if (backgroundMusicElement) {
        // Fade-out über 3 Sekunden
        const fadeOutDuration = 3000;
        const startVolume = backgroundMusicElement.volume;
        const fadeSteps = fadeOutDuration / 50; // Update alle 50ms
        let currentStep = 0;
        
        const fadeInterval = setInterval(() => {
          if (!backgroundMusicElement || backgroundMusicElement.paused) {
            clearInterval(fadeInterval);
            return;
          }
          
          currentStep++;
          const newVolume = Math.max(0, startVolume * (1 - currentStep / fadeSteps));
          backgroundMusicElement.volume = newVolume;
          
          if (currentStep >= fadeSteps || newVolume <= 0) {
            clearInterval(fadeInterval);
            backgroundMusicElement.pause();
            backgroundMusicElement.currentTime = 0;
            backgroundMusicElement.volume = DEFAULT_MUSIC_VOLUME; // Reset
            console.log('[AudioPlayback] Background music faded out');
          }
        }, 50);
      }
      
      // Track vollständigen Audio-Play (nur wenn User eingeloggt ist UND eine gültige Session hat)
      if (user && session && audioState?.audioUrl && audio.duration) {
        trackEvent({
          eventType: 'audio_play_complete',
          resourceFigureName: selectedFigure.name,
          voiceId: selectedVoiceId || undefined,
          metadata: {
            completed: true,
            audioDuration: audio.duration,
          },
        }, { accessToken: session.access_token });
      }
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const updateBuffered = () => setBufferedRanges(audio.buffered);
    const handleError = () => {
      setError('Failed to load audio. Please try regenerating.');
      setIsLoading(false);
    };

    // Fade-out Musik 4 Sekunden vor dem Ende
    const handleTimeUpdate = () => {
      updateTime();
      if (backgroundMusicElement && audio.duration && audio.currentTime >= audio.duration - 4 && !audio.ended) {
        // Starte Fade-Out
        if (!(backgroundMusicElement as any)._fadeOutStarted) {
          (backgroundMusicElement as any)._fadeOutStarted = true;
          const fadeOutDuration = 3500;
          const startVolume = backgroundMusicElement.volume;
          const fadeSteps = fadeOutDuration / 50;
          let currentStep = 0;
          
          const fadeInterval = setInterval(() => {
            if (!backgroundMusicElement || backgroundMusicElement.paused) {
              clearInterval(fadeInterval);
              return;
            }
            
            currentStep++;
            const newVolume = Math.max(0, startVolume * (1 - currentStep / fadeSteps));
            backgroundMusicElement.volume = newVolume;
            
            if (currentStep >= fadeSteps || newVolume <= 0) {
              clearInterval(fadeInterval);
              backgroundMusicElement.pause();
              backgroundMusicElement.currentTime = 0;
              backgroundMusicElement.volume = DEFAULT_MUSIC_VOLUME;
            }
          }, 50);
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('progress', updateBuffered);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('progress', updateBuffered);
      audio.removeEventListener('error', handleError);
    };
  }, [audioState, onAudioStateChange, user, session, selectedFigure, selectedVoiceId, backgroundMusicElement]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !audioState?.audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      // Pausiere auch Hintergrundmusik
      if (backgroundMusicElement) {
        backgroundMusicElement.pause();
        console.log('[AudioPlayback] Background music paused');
      }
      return;
    }
    
    // Prüfe ob User Zugang hat (nur wenn eingeloggt und Paywall aktiviert)
    const paywallEnabled = isEnabled('PAYWALL_ENABLED');
    
    if (user && paywallEnabled) {
      console.log('[AudioPlayback] Checking access before playing audio...');
      
      // Prüfe zuerst ob User ein Admin ist - Admins haben immer Zugriff
      const fullAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
      const musicAdminEmails = (process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
      const userEmail = user.email?.toLowerCase().trim();
      const isAdmin = userEmail && (fullAdminEmails.includes(userEmail) || musicAdminEmails.includes(userEmail));
      
      if (isAdmin) {
        console.log(`[AudioPlayback] User is admin (${userEmail}) - allowing audio playback without paywall`);
        // Admin hat immer Zugriff - weiter mit Audio-Playback
      } else {
        // Prüfe ob User bereits Ressourcen hat (für 2. Ressource Paywall)
        const { data: existingStories } = await supabase
          .from('saved_stories')
          .select('id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        
        const resourceCount = existingStories?.length || 0;
        console.log(`[AudioPlayback] User has ${resourceCount} resource(s) in database`);
        
        // Wenn User bereits 1+ Ressourcen hat, ist diese neue Ressource (noch nicht gespeichert) die 2.+ - Paywall prüfen
        if (resourceCount >= 1) {
          // Prüfe ob User aktiven Zugang hat
          const { hasActiveAccess } = await import('@/lib/access');
          const hasAccess = await hasActiveAccess(user.id);
          
          if (!hasAccess) {
            console.log('[AudioPlayback] User has 1+ resources but no active access - showing paywall');
            setShowPaywall(true);
            return;
          }
        } else if (resourceCount === 1 && existingStories && existingStories.length === 1) {
          // Erste Ressource existiert bereits - prüfe 3-Tage-Regel
          const firstResource = (existingStories as Array<{ created_at: string }>)[0];
          const firstResourceDate = new Date(firstResource.created_at);
          const daysSinceFirst = (Date.now() - firstResourceDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceFirst >= 3) {
            console.log('[AudioPlayback] First resource trial expired - showing paywall');
            setShowPaywall(true);
            return;
          }
        }
        // Wenn resourceCount === 0: Erste Ressource, Audio ist erlaubt (innerhalb von 3 Tagen nach Erstellung)
      }
    }

    // Hole Hintergrundmusik-URL für diese Figur
    const figureIdOrName = selectedFigure?.id || selectedFigure?.name;
    console.log('[AudioPlayback] ===== LOADING BACKGROUND MUSIC =====');
    console.log('[AudioPlayback] Figure ID/Name:', figureIdOrName);
    
    let musicUrl: string | null = null;
    if (figureIdOrName && musicEnabled) {
      try {
        musicUrl = await getBackgroundMusicUrl(figureIdOrName);
        console.log('[AudioPlayback] Background music URL:', musicUrl);
      } catch (error) {
        console.error('[AudioPlayback] Error loading background music:', error);
      }
    }

    // Starte Hintergrundmusik ZUERST (bei Sekunde 0), wenn verfügbar
    if (musicUrl && musicEnabled) {
      try {
        // Stoppe vorherige Musik
        if (backgroundMusicElement) {
          backgroundMusicElement.pause();
          backgroundMusicElement.currentTime = 0;
        }

        // Erstelle neues Musik-Element
        const musicAudio = new Audio(musicUrl);
        musicAudio.crossOrigin = 'anonymous';
        musicAudio.loop = true;
        musicAudio.volume = DEFAULT_MUSIC_VOLUME;
        
        setBackgroundMusicElement(musicAudio);
        
        // Starte Musik
        musicAudio.currentTime = 0;
        await musicAudio.play();
        console.log('[AudioPlayback] Background music started (at 0s)');
        
        // Warte 3 Sekunden bevor die Stimme startet
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (musicError: any) {
        console.error('[AudioPlayback] Failed to play background music:', musicError);
        // Musik-Fehler nicht blockieren - spiele Stimme trotzdem
      }
    }

    // Spiele Stimme ab (nach 3 Sekunden Verzögerung, wenn Musik läuft)
    audio.play().then(() => {
      setIsPlaying(true);
      // Track Audio-Play Event (nur wenn User eingeloggt ist UND eine gültige Session hat)
      if (user && session) {
        trackEvent({
          eventType: 'audio_play',
          resourceFigureName: selectedFigure.name,
          voiceId: selectedVoiceId || undefined,
        }, { accessToken: session.access_token });
      }
    }).catch((err) => {
        console.error('Audio play failed:', err);
        setError('Failed to play audio. Please try again.');
      setIsPlaying(false);
      });
  };

  const restart = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Prüfe Zugang auch beim Restart (gleiche Logik wie togglePlayPause)
    // Nur wenn Paywall-Feature aktiviert ist
    const paywallEnabled = isEnabled('PAYWALL_ENABLED');
    
    if (user && audioState?.audioUrl && paywallEnabled) {
      const { data: existingStories } = await supabase
        .from('saved_stories')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      const resourceCount = existingStories?.length || 0;
      
      if (resourceCount >= 1) {
        const { hasActiveAccess } = await import('@/lib/access');
        const hasAccess = await hasActiveAccess(user.id);
        
        if (!hasAccess) {
          setShowPaywall(true);
          return;
        }
      }
    }
    
    audio.currentTime = 0;
    setCurrentTime(0);
    if (isPlaying) {
      audio.play().then(() => {
        // Track Audio-Play Event beim Restart (nur wenn User eingeloggt ist UND eine gültige Session hat)
        if (user && session) {
          trackEvent({
            eventType: 'audio_play',
            resourceFigureName: selectedFigure.name,
            voiceId: selectedVoiceId || undefined,
          }, { accessToken: session.access_token });
        }
      }).catch((err) => {
        console.error('Audio play failed on restart:', err);
      });
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
              <div className="flex justify-center mb-6">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
              
              {/* Progress Bar */}
              <div className="max-w-md mx-auto mb-4">
                <div className="bg-amber-100 rounded-full h-3 mb-3">
                  <motion.div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-sm text-amber-600">
                  <span>{generationProgress.toFixed(0)}%</span>
                  <span>{generationStatus}</span>
                </div>
              </div>
              
              <p className="text-amber-700 text-sm">
                {generationProgress < 100 
                  ? 'Bitte warten, während deine Geschichte in Audio umgewandelt wird...'
                  : 'Audio erfolgreich generiert!'
                }
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show loading state with progress bar during audio generation
  if (isGenerating) {
    return (
      <div className="min-h-screen p-4 lg:p-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-orange-100 mb-6"
          >
            {/* Loading State with Progress */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="flex justify-center mb-6">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
              
              {/* Progress Bar */}
              <div className="max-w-md mx-auto mb-4">
                <div className="bg-amber-100 rounded-full h-3 mb-3">
                  <motion.div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-sm text-amber-600">
                  <span>{generationProgress.toFixed(0)}%</span>
                  <span>{generationStatus}</span>
                </div>
              </div>
              
              <p className="text-amber-700 text-sm">
                {generationProgress < 100 
                  ? 'Bitte warten, während deine Geschichte in Audio umgewandelt wird...'
                  : 'Audio erfolgreich generiert!'
                }
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
          <div className="text-5xl mb-4">💎</div>
          <h2 className="text-2xl lg:text-3xl font-light text-amber-900 mb-2">
            Deine Ressource
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
            <div className="text-4xl mb-3 flex justify-center">
              {selectedFigure.id === 'ideal-family' ? (
                <IdealFamilyIconFinal size={60} className="w-12 h-12" />
              ) : selectedFigure.id === 'jesus' ? (
                <JesusIconFinal size={60} className="w-12 h-12" />
              ) : selectedFigure.id === 'archangel-michael' ? (
                <ArchangelMichaelIconFinal size={60} className="w-12 h-12" />
              ) : selectedFigure.id === 'angel' ? (
                <AngelIconFinal size={60} className="w-12 h-12" />
              ) : selectedFigure.id === 'superhero' ? (
                <SuperheroIconFinal size={60} className="w-12 h-12" />
              ) : (
                selectedFigure.emoji
              )}
            </div>
            <h3 className="text-xl font-medium text-amber-900">{selectedFigure.name}</h3>
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

                {/* Zum Dashboard Button - direkt unter dem Play-Button */}
                {/* Für eingeloggte User: Zeige Bestätigung wenn automatisch gespeichert */}
                {user && hasAutoSaved && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 flex justify-center"
                  >
                    <div className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      Ressource wurde automatisch gespeichert
                    </div>
                  </motion.div>
                )}
                
                {/* Für nicht eingeloggte User: Zeige "Ressource speichern" Button */}
                {!user && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 flex justify-center"
                  >
                    <button
                      onClick={handleSaveStory}
                      className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 flex items-center gap-2"
                    >
                      <span className="text-lg">💾</span>
                      Ressource speichern
                    </button>
                  </motion.div>
                )}

                {/* Bilaterale Stimulation Anleitung */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-blue-900 mb-2">
                      Bilaterale Stimulation
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Klopfe abwechselnd auf deine Oberarme, während du der Geschichte zuhörst
                    </p>
                  </div>
                  
              {/* Video Anleitung */}
              <div className="flex justify-center mb-6">
                <video
                  className="w-full max-w-md rounded-xl shadow-lg bg-gray-100"
                  controls
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  autoPlay
                >
                  <source src="/videos/Bilaterale Stimulation.mp4" type="video/mp4" />
                  <div className="flex items-center justify-center h-48 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <div className="text-center">
                      <p className="text-gray-600 text-sm">Video wird geladen...</p>
                    </div>
                  </div>
                </video>
              </div>
                  
                  <div className="text-center">
                    <p className="text-blue-600 text-base">
                      <span className="text-xl">💡</span> Dies hilft deinem Gehirn, die Geschichte besser zu verarbeiten und zu integrieren
                    </p>
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

      {/* Paywall Modal */}
      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          message="Deine kostenlose 3-Tage-Trial-Periode ist abgelaufen. Fühle dich jeden Tag sicher, geborgen und beschützt"
        />
      )}
    </div>
  );
}