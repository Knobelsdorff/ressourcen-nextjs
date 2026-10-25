"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Loader2, Headphones } from "lucide-react";
import { useRouter } from "next/navigation";
import { ResourceFigure, AudioState } from "@/lib/types/story";
import { useAuth } from "@/components/providers/auth-provider";
import { createSPAClient } from "@/lib/supabase/client";
import { supabase } from "@/lib/supabase";
import { canCreateResource, incrementResourceCount, canAccessResource } from "@/lib/access";
import { trackEvent } from "@/lib/analytics";
import Paywall from "./Paywall";
import SubscriptionOffer from "./dashboard/SubscriptionOffer";
import { markFreeStoryOfferShown, shouldShowFreeStoryOffer } from "@/lib/first-story/offer-client";
import { isEnabled } from "@/lib/featureFlags";
import { getBackgroundMusicUrl, DEFAULT_MUSIC_VOLUME } from "@/data/backgroundMusic";
import { applyMusicVolumeFactor } from "@/lib/musicVolumePreference";
import { getOrCreateBrowserFingerprint } from "@/lib/browser-fingerprint";
import FigureIcon from "./story-flow/FigureIcon";
import StoryGenerationLoader from "./story-flow/StoryGenerationLoader";
import { prefetchVoices } from "./VoiceSelection";
import { storyTimeline } from "@/lib/story-progress";
import { track } from "@/lib/product-analytics/client";
import { figureProps } from "@/lib/product-analytics/events";
import { type StoryPlayContext, storyPlayCompleted, storyPlayStarted } from "@/lib/product-analytics/story-plays";

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
  storyGenerationError?: string | null;
  isGeneratingStory?: boolean;
  onFirstStorySaved?: () => void;
  /** Story-Text neu anfordern, nachdem er nicht erstellt werden konnte. */
  onRetryStory?: () => void;
  /** Zurück zur Stimmwahl, wenn die Stimme nicht aufgenommen werden konnte. */
  onChangeVoice?: () => void;
}

// Voices will be loaded dynamically from API

/**
 * Generiert einen figurenspezifischen Text mit korrektem Artikel
 * Sonderfall: Engel → "Die Engelsfigur ist nun für dich da."
 * Alle anderen: Artikel basierend auf Pronomen + Figurenname
 */
function getFigurePresenceText(figure: ResourceFigure): string {
  // Sonderfall: Engel
  if (figure.id === 'angel') {
    return 'Die Engelsfigur ist nun für dich da.';
  }
  
  // Artikel basierend auf Pronomen bestimmen
  let article = 'Die'; // Default
  if (figure.pronouns === 'er/ihm') {
    article = 'Der';
  } else if (figure.pronouns === 'es/sein') {
    article = 'Das';
  }
  
  return `${article} ${figure.name} ist nun für dich da.`;
}

export default function AudioPlayback({
  selectedFigure,
  generatedStory,
  onNext,
  audioState,
  onAudioStateChange,
  selectedVoiceId,
  sparModus = false,
  questionAnswers = [],
  onShowAccountCreated,
  storyGenerationError = null,
  isGeneratingStory = false,
  onFirstStorySaved,
  onRetryStory,
  onChangeVoice
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
  const [musicDuration, setMusicDuration] = useState(0); // Duration of background music
  const [combinedDuration, setCombinedDuration] = useState(0); // Max of voice or music duration
  const [isLoadingAudio, setIsLoadingAudio] = useState(false); // Loading state for both audios
  const [isAudioReady, setIsAudioReady] = useState(false); // Track when audio is actually playable
  const [hasAutoSaved, setHasAutoSaved] = useState(false); // Track ob bereits automatisch gespeichert wurde
  const firstStorySaveStarted = useRef(false);
  const firstStorySaveFinished = useRef(false);
  // Mehrere Pfade (autoSave, pendingStory, Login-Modal) können dieselbe Story
  // gleichzeitig speichern wollen. Pro Story wird nur EIN Insert ausgeführt;
  // weitere Aufrufe bekommen dasselbe Ergebnis statt einer zweiten Zeile.
  // `duplicateOf` nennt den Pfad, der den Insert tatsächlich ausgeführt hat.
  type SaveSource = 'saveStoryToDatabase' | 'savePendingStoryToDatabase';
  const storyInsertsRef = useRef(new Map<string, { source: SaveSource; promise: Promise<{ data: any; error: any }> }>());

  const insertStoryOnce = async (
    insertData: Record<string, any>,
    source: SaveSource
  ): Promise<{ data: any; error: any; duplicateOf: SaveSource | null }> => {
    const key = `${insertData.user_id}:${insertData.audio_url || insertData.content || ''}`;
    const existing = storyInsertsRef.current.get(key);
    if (existing) {
      console.log('[AudioPlayback] Story wird bereits gespeichert – kein zweiter Insert');
      return { ...(await existing.promise), duplicateOf: existing.source };
    }
    const promise = (supabase as any)
      .from('saved_stories')
      .insert(insertData)
      .select()
      .then((result: { data: any; error: any }) => {
        // Nach einem Fehler darf ein späterer Versuch neu speichern.
        if (result.error) storyInsertsRef.current.delete(key);
        else {
          savedStoryIdRef.current = result.data?.[0]?.id ?? savedStoryIdRef.current;
          rememberFreeTrialStory(result.data?.[0]);
        }
        return result;
      });
    storyInsertsRef.current.set(key, { source, promise });
    return { ...(await promise), duplicateOf: null };
  };
  // Gratis-Story aus dem normalen Flow: Der Server legt fest, ob die eben
  // gespeicherte Story die Gratis-Story ist (7 Tage, bzw. FIRST_STORY_TRIAL_MINUTES),
  // und setzt die Testphase. Sobald sie bis zum Ende gehört oder ans Ende
  // gespult wurde, kommt einmalig dasselbe Abo-Angebot wie im Dashboard.
  const freeTrialStoryIdRef = useRef<string | null>(null);
  // Funnel: gespeicherte Story (für Start/Ende/erneutes Hören), sonst "unsaved".
  const savedStoryIdRef = useRef<string | null>(null);
  const playContext = (): StoryPlayContext => ({
    storyId: savedStoryIdRef.current ?? 'unsaved',
    access: freeTrialStoryIdRef.current ? 'trial' : savedStoryIdRef.current ? 'always' : 'unsaved',
    location: 'create_story',
  });
  const freeTrialOfferBusyRef = useRef(false);
  const freeTrialOfferScheduledRef = useRef(false);
  const [showSubscriptionOffer, setShowSubscriptionOffer] = useState(false);
  const closeSubscriptionOffer = useCallback(() => setShowSubscriptionOffer(false), []);

  const rememberFreeTrialStory = (row: { id?: string; first_story_draft_id?: string | null; is_audio_only?: boolean } | undefined) => {
    if (!row?.id || row.first_story_draft_id || row.is_audio_only) return;
    const storyId = row.id;
    fetch('/api/first-story/free-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ storyId }),
    })
      .then((response) => response.json())
      .then(({ policy }) => { if (policy === 'trial') freeTrialStoryIdRef.current = storyId; })
      .catch(() => { /* Ohne Antwort kein Angebot – die Story bleibt abspielbar. */ });
  };

  const requestFreeTrialOffer = useCallback(async () => {
    const storyId = freeTrialStoryIdRef.current;
    if (!storyId || freeTrialOfferBusyRef.current || freeTrialOfferScheduledRef.current) return;
    freeTrialOfferBusyRef.current = true;
    try {
      if (!(await shouldShowFreeStoryOffer(storyId))) return;
      freeTrialOfferScheduledRef.current = true;
      // Kurz nachklingen lassen, statt das Ende der Geschichte zu überdecken.
      // Als "gezeigt" gilt es erst, wenn es wirklich aufgeht.
      setTimeout(() => {
        setShowSubscriptionOffer(true);
        markFreeStoryOfferShown(storyId);
      }, 2500);
    } finally {
      freeTrialOfferBusyRef.current = false;
    }
  }, []);

  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false); // Track ob User bereits Play gedrückt hat
  const [showPostAudioPanel, setShowPostAudioPanel] = useState(false); // Show calm "after" panel
  const [showPostAudioCTA, setShowPostAudioCTA] = useState(false); // Show CTA after delay
  const [isFirstStoryPlayback, setIsFirstStoryPlayback] = useState<boolean | null>(null); // null = noch nicht geprüft
  const { user, session, signIn, signUp } = useAuth();
  const router = useRouter();

  // Prüfe Cookie-basiertes Trust beim Mount (für zukünftige Sessions)
  useEffect(() => {
    // Cookie wird nach erfolgreicher Registrierung/Login gesetzt
  }, []);

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

  // Automatisches Speichern nach erfolgreicher Anmeldung (wenn Auth Modal geschlossen wird)
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
      // Die eigentliche Speicherung erfolgt durch den pendingStory useEffect unten
      // wenn pendingStory gesetzt ist, oder saveStoryToDatabase wenn nicht
      if (!pendingStory) {
        console.log('poopoo [AudioPlayback] Auth modal closed, no pendingStory, saving current story...');
        saveStoryToDatabase();
      }
      // Wenn pendingStory existiert, wird es durch den useEffect unten gespeichert
    }
  }, [user, showAuthModal]);

  // Prüfe beim Mount, ob eine temporäre Geschichte in localStorage vorhanden ist
  useEffect(() => {
    if (user && !showAuthModal && !onFirstStorySaved) {
      const savedPendingStory = localStorage.getItem('pendingStory');
      if (savedPendingStory) {
        console.log('poopoo [AudioPlayback] Found pending story in localStorage, parsing...');
        const storyData = JSON.parse(savedPendingStory);
        console.log('poopoo [AudioPlayback] Parsed pending story from localStorage:', JSON.stringify({
          hasAudioState: !!storyData.audioState,
          audioUrl: storyData.audioState?.audioUrl,
          selectedFigure: storyData.selectedFigure?.name,
          selectedVoiceId: storyData.selectedVoiceId
        }, null, 2));
        setPendingStory(storyData);
        // Note: savePendingStoryToDatabase will be called by the useEffect below
        // that watches for pendingStory changes
      }
    }
  }, [user, showAuthModal, onFirstStorySaved]);

  // When pendingStory is set and user is logged in, save to database
  // This is the ONLY place that should call savePendingStoryToDatabase
  useEffect(() => {
    if (user && pendingStory) {
      console.log('poopoo [AudioPlayback] pendingStory detected, checking if ready to save...');
      console.log('poopoo [AudioPlayback] pendingStory.audioState:', JSON.stringify({
        hasAudioState: !!pendingStory.audioState,
        audioUrl: pendingStory.audioState?.audioUrl
      }));

      // Only save if we have the audio URL
      if (pendingStory.audioState?.audioUrl) {
        console.log('poopoo [AudioPlayback] pendingStory has audioUrl, saving to database...');
        savePendingStoryToDatabase();
      } else {
        console.log('poopoo [AudioPlayback] pendingStory missing audioUrl - NOT saving yet');
      }
    }
  }, [user, pendingStory]);

  // Prüfe ob dies die erste Story-Wiedergabe ist
  useEffect(() => {
    const checkFirstStoryPlayback = async () => {
      if (!user) {
        // Fallback: Prüfe localStorage-Flag
        const hasCreatedStory = localStorage.getItem('ps_has_created_story') === 'true';
        setIsFirstStoryPlayback(!hasCreatedStory);
        return;
      }

      try {
        // Prüfe Anzahl der persönlichen Stories (nicht Audio-only)
        const { data: existingStories, error } = await supabase
          .from('saved_stories')
          .select('id, is_audio_only')
          .eq('user_id', user.id);

        if (error) {
          console.warn('[AudioPlayback] Error checking story count:', error);
          // Fallback: Prüfe localStorage-Flag
          const hasCreatedStory = localStorage.getItem('ps_has_created_story') === 'true';
          setIsFirstStoryPlayback(!hasCreatedStory);
          return;
        }

        // Zähle nur KI-generierte Ressourcen (nicht Audio-only)
        const personalStoriesCount = existingStories?.filter((s: any) => !s.is_audio_only).length || 0;
        const isFirst = personalStoriesCount === 0;
        setIsFirstStoryPlayback(isFirst);

        // Setze localStorage-Flag als Fallback für zukünftige Sessions
        if (!isFirst) {
          localStorage.setItem('ps_has_created_story', 'true');
        }
      } catch (err) {
        console.warn('[AudioPlayback] Error checking first story playback:', err);
        // Fallback: Prüfe localStorage-Flag
        const hasCreatedStory = localStorage.getItem('ps_has_created_story') === 'true';
        setIsFirstStoryPlayback(!hasCreatedStory);
      }
    };

    checkFirstStoryPlayback();
  }, [user]);

  // Reset states wenn sich die Story ändert (neue Story generiert)
  useEffect(() => {
    setHasAutoSaved(false);
    setHasStartedPlayback(false);
    setShowPostAudioPanel(false);
    setShowPostAudioCTA(false);
    setIsAudioReady(false);
  }, [generatedStory]);

  // Automatisches Speichern: Speichere Ressource automatisch, sobald Story und Audio vorhanden sind
  useEffect(() => {
    const autoSave = async () => {
      // Prüfe ob alle Bedingungen erfüllt sind
      if (!generatedStory || generatedStory.trim().length === 0) {
        return; // Story muss vorhanden sein
      }
      
      if (!audioState?.audioUrl) {
        return; // Audio muss vorhanden sein
      }
      
      if (isGenerating) {
        return; // Warte bis Audio-Generierung abgeschlossen ist
      }
      
      // WICHTIG: Speichere IMMER in localStorage, auch wenn User nicht eingeloggt ist
      // Dies stellt sicher, dass die Story nach Login gespeichert werden kann
      if (!hasAutoSaved && !onFirstStorySaved) {
        console.log('[AutoSave] Speichere Story in localStorage (auch wenn nicht eingeloggt)...');
        savePendingStory(); // Speichere in localStorage
        setHasAutoSaved(true);
      }
      
      // Wenn User eingeloggt ist, speichere direkt in Datenbank
      if (!user) {
        return; // User nicht eingeloggt - Story ist bereits in localStorage gespeichert
      }

      if (onFirstStorySaved && firstStorySaveStarted.current) return;
      if (onFirstStorySaved) firstStorySaveStarted.current = true;
      
      // Prüfe ob bereits in Datenbank gespeichert wurde (verhindere doppeltes Speichern)
      // Wenn hasAutoSaved true ist, wurde bereits localStorage gespeichert
      // Prüfe ob Story bereits in DB existiert, bevor wir erneut speichern
      try {
        const { data: existingStories } = await supabase
          .from('saved_stories')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', selectedFigure.name)
          .eq('content', generatedStory)
          .limit(1);
        
        if (existingStories && existingStories.length > 0) {
          console.log('[AutoSave] Story bereits in Datenbank vorhanden, überspringe Speichern');
          clearPendingStoryBackup();
          firstStorySaveFinished.current = true;
          onFirstStorySaved?.();
          return;
        }
      } catch (checkError) {
        console.warn('[AutoSave] Fehler beim Prüfen auf Duplikate:', checkError);
        // Weiter mit Speichern trotz Fehler
      }
      
      console.log('[AutoSave] Automatisches Speichern in Datenbank wird ausgelöst...');
      
      // Verwende die bestehende saveStoryToDatabase Funktion
      try {
        await saveStoryToDatabase();
        if (onFirstStorySaved && !firstStorySaveFinished.current) {
          firstStorySaveStarted.current = false;
          setError('Deine Story ist fertig, konnte aber noch nicht gespeichert werden. Bitte versuche es erneut.');
        }
        console.log('[AutoSave] Ressource wurde automatisch in Datenbank gespeichert');
      } catch (error) {
        if (onFirstStorySaved) firstStorySaveStarted.current = false;
        console.error('[AutoSave] Fehler beim automatischen Speichern:', error);
        // Fehler ist nicht kritisch - Story ist bereits in localStorage gespeichert
      }
    };
    
    autoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, generatedStory, audioState?.audioUrl, hasAutoSaved, isGenerating, onFirstStorySaved]);

  // Liegt die Story in der Datenbank, wird die Sicherung im Browser nicht mehr
  // gebraucht. Sonst hält das Dashboard sie für neu: Es zeigt kurz eine
  // Platzhalter-Karte und lädt die Liste ein zweites Mal (Flackern).
  const clearPendingStoryBackup = () => {
    try { localStorage.removeItem('pendingStory'); } catch { /* nur Sicherung */ }
  };

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
    console.log('poopoo [AudioPlayback] savePendingStoryToDatabase called');
    console.log('poopoo [AudioPlayback] pendingStory state:', JSON.stringify({
      hasPendingStory: !!pendingStory,
      hasAudioState: !!pendingStory?.audioState,
      audioUrl: pendingStory?.audioState?.audioUrl,
      selectedVoiceId: pendingStory?.selectedVoiceId,
      figureName: pendingStory?.selectedFigure?.name
    }, null, 2));

    if (!user) {
      console.log('poopoo [AudioPlayback] No user logged in - skipping save');
      return;
    }

    if (!pendingStory) {
      console.log('poopoo [AudioPlayback] No pending story found - skipping save');
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
      
      const insertData = {
        user_id: user.id,
        title: pendingStory.selectedFigure.name,
        content: pendingStory.generatedStory,
        resource_figure: pendingStory.selectedFigure.name,
        question_answers: Array.isArray(pendingStory.questionAnswers) ? pendingStory.questionAnswers : [],
        audio_url: pendingStory.audioState?.audioUrl || null,
        voice_id: pendingStory.selectedVoiceId || null
      };

      console.log('poopoo [AudioPlayback] Saving pending story to database with data:', JSON.stringify({
        user_id: insertData.user_id,
        title: insertData.title,
        content_length: insertData.content?.length,
        audio_url: insertData.audio_url,
        voice_id: insertData.voice_id
      }, null, 2));

      const { data, error, duplicateOf } = await insertStoryOnce(insertData, 'savePendingStoryToDatabase');
      if (!error && duplicateOf === 'savePendingStoryToDatabase') return;

      if (error) {
        console.error('poopoo [AudioPlayback] Error saving pending story:', error);
        // Kein Popup - nur Console-Log
      } else {
        console.log('poopoo [AudioPlayback] Pending story saved successfully!', JSON.stringify({
          id: data?.[0]?.id,
          audio_url: data?.[0]?.audio_url,
          voice_id: data?.[0]?.voice_id
        }, null, 2));
        // Setze localStorage-Flag für zukünftige Sessions (AudioPlayback wird nur für persönliche Stories verwendet)
        localStorage.setItem('ps_has_created_story', 'true');
        setIsFirstStoryPlayback(false);
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
    console.log('poopoo [AudioPlayback] saveStoryToDatabase called');
    console.log('poopoo [AudioPlayback] Current audioState:', JSON.stringify({
      hasAudioUrl: !!audioState?.audioUrl,
      audioUrl: audioState?.audioUrl,
      voiceId: audioState?.voiceId,
      filename: audioState?.filename,
      isGenerated: audioState?.isGenerated
    }, null, 2));

    if (!user) {
      console.log('poopoo [AudioPlayback] No user logged in - cannot save to database');
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
        clearPendingStoryBackup();
        firstStorySaveFinished.current = true;
        onFirstStorySaved?.();
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
      
      const insertData = {
        user_id: user.id,
        title: selectedFigure.name,
        content: generatedStory,
        resource_figure: selectedFigure.name,
        question_answers: Array.isArray(questionAnswers) ? questionAnswers : [],
        audio_url: audioState?.audioUrl || null,
        voice_id: selectedVoiceId || null,
        auto_subtitle: null // Kein auto_subtitle beim ersten Speichern - User kann eigenen Satz eingeben
      };

      console.log('poopoo [AudioPlayback] About to INSERT story with data:', JSON.stringify({
        user_id: insertData.user_id,
        title: insertData.title,
        content_length: insertData.content?.length,
        resource_figure: insertData.resource_figure,
        question_answers_count: insertData.question_answers?.length,
        audio_url: insertData.audio_url,
        voice_id: insertData.voice_id
      }, null, 2));

      const { data, error, duplicateOf } = await insertStoryOnce(insertData, 'saveStoryToDatabase');
      if (!error && duplicateOf === 'saveStoryToDatabase') {
        clearPendingStoryBackup();
        firstStorySaveFinished.current = true;
        onFirstStorySaved?.();
        return;
      }

      if (error) {
        console.error('poopoo [AudioPlayback] ERROR saving story:', error);
        // Kein Popup - nur Console-Log
      } else {
        console.log('poopoo [AudioPlayback] Story saved successfully! Response:', JSON.stringify({
          id: data?.[0]?.id,
          audio_url: data?.[0]?.audio_url,
          voice_id: data?.[0]?.voice_id,
          title: data?.[0]?.title
        }, null, 2));
        clearPendingStoryBackup();
        firstStorySaveFinished.current = true;
        onFirstStorySaved?.();
        
        // Setze localStorage-Flag für zukünftige Sessions (nur für persönliche Stories, nicht Audio-only)
        // AudioPlayback wird nur für persönliche Stories verwendet, daher können wir das Flag sicher setzen
        localStorage.setItem('ps_has_created_story', 'true');
        setIsFirstStoryPlayback(false);
        
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

        // Speichere auch die Ankommen-Story wenn vorhanden
        if (!onFirstStorySaved) await saveAnkommenStoryIfExists();

        // Kein Popup - nur Console-Log
      }
    } catch (err) {
      console.error('Error saving story:', err);
      // Kein Popup - nur Console-Log
    }
  };

  // Speichere die Ankommen-Story (Beispiel-Ressource) zum User-Account
  const saveAnkommenStoryIfExists = async () => {
    console.log('[AudioPlayback] saveAnkommenStoryIfExists called');

    if (!user) {
      console.log('[AudioPlayback] No user, skipping ankommen save');
      return;
    }

    try {
      // Prüfe ob Ankommen-Resource in localStorage vorhanden ist
      const ankommenData = localStorage.getItem('ankommen_resource');
      console.log('[AudioPlayback] Checking localStorage for ankommen_resource:', !!ankommenData);

      if (!ankommenData) {
        console.log('[AudioPlayback] No ankommen resource in localStorage');
        return;
      }

      const ankommenResource = JSON.parse(ankommenData);
      console.log('[AudioPlayback] Found ankommen resource:', {
        title: ankommenResource.title,
        hasContent: !!ankommenResource.content,
        hasAudioUrl: !!ankommenResource.audio_url
      });

      // Prüfe ob diese Story bereits für den User existiert
      const { data: existing } = await supabase
        .from('saved_stories')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', ankommenResource.title)
        .eq('audio_url', ankommenResource.audio_url);

      if (existing && existing.length > 0) {
        console.log('[AudioPlayback] Ankommen story already exists for user, skipping');
        // Entferne aus localStorage da bereits gespeichert
        localStorage.removeItem('ankommen_resource');
        return;
      }

      // Speichere die Ankommen-Story für den User
      const { data, error } = await (supabase as any)
        .from('saved_stories')
        .insert({
          user_id: user.id,
          title: ankommenResource.title || 'Ankommen-Geschichte',
          content: ankommenResource.content,
          resource_figure: ankommenResource.resource_figure || 'Ankommen',
          question_answers: [],
          audio_url: ankommenResource.audio_url,
          voice_id: ankommenResource.voice_id || null,
        })
        .select();

      if (error) {
        console.error('[AudioPlayback] Error saving ankommen story:', error);
      } else {
        console.log('[AudioPlayback] Ankommen story saved successfully:', data);
        // Entferne aus localStorage nach erfolgreichem Speichern
        localStorage.removeItem('ankommen_resource');

        // Track Event
        if (session?.access_token) {
          try {
            await trackEvent({
              eventType: 'resource_created',
              storyId: data?.[0]?.id,
              resourceFigureName: ankommenResource.title || 'Ankommen',
            }, { accessToken: session.access_token });
          } catch (trackError) {
            console.warn('[AudioPlayback] Failed to track ankommen story event:', trackError);
          }
        }
      }
    } catch (err) {
      console.error('[AudioPlayback] Error in saveAnkommenStoryIfExists:', err);
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
          // Erfolgreiche Registrierung: Setze Cookie für zukünftige Sessions
          document.cookie = `email_verified=true; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
          
          // Zeige AccountCreated Seite
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
          // Erfolgreiche Anmeldung: Setze Cookie für zukünftige Sessions
          document.cookie = `email_verified=true; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
          
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
        // Dieselbe Liste wie in Schritt 3 (inkl. Rückfall auf alle Stimmen) –
        // meist schon geladen, also kein zweiter Aufruf bei ElevenLabs.
        const allVoices = (await prefetchVoices()) as unknown as Voice[];

        // Strenger Filter: nur exaktes Geschlecht gemäß Pronomen
        const genderSpecificVoices = allVoices.filter((voice: Voice) => {
          const vg = (voice.gender || '').toLowerCase();
          return figureGender === 'female' ? vg === 'female' : vg === 'male';
        });

        setAvailableVoices(genderSpecificVoices);
        console.log(`Loaded ${genderSpecificVoices.length} ${figureGender} voices for ${selectedFigure.name}`);
      } catch (error) {
        console.error('Error fetching voices:', error);
      }
    };
    
    fetchVoices();
  }, [figureGender]);

  // Setze die ausgewählte Stimme basierend auf selectedVoiceId
  useEffect(() => {
    if (!selectedVoiceId) return;

    if (availableVoices.length > 0) {
      const voice = availableVoices.find(v => v.id === selectedVoiceId);
      if (voice) {
        console.log('[AudioPlayback] Found voice:', voice.id, voice.name);
        setSelectedVoice(voice);
      } else {
        // Voice not found in gender-filtered list
        console.warn('[AudioPlayback] Voice not found in available voices, ID:', selectedVoiceId);
        console.log('[AudioPlayback] Available voice IDs:', availableVoices.map(v => v.id));
        // Fallback: create a minimal voice object to allow audio generation
        const fallbackVoice: Voice = {
          id: selectedVoiceId,
          name: 'Selected Voice',
          description: '',
          gender: 'neutral',
          emoji: '🎤'
        };
        setSelectedVoice(fallbackVoice);
      }
    } else {
      // No voices loaded yet - create fallback voice to allow audio generation to proceed
      // This prevents getting stuck in loading state when API is slow or fails
      console.log('[AudioPlayback] No voices loaded yet, creating fallback voice for ID:', selectedVoiceId);
      const fallbackVoice: Voice = {
        id: selectedVoiceId,
        name: 'Selected Voice',
        description: '',
        gender: 'neutral',
        emoji: '🎤'
      };
      setSelectedVoice(fallbackVoice);
    }
  }, [selectedVoiceId, availableVoices]);
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    try {
      setIsGenerating(true);
      setError(null);
      setGenerationProgress(0);
      // Der Loader schätzt die Dauer aus der Textlänge (src/lib/story-progress.ts).
      storyTimeline.audioStarted(text.length);

      // Use Supabase Edge Function (no timeout limits, cheaper than Vercel)
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!SUPABASE_ANON_KEY) {
        throw new Error('SUPABASE_ANON_KEY ist nicht definiert');
      }

      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/generate-audio`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY, // Supabase Edge Functions benötigen auch den apikey Header
        },
        body: JSON.stringify({
          text: text,
          voiceId: voiceId,
          adminPreview: sparModus, // Use sparModus setting
          // browserFingerprint: browserFingerprint // Für Rate-Limiting
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate audio`);
      }

      setGenerationProgress(100);

      const result = await response.json();
      storyTimeline.audioDone(text.length, sparModus);
      const startedAt = storyTimeline.get().textStartedAt;
      track('story_generated', {
        flow: 'regular',
        ...figureProps(selectedFigure),
        ...(startedAt ? { duration_seconds: Math.round((Date.now() - startedAt) / 1000) } : {}),
      });

      console.log('poopoo [AudioPlayback] Audio generation response:', JSON.stringify({
        audioUrl: result.audioUrl,
        filename: result.filename,
        voiceId: result.voiceId,
        size: result.size,
        processingTime: result.processingTime
      }, null, 2));

      // Update parent state with new audio data from Supabase
      const newAudioState: AudioState = {
        audioUrl: result.audioUrl, // Supabase public URL
        voiceId,
        storyText: text,
        duration: 0, // Will be updated when metadata loads
        isGenerated: true,
        filename: result.filename
      };

      console.log('poopoo [AudioPlayback] Setting new audioState:', JSON.stringify(newAudioState, null, 2));
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
    // Don't try to generate audio if there's a story generation error or if story is empty
    if (storyGenerationError || !generatedStory || generatedStory.trim().length === 0) {
      setIsGenerating(false);
      setError(null);
      return;
    }

    // If we have a story but no voice loaded yet, keep showing loader but don't generate
    if (!selectedVoice) {
      // Voice not loaded yet - keep isGenerating true to show loader
      // Audio will be generated once selectedVoice is set
      console.log('[AudioPlayback] Waiting for voice to be loaded...');
      return;
    }

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
  }, [needsNewAudio, selectedVoice, generatedStory, audioState?.audioUrl, storyGenerationError]);

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

  // Berechne effektive Duration für Seek-Berechnung
  const getEffectiveDuration = useCallback(() => {
    return Math.max(duration, musicDuration) || duration;
  }, [duration, musicDuration]);

  // Hilfsfunktion um Zeit aus Mausposition zu berechnen
  const getTimeFromMouseEvent = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const progressBar = progressBarRef.current;
    const effDuration = getEffectiveDuration();
    if (!progressBar || !effDuration) return null;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressBarWidth = rect.width;
    const clickRatio = Math.max(0, Math.min(1, clickX / progressBarWidth));
    return clickRatio * effDuration;
  }, [getEffectiveDuration]);

  // Seek zu einer bestimmten Zeit
  const seekToTime = useCallback((newTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const musicElement = (window as any)._pendingBackgroundMusic || backgroundMusicElement;
    const voiceDuration = audio.duration || 0;

    // Merke ob wir gerade spielen (entweder Voice oder Music)
    const wasPlaying = isPlaying;

    console.log('[AudioPlayback] Seeking to:', newTime, 'Voice duration:', voiceDuration);

    // Ans Ende gespult: Hier wird die Stimme pausiert (unten), "ended" feuert
    // dann nie – das Abo-Angebot der Gratis-Story würde nie kommen.
    if (voiceDuration > 0 && newTime >= voiceDuration - 3) void requestFreeTrialOffer();

    // Setze Voice Audio Zeit (nur wenn innerhalb der Voice-Duration)
    if (newTime < voiceDuration) {
      audio.currentTime = newTime;
      // Voice sollte spielen wenn wir spielen
      if (wasPlaying && audio.paused) {
        audio.play().catch((err) => {
          console.warn('[AudioPlayback] Failed to resume voice after seek:', err);
        });
      }
    } else {
      // Seek ist außerhalb der Voice-Duration - pausiere Voice
      audio.pause();
      audio.currentTime = voiceDuration; // Setze auf Ende
    }

    // Synchronisiere Hintergrundmusik
    if (musicElement) {
      musicElement.currentTime = newTime;
      // Music sollte spielen wenn wir spielen
      if (wasPlaying && musicElement.paused) {
        musicElement.play().catch((err: any) => {
          console.warn('[AudioPlayback] Failed to resume music after seek:', err);
        });
      }
    }

    setCurrentTime(newTime);
  }, [backgroundMusicElement, isPlaying, requestFreeTrialOffer]);

  // Enhanced progress bar click handler for seeking
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const newTime = getTimeFromMouseEvent(e);
    if (newTime !== null) {
      seekToTime(newTime);
      console.log('[AudioPlayback] Seeked both audio streams to:', newTime);
    }
  };

  // Mouse down handler - start dragging
  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const newTime = getTimeFromMouseEvent(e);
    if (newTime !== null) {
      seekToTime(newTime);
    }

    // Add global mouse event listeners
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const progressBar = progressBarRef.current;
      const effDuration = getEffectiveDuration();
      if (!progressBar || !effDuration) return;

      const rect = progressBar.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      const progressBarWidth = rect.width;
      const clickRatio = Math.max(0, Math.min(1, clickX / progressBarWidth));
      const time = clickRatio * effDuration;
      seekToTime(time);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Cleanup: Stoppe Hintergrundmusik beim Unmount
  useEffect(() => {
    return () => {
      // Cleanup music time tracker
      if ((window as any)._musicTimeTracker) {
        clearInterval((window as any)._musicTimeTracker);
        (window as any)._musicTimeTracker = null;
      }

      // Cleanup pending background music
      const musicElement = (window as any)._pendingBackgroundMusic || backgroundMusicElement;
      if (musicElement) {
        // Entferne pause-Event-Listener vor dem Cleanup
        if ((musicElement as any)._pauseHandler) {
          musicElement.removeEventListener('pause', (musicElement as any)._pauseHandler);
          musicElement.removeEventListener('suspend', (musicElement as any)._pauseHandler);
        }
        if ((musicElement as any)._timeupdateHandler) {
          musicElement.removeEventListener('timeupdate', (musicElement as any)._timeupdateHandler);
        }
        musicElement.pause();
        musicElement.currentTime = 0;
      }

      // Clear window reference
      (window as any)._pendingBackgroundMusic = null;
    };
  }, [backgroundMusicElement]);

  // Hilfsfunktion zum Setzen der Lautstärke (unterstützt Web Audio API für alle Geräte)
  const setMusicVolume = useCallback((musicAudio: HTMLAudioElement, volume: number) => {
    if ((musicAudio as any)._useWebAudio && (musicAudio as any)._gainNode) {
      // Alle Geräte: Verwende Web Audio API GainNode für konsistente Lautstärke
      try {
        const gainNode = (musicAudio as any)._gainNode;
        const audioContext = (musicAudio as any)._audioContext;

        // Stelle sicher, dass AudioContext aktiv ist
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch((err: any) => {
            console.warn('[AudioPlayback] Failed to resume AudioContext:', err);
          });
        }

        gainNode.gain.value = volume;
        console.log('[AudioPlayback] Volume set via GainNode:', volume);
      } catch (error) {
        console.warn('[AudioPlayback] Failed to set volume via GainNode, falling back to HTMLAudioElement:', error);
        musicAudio.volume = volume;
      }
    } else {
      // Fallback: Verwende normale volume Property (nur wenn Web Audio API nicht verfügbar)
      musicAudio.volume = volume;
      console.log('[AudioPlayback] Volume set via HTMLAudioElement.volume:', volume);
    }
  }, []);

  // Hilfsfunktion zum Abrufen der aktuellen Lautstärke
  const getMusicVolume = useCallback((musicAudio: HTMLAudioElement): number => {
    if ((musicAudio as any)._useWebAudio && (musicAudio as any)._gainNode) {
      // Alle Geräte: Verwende Web Audio API GainNode
      return (musicAudio as any)._gainNode.gain.value;
    } else {
      // Fallback: Verwende normale volume Property
      return musicAudio.volume;
    }
  }, []);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioState?.audioUrl) return;

    // Lade Audio als Blob für bessere Kompatibilität (wie im Dashboard)
    const loadAudioAsBlob = async () => {
      try {
        const response = await fetch(audioState.audioUrl!, { mode: 'cors', cache: 'no-cache' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('[AudioPlayback] Created blob URL for audio:', blobUrl);
        audio.src = blobUrl;
        audio.crossOrigin = null; // Blob-URLs brauchen kein CORS
        audio.load();
      } catch (fetchError) {
        console.warn('[AudioPlayback] Failed to load as blob, using direct URL:', fetchError);
        audio.src = audioState.audioUrl!;
        audio.crossOrigin = 'anonymous';
        audio.load();
      }
    };

    loadAudioAsBlob();

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      // Berechne kombinierte Duration (Maximum von Voice und Musik)
      // Musik läuft weiter nachdem Voice endet
      const newCombinedDuration = Math.max(audio.duration, musicDuration);
      setCombinedDuration(newCombinedDuration);
      console.log('[AudioPlayback] Voice duration:', audio.duration, 'Music duration:', musicDuration, 'Combined:', newCombinedDuration);
      // Update duration in parent state
      if (audioState && audio.duration !== audioState.duration) {
        onAudioStateChange({
          ...audioState,
          duration: audio.duration
        });
      }
    };
    const handleEnded = () => {
      console.log('[AudioPlayback] Voice audio ended');
      storyPlayCompleted(playContext());

      // Zeige CTA SOFORT wenn Voice endet (unabhängig von Musik)
      setHasPlayedOnce(true);
      setShowPostAudioPanel(true);
      void requestFreeTrialOffer();

      // Moment 2: Zeige CTA nach 2-3 Sekunden
      setTimeout(() => {
        setShowPostAudioCTA(true);
      }, 2500);

      // Prüfe ob Hintergrundmusik noch läuft
      const musicElement = (window as any)._pendingBackgroundMusic || backgroundMusicElement;
      const musicStillPlaying = musicElement && !musicElement.paused && !musicElement.ended;

      if (musicStillPlaying) {
        // Musik läuft noch - behalte isPlaying und tracke Musik-Zeit
        console.log('[AudioPlayback] Background music still playing, keeping isPlaying true');
        // Wir setzen currentTime NICHT auf 0 - lassen es weiterlaufen

        // Starte Intervall um Musik-Zeit zu tracken
        const trackMusicTime = setInterval(() => {
          if (musicElement && !musicElement.paused && !musicElement.ended) {
            setCurrentTime(musicElement.currentTime);
          } else {
            // Musik ist auch zu Ende
            clearInterval(trackMusicTime);
            setIsPlaying(false);
            setCurrentTime(0);
            console.log('[AudioPlayback] Background music also ended');
          }
        }, 100);

        // Speichere Intervall für Cleanup
        (window as any)._musicTimeTracker = trackMusicTime;
      } else {
        // Keine Musik oder Musik auch zu Ende
        setIsPlaying(false);
        setCurrentTime(0);
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
    const handleLoadStart = () => {
      setIsLoading(true);
      console.log('[AudioPlayback] Audio load started');
    };
    const handleCanPlay = () => {
      // Audio ist bereit zum Abspielen
      setIsLoading(false);
      setIsAudioReady(true);
      console.log('[AudioPlayback] Audio can play - ready state:', audio.readyState);
    };
    const handleCanPlayThrough = () => {
      // Audio ist vollständig geladen und kann durchgespielt werden
      setIsLoading(false);
      setIsAudioReady(true);
      console.log('[AudioPlayback] Audio can play through - fully loaded');
    };
    const updateBuffered = () => setBufferedRanges(audio.buffered);
    const handleError = () => {
      setError('Failed to load audio. Please try regenerating.');
      setIsLoading(false);
    };

    // Kein Fade-out - Musik spielt bis zum Ende weiter (wie im Dashboard)
    const handleTimeUpdate = () => {
      updateTime();
      // Musik läuft weiter, auch wenn die Stimme endet
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('progress', updateBuffered);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('progress', updateBuffered);
      audio.removeEventListener('error', handleError);
    };
    // WICHTIG: backgroundMusicElement NICHT in dependencies - sonst wird Audio neu geladen wenn Musik startet!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioState, onAudioStateChange, user, session, selectedFigure, selectedVoiceId]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !audioState?.audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      // Pausiere auch Hintergrundmusik (und stoppe Fade-Out falls aktiv)
      const musicElement = (window as any)._pendingBackgroundMusic || backgroundMusicElement;
      if (musicElement) {
        // Stoppe Fade-Out-Interval falls vorhanden
        if ((musicElement as any)._fadeOutInterval) {
          clearInterval((musicElement as any)._fadeOutInterval);
          (musicElement as any)._fadeOutInterval = null;
        }

        musicElement.pause();
        console.log('[AudioPlayback] Background music paused');
      }
      return;
    }

    // Prüfe ob User Zugang hat (nur wenn eingeloggt und Paywall aktiviert)
    // OPTIMIERUNG: Für erste Story schneller - starte Audio sofort, prüfe parallel
    const paywallEnabled = isEnabled('PAYWALL_ENABLED');

    if (user && paywallEnabled) {
      console.log('[AudioPlayback] Checking access before playing audio...');
      
      // Prüfe zuerst ob User ein Admin ist - Admins haben immer Zugriff (schnell, keine DB-Abfrage)
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
      
      if (!isAdmin) {
        // Prüfe ob User bereits Ressourcen hat (für 2. Ressource Paywall)
        // OPTIMIERUNG: Starte Audio bereits während der Prüfung läuft (optimistisch für erste Story)
        const checkAccessPromise = (async () => {
          try {
            const { data: existingStories } = await supabase
              .from('saved_stories')
              .select('id, created_at, is_audio_only')
              .eq('user_id', user.id)
              .order('created_at', { ascending: true });
            
            // Zähle nur KI-generierte Ressourcen (ignoriere Audio-only)
            const aiResourceCount = existingStories?.filter((s: any) => !s.is_audio_only).length || 0;
            console.log(`[AudioPlayback] User has ${aiResourceCount} AI-generated resource(s) in database`);
            
            // Wenn User bereits 1+ KI-Ressourcen hat, ist diese neue Ressource die 2.+ - Paywall prüfen
            if (aiResourceCount >= 1) {
              // Prüfe ob User aktiven Zugang hat
              const { hasActiveAccess } = await import('@/lib/access');
              const hasAccess = await hasActiveAccess(user.id);
              
              if (!hasAccess) {
                console.log('[AudioPlayback] User has 1+ AI resources but no active access - showing paywall');
                setShowPaywall(true);
                // Stoppe Audio wenn Paywall gezeigt wird
                audio.pause();
                setIsPlaying(false);
                return false;
              }
            } else if (aiResourceCount === 1 && existingStories && existingStories.length === 1) {
              // Erste Ressource existiert bereits - prüfe 3-Tage-Regel
              const firstResource = (existingStories as Array<{ created_at: string }>)[0];
              const firstResourceDate = new Date(firstResource.created_at);
              const daysSinceFirst = (Date.now() - firstResourceDate.getTime()) / (1000 * 60 * 60 * 24);
              
              if (daysSinceFirst >= 3) {
                console.log('[AudioPlayback] First resource trial expired - showing paywall');
                setShowPaywall(true);
                // Stoppe Audio wenn Paywall gezeigt wird
                audio.pause();
                setIsPlaying(false);
                return false;
              }
            }
            // Wenn aiResourceCount === 0: Erste Ressource, Audio ist erlaubt (innerhalb von 3 Tagen nach Erstellung)
            return true;
          } catch (err) {
            console.error('[AudioPlayback] Error checking access:', err);
            // Bei Fehler: Erlaube Playback (Fail-Open für bessere UX)
            return true;
          }
        })();
        
        // Starte Audio optimistisch (für erste Story) - Prüfung läuft parallel
        // Wenn Paywall benötigt wird, wird Audio gestoppt
        checkAccessPromise.catch((err) => {
          console.error('[AudioPlayback] Error in access check promise:', err);
        });
      } else {
        console.log(`[AudioPlayback] User is admin (${userEmail}) - allowing audio playback without paywall`);
      }
    }

    const voiceAudio = audioRef.current;
    if (!voiceAudio) {
      console.error('[AudioPlayback] Audio element not found');
      setError('Audio-Element nicht gefunden. Bitte Seite neu laden.');
      return;
    }

    // Prüfe ob wir RESUME (nach Pause) oder ERSTEN START machen
    const musicElement = (window as any)._pendingBackgroundMusic || backgroundMusicElement;
    const isResume = hasStartedPlayback && musicElement;

    if (isResume) {
      // RESUME: Einfach weiterspielen von aktueller Position
      console.log('[AudioPlayback] RESUMING playback from current position...');
      setIsPlaying(true);

      try {
        // Resume Voice (wenn noch nicht zu Ende)
        if (voiceAudio.currentTime < voiceAudio.duration) {
          await voiceAudio.play();
          console.log('[AudioPlayback] Voice resumed');
        }

        // Resume Music
        if (musicElement && musicElement.paused) {
          await musicElement.play();
          console.log('[AudioPlayback] Music resumed');
        }
      } catch (err: any) {
        console.error('[AudioPlayback] Resume failed:', err);
        setIsPlaying(false);
      }
      return;
    }

    // ERSTER START: Voice sofort starten, dann Musik laden
    console.log('[AudioPlayback] FIRST PLAY - starting voice audio...');
    setIsPlaying(true);
    setHasStartedPlayback(true);
    storyPlayStarted(playContext());

    // Starte Voice Audio SOFORT - keine Verzögerung!
    voiceAudio.currentTime = 0;

    try {
      await voiceAudio.play();
      console.log('[AudioPlayback] Voice audio started successfully!');

      // Track Audio-Play Event
      if (user && session) {
        trackEvent({
          eventType: 'audio_play',
          resourceFigureName: selectedFigure.name,
          voiceId: selectedVoiceId || undefined,
        }, { accessToken: session.access_token });
      }
    } catch (err: any) {
      console.error('[AudioPlayback] Voice audio play failed:', err);
      if (err.name === 'NotAllowedError') {
        setError('Bitte erlaube Audio-Wiedergabe in deinem Browser.');
      } else {
        setError('Fehler beim Abspielen. Bitte versuche es erneut.');
      }
      setIsPlaying(false);
      return;
    }

    // Jetzt lade und starte Hintergrundmusik (Voice läuft bereits)
    const figureIdOrName = selectedFigure?.id || selectedFigure?.name;
    console.log('[AudioPlayback] ===== LOADING BACKGROUND MUSIC (voice already playing) =====');
    console.log('[AudioPlayback] Figure ID/Name:', figureIdOrName);

    let musicUrl: string | null = null;
    let musicVolume: number = DEFAULT_MUSIC_VOLUME;
    if (figureIdOrName && musicEnabled) {
      try {
        const { getBackgroundMusicTrack } = await import('@/data/backgroundMusic');
        const track = await getBackgroundMusicTrack(figureIdOrName);
        musicUrl = track?.track_url || null;
        // Admin-Lautstärke mal Nutzer-Faktor: ab hier ist musicVolume der
        // effektive Wert, den _targetVolume und _originalVolume übernehmen.
        musicVolume = applyMusicVolumeFactor(track?.volume || DEFAULT_MUSIC_VOLUME);
        console.log('[AudioPlayback] Background music loaded:', { url: musicUrl, volume: musicVolume });
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

        // Erstelle neues Musik-Element - lade als Blob für bessere Kompatibilität
        const musicAudio = new Audio();
        musicAudio.loop = false; // Kein Loop - Musik spielt einmal durch
        musicAudio.volume = 1.0; // Set to max, will control via Web Audio API GainNode
        musicAudio.preload = 'auto';

        // Speichere die track-spezifische Lautstärke
        (musicAudio as any)._targetVolume = musicVolume;

        // Geräte-Erkennung für optimale Kompatibilität
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                     (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1) ||
                     (navigator.userAgent.includes('CriOS') && /iPad|iPhone|iPod/.test(navigator.userAgent));

        // iOS: WICHTIG für Hintergrundwiedergabe - setze playsInline Attribut
        // Dies verhindert, dass iOS die Musik pausiert, wenn der Bildschirm ausgeht
        if (isIOS) {
          (musicAudio as any).playsInline = true;
          // Setze auch das HTML-Attribut falls möglich
          if (musicAudio.setAttribute) {
            musicAudio.setAttribute('playsinline', 'true');
          }
        }
        
        // Lade Musik als Blob für bessere Kompatibilität (funktioniert auf iOS, Android, Desktop)
        try {
          const response = await fetch(musicUrl, { mode: 'cors', cache: 'no-cache' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          console.log('[AudioPlayback] Created blob URL for background music (iOS-compatible):', blobUrl);
          musicAudio.src = blobUrl;
          musicAudio.crossOrigin = null; // Blob-URLs brauchen kein CORS
        } catch (fetchError) {
          console.warn('[AudioPlayback] Failed to load as blob, using direct URL:', fetchError);
          musicAudio.src = musicUrl;
          musicAudio.crossOrigin = 'anonymous';
        }
        
        // Speichere Geräte-Flags für späteres Web Audio API Setup
        (musicAudio as any)._isIOS = isIOS;
        (musicAudio as any)._useWebAudio = false;
        (musicAudio as any)._originalVolume = musicVolume;

        setBackgroundMusicElement(musicAudio);

        // iOS: Konfiguriere Audio Session für Hintergrundwiedergabe
        if (isIOS) {
          // iOS Audio Session API (iOS 16.4+) - konfiguriere für Hintergrundwiedergabe
          if (typeof (navigator as any).audioSession !== 'undefined') {
            try {
              (navigator as any).audioSession.type = 'playback';
              console.log('[AudioPlayback] iOS Audio Session configured for background playback');
            } catch (audioSessionError: any) {
              console.warn('[AudioPlayback] Failed to configure iOS Audio Session:', audioSessionError);
            }
          }
        }

        // ALLE GERÄTE: Setup Web Audio API für konsistente Lautstärkekontrolle + Dynamic Range Compression
        if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
          musicAudio.addEventListener('canplay', () => {
            if ((musicAudio as any)._useWebAudio) {
              console.log('[AudioPlayback] Web Audio API already connected, skipping');
              return;
            }

            try {
              // Verwende AudioContext oder webkitAudioContext (Safari)
              const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
              const audioContext = new AudioContextClass();
              const source = audioContext.createMediaElementSource(musicAudio);

              // Erstelle Dynamic Range Compressor für konsistente Lautstärke über alle Geräte
              const compressor = audioContext.createDynamicsCompressor();
              compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
              compressor.knee.setValueAtTime(30, audioContext.currentTime);
              compressor.ratio.setValueAtTime(12, audioContext.currentTime);
              compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
              compressor.release.setValueAtTime(0.25, audioContext.currentTime);

              // Erstelle GainNode für Lautstärkekontrolle
              const gainNode = audioContext.createGain();
              const targetVolume = (musicAudio as any)._targetVolume || DEFAULT_MUSIC_VOLUME;
              gainNode.gain.value = targetVolume;

              // Audio Chain: Source -> Compressor -> Gain -> Destination
              source.connect(compressor);
              compressor.connect(gainNode);
              gainNode.connect(audioContext.destination);

              (musicAudio as any)._audioContext = audioContext;
              (musicAudio as any)._compressor = compressor;
              (musicAudio as any)._gainNode = gainNode;
              (musicAudio as any)._useWebAudio = true;

              console.log('[AudioPlayback] Web Audio API connected with compressor for consistent volume (Device: ' + (isIOS ? 'iOS' : 'Desktop/Android') + ', Volume: ' + targetVolume + ')');
            } catch (error: any) {
              console.warn('[AudioPlayback] Failed to setup Web Audio API, using HTMLAudioElement:', error);
              (musicAudio as any)._useWebAudio = false;
              // Fallback: setze normale volume (track-spezifisch)
              const fallbackVolume = (musicAudio as any)._targetVolume || DEFAULT_MUSIC_VOLUME;
              musicAudio.volume = fallbackVolume;
            }
          }, { once: true });
          
          // iOS: Verhindere, dass Musik pausiert wird, wenn der Bildschirm ausgeht
          if (isIOS) {
            // Event-Listener für pause Events - starte Musik automatisch wieder, wenn sie unerwartet pausiert wird
            const handlePause = () => {
              // Prüfe ob Musik gestoppt werden soll (z.B. wenn Audio endet)
              if ((musicAudio as any)._shouldStop) {
                console.log('[AudioPlayback] Background music pause ignored - music should stop');
                return;
              }
              
              // Prüfe ob die Stimme noch läuft (dann sollte Musik auch laufen)
              const audio = audioRef.current;
              if (audio && !audio.paused && !audio.ended) {
                console.log('[AudioPlayback] Background music was paused unexpectedly on iOS, restarting...');
                // Verwende setTimeout, um sicherzustellen, dass der Play-Befehl nach dem Pause-Event ausgeführt wird
                setTimeout(() => {
                  // Prüfe nochmal, ob Musik gestoppt werden soll
                  if (!(musicAudio as any)._shouldStop) {
                    musicAudio.play().catch((err: any) => {
                      console.warn('[AudioPlayback] Failed to restart background music after pause:', err);
                    });
                  }
                }, 100);
              }
            };
            
            // Mehrere Event-Listener für verschiedene Szenarien
            musicAudio.addEventListener('pause', handlePause);
            musicAudio.addEventListener('suspend', handlePause); // iOS suspend Event
            
            // Timeupdate-Listener: Prüfe regelmäßig, ob Musik pausiert wurde, während Stimme läuft
            const checkMusicPlaying = () => {
              // Prüfe ob Musik gestoppt werden soll (z.B. wenn Audio endet)
              if ((musicAudio as any)._shouldStop) {
                return;
              }
              
              const audio = audioRef.current;
              if (audio && !audio.paused && !audio.ended) {
                // Stimme läuft noch
                if (musicAudio.paused && !musicAudio.ended) {
                  // Musik wurde pausiert, obwohl Stimme läuft - starte wieder
                  console.log('[AudioPlayback] Background music paused while voice is playing, restarting...');
                  musicAudio.play().catch((err: any) => {
                    console.warn('[AudioPlayback] Failed to restart background music in timeupdate:', err);
                  });
                }
              }
            };
            
            musicAudio.addEventListener('timeupdate', checkMusicPlaying);
            
            // Cleanup beim Entfernen des Audio-Elements
            (musicAudio as any)._pauseHandler = handlePause;
            (musicAudio as any)._timeupdateHandler = checkMusicPlaying;
            (musicAudio as any)._shouldStop = false; // Initialisiere Flag
          }
        }
        
        // Warte auf Musik-Metadaten für Duration
        await new Promise<void>((resolve) => {
          if (musicAudio.readyState >= HTMLMediaElement.HAVE_METADATA) {
            setMusicDuration(musicAudio.duration);
            console.log('[AudioPlayback] Background music duration:', musicAudio.duration);
            resolve();
          } else {
            musicAudio.addEventListener('loadedmetadata', () => {
              setMusicDuration(musicAudio.duration);
              console.log('[AudioPlayback] Background music duration:', musicAudio.duration);
              resolve();
            }, { once: true });
            // Timeout nach 5 Sekunden
            setTimeout(() => resolve(), 5000);
          }
        });

        // Speichere musicAudio
        (window as any)._pendingBackgroundMusic = musicAudio;
        setBackgroundMusicElement(musicAudio);

        // Starte Musik JETZT - sync zur aktuellen Voice-Position
        const voiceAudioElement = audioRef.current;
        const currentVoiceTime = voiceAudioElement?.currentTime || 0;
        const wasVoicePlaying = voiceAudioElement && !voiceAudioElement.paused;

        musicAudio.currentTime = currentVoiceTime;

        console.log('[AudioPlayback] Starting background music at position:', currentVoiceTime);
        console.log('[AudioPlayback] Voice was playing before music start:', wasVoicePlaying);

        try {
          await musicAudio.play();
          console.log('[AudioPlayback] Background music started successfully!');

          // WICHTIG: Stelle sicher, dass Voice noch läuft nach Music-Start
          if (wasVoicePlaying && voiceAudioElement && voiceAudioElement.paused) {
            console.log('[AudioPlayback] Voice was paused after music start - restarting voice!');
            await voiceAudioElement.play();
            console.log('[AudioPlayback] Voice restarted successfully!');
          }
        } catch (playErr: any) {
          console.warn('[AudioPlayback] Background music play failed:', playErr);
          // Kein Fehler anzeigen - Voice läuft bereits
        }
      } catch (musicError: any) {
        console.error('[AudioPlayback] Failed to prepare background music:', musicError);
        // Musik-Fehler nicht blockieren - Voice spielt bereits
      }
    }
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
    
    // Setze beide Audios auf Anfang
    audio.currentTime = 0;
    setCurrentTime(0);

    // Setze auch Hintergrundmusik auf Anfang
    const musicElement = (window as any)._pendingBackgroundMusic || backgroundMusicElement;
    if (musicElement) {
      musicElement.currentTime = 0;
    }

    setHasStartedPlayback(true); // Markiere dass Playback gestartet wurde (auch beim Restart)

    if (isPlaying) {
      // Starte beide Audios
      const playPromises: Promise<void>[] = [];

      playPromises.push(
        audio.play().then(() => {
          console.log('[AudioPlayback] Voice restarted');
          // Track Audio-Play Event beim Restart
          if (user && session) {
            trackEvent({
              eventType: 'audio_play',
              resourceFigureName: selectedFigure.name,
              voiceId: selectedVoiceId || undefined,
            }, { accessToken: session.access_token });
          }
        }).catch((err) => {
          console.error('Voice audio play failed on restart:', err);
        })
      );

      if (musicElement && musicEnabled) {
        playPromises.push(
          musicElement.play().then(() => {
            console.log('[AudioPlayback] Background music restarted');
          }).catch((err: any) => {
            console.warn('Background music play failed on restart:', err);
          })
        );
      }

      await Promise.all(playPromises);
    }
  };


  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Berechne die effektive Duration (Maximum von Voice und Musik)
  const effectiveDuration = Math.max(duration, musicDuration) || duration;
  const progressPercentage = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const bufferedPercentage = effectiveDuration > 0 && bufferedRanges && bufferedRanges.length > 0
    ? (bufferedRanges.end(bufferedRanges.length - 1) / effectiveDuration) * 100
    : 0;
  
  // Berechne Ladezustand basierend auf Audio readyState
  // readyState: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
  const getLoadingProgress = () => {
    const audio = audioRef.current;
    if (!audio || !audioState?.audioUrl) return 0;
    
    if (isGenerating) {
      // Während der Generierung zeigen wir einen generischen Ladezustand
      return generationProgress || 0;
    }
    
    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      // Audio ist vollständig geladen
      return 100;
    } else if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      // Audio kann abgespielt werden, aber noch nicht vollständig geladen
      return Math.max(bufferedPercentage, 75);
    } else if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      // Audio hat aktuelle Daten, aber noch nicht genug für Playback
      return Math.max(bufferedPercentage, 50);
    } else if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      // Nur Metadaten geladen
      return Math.max(bufferedPercentage, 25);
    } else {
      // Noch nichts geladen
      return Math.max(bufferedPercentage, 0);
    }
  };
  
  const loadingProgress = getLoadingProgress();

  // Drei Ansichten im selben Baum: Warten (Loader), Fehler, Player. Das
  // <audio>-Element bleibt dabei immer eingehängt – so kann es schon laden,
  // während der Ring sich schließt.
  const hasStory = !!generatedStory && generatedStory.trim().length > 0;
  const hasAudio = !!audioState?.audioUrl;
  const saveError = !!onFirstStorySaved && !!error?.startsWith('Deine Story ist fertig');
  const failure = hasAudio ? null : (storyGenerationError || error);
  const waiting = !mounted || isGeneratingStory || (!failure && (isGenerating || !hasStory || !hasAudio));
  // Nach dem Warten schließt sich der Ring kurz ("Fertig."), dann kommt der Player.
  const [reveal, setReveal] = useState<'idle' | 'waiting' | 'ready' | 'done'>('idle');
  if (waiting && reveal !== 'waiting') setReveal('waiting');
  if (!waiting && hasAudio && reveal === 'waiting') setReveal('ready');
  useEffect(() => {
    if (reveal !== 'ready') return;
    const id = window.setTimeout(() => setReveal('done'), 1400);
    return () => window.clearTimeout(id);
  }, [reveal]);

  const view = waiting || reveal === 'ready' ? 'loader' : failure ? 'error' : 'player';
  const voiceFirstName = selectedVoice && selectedVoice.name !== 'Selected Voice' ? selectedVoice.name.split(' ')[0].replace(/[.,:;]+$/, '') : null;
  const audioBusy = isLoading || isLoadingAudio || (hasAudio && !isAudioReady);

  const retryAfterFailure = () => {
    if (storyGenerationError) {
      onRetryStory?.();
      return;
    }
    if (selectedVoice) void generateAudio(generatedStory, selectedVoice.id);
  };

  const viewMotion = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="story-audio-stage">
      <AnimatePresence mode="wait" initial={false}>
        {view === 'loader' && (
          <motion.div key="loader" className="story-stage-center" {...viewMotion}>
            <StoryGenerationLoader figure={selectedFigure} voiceName={voiceFirstName} ready={!waiting} />
          </motion.div>
        )}

        {view === 'error' && (
          <motion.div key="error" className="story-stage-center" {...viewMotion}>
            <section className="story-stage-message" role="alert">
              <span className="story-first-avatar" aria-hidden="true">
                <FigureIcon figure={selectedFigure} size={52} className="story-first-avatar-image" />
              </span>
              <p className="story-stage-kicker">Einen Moment bitte</p>
              <h1>
                {storyGenerationError
                  ? 'Deine Geschichte konnte gerade nicht geschrieben werden.'
                  : 'Die Stimme konnte gerade nicht aufgenommen werden.'}
              </h1>
              <p>Deine Antworten sind sicher. Meist klappt es beim zweiten Versuch.</p>
              <div className="story-stage-message-actions">
                <button type="button" className="story-first-next" onClick={retryAfterFailure}>
                  <RotateCcw size={16} aria-hidden="true" /> <span>Erneut versuchen</span>
                </button>
                {onChangeVoice && (
                  <button type="button" className="story-first-previous" onClick={onChangeVoice}>
                    <span>Andere Stimme wählen</span>
                  </button>
                )}
              </div>
              <p className="story-stage-message-detail">{failure}</p>
            </section>
          </motion.div>
        )}

        {view === 'player' && (
          <motion.div key="player" className="story-stage-center" {...viewMotion}>
            <section className="story-player" aria-label="Deine Power Story">
              {saveError && (
                <div className="story-player-alert" role="alert">
                  <p>{error}</p>
                  <button type="button" onClick={() => {
                    if (firstStorySaveStarted.current) return;
                    firstStorySaveStarted.current = true;
                    setError(null);
                    void saveStoryToDatabase().then(() => {
                      if (!firstStorySaveFinished.current) {
                        firstStorySaveStarted.current = false;
                        setError('Deine Story ist fertig, konnte aber noch nicht gespeichert werden. Bitte versuche es erneut.');
                      }
                    });
                  }}>Speichern erneut versuchen</button>
                </div>
              )}

              <div className="story-first-character story-player-figure">
                <span className="story-first-avatar" aria-hidden="true">
                  <FigureIcon figure={selectedFigure} size={52} className="story-first-avatar-image" />
                </span>
                <span>{selectedFigure.name}</span>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {showPostAudioPanel ? (
                  <motion.div key="after" className="story-player-copy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                    <h1>
                      {isFirstStoryPlayback === false
                        ? 'Vielleicht magst du dem Gehörten noch einen Moment Raum geben.'
                        : 'Lass das Gehörte einen Moment nachwirken.'}
                    </h1>
                    <p>
                      {isFirstStoryPlayback === false
                        ? 'Oder du gehst einfach weiter, wenn es sich stimmig anfühlt.'
                        : 'Du musst nichts festhalten oder verstehen. Manchmal reicht es, etwas wirken zu lassen.'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="before" className="story-player-copy" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <h1>Deine Power Story ist da</h1>
                    <p>
                      {isFirstStoryPlayback === false
                        ? 'Du kannst dich jetzt einfach begleiten lassen – in deinem eigenen Rhythmus.'
                        : <>Du musst nichts tun. {getFigurePresenceText(selectedFigure)} Du kannst einfach zuhören – oder jederzeit pausieren.</>}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && !saveError && (
                <p className="story-form-message" data-tone="error" role="alert">
                  {error}{' '}
                  <button type="button" onClick={() => selectedVoice && generateAudio(generatedStory, selectedVoice.id)}>Erneut versuchen</button>
                </p>
              )}

              <div className="story-player-controls">
                <span className="story-player-side">
                  {hasStartedPlayback && (
                    <motion.button
                      type="button"
                      className="story-player-restart"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={restart}
                      aria-label="Von vorn anhören"
                    >
                      <RotateCcw size={18} aria-hidden="true" />
                    </motion.button>
                  )}
                </span>
                <button
                  type="button"
                  className="story-player-play"
                  data-playing={isPlaying || undefined}
                  onClick={togglePlayPause}
                  disabled={audioBusy}
                  aria-label={audioBusy ? 'Audio lädt' : isPlaying ? 'Pausieren' : 'Power Story anhören'}
                >
                  {audioBusy ? (
                    <Loader2 size={28} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : isPlaying ? (
                    <Pause size={28} fill="currentColor" aria-hidden="true" />
                  ) : (
                    <Play size={28} fill="currentColor" className="story-player-play-icon" aria-hidden="true" />
                  )}
                </button>
                <span className="story-player-side" />
              </div>

              <div className="story-player-progress">
                <div
                  ref={progressBarRef}
                  onMouseDown={handleProgressBarMouseDown}
                  className="story-player-track"
                  data-dragging={isDragging || undefined}
                  role="slider"
                  aria-label="Position in der Power Story"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(effectiveDuration || 0)}
                  aria-valuenow={Math.round(currentTime)}
                  aria-valuetext={`${formatTime(currentTime)} von ${formatTime(effectiveDuration)}`}
                >
                  {(isLoading || isLoadingAudio) && <span className="story-player-loaded" style={{ width: `${loadingProgress}%` }} />}
                  <span className="story-player-buffer" style={{ width: `${bufferedPercentage}%` }} />
                  <span className="story-player-fill" style={{ width: `${progressPercentage}%` }} />
                  <span className="story-player-thumb" style={{ left: `${progressPercentage}%` }} />
                </div>
                <div className="story-player-times">
                  <span>{formatTime(currentTime)}</span>
                  {audioBusy && <span>Lädt …</span>}
                  <span>{formatTime(effectiveDuration)}</span>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {showPostAudioPanel && showPostAudioCTA ? (
                  <motion.div key="cta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <button
                      type="button"
                      className="story-first-next story-player-cta"
                      onClick={() => {
                        // Moment 3: Route to access page if not authenticated
                        if (!user) {
                          router.push('/geschichte-speichern');
                        } else {
                          // Full reload for a clean flow state
                          window.location.href = '/create-story';
                        }
                      }}
                    >
                      {user
                        ? isFirstStoryPlayback === false
                          ? 'Neue Power Story erstellen'
                          : 'Eine weitere persönliche Geschichte erstellen'
                        : 'Diese Geschichte für mich behalten'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.p key="hint" className="story-stage-hint story-player-hint" exit={{ opacity: 0 }}>
                    <Headphones size={15} aria-hidden="true" /> Am schönsten mit Kopfhörern
                  </motion.p>
                )}
              </AnimatePresence>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedData={() => setIsLoading(false)}
      />

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
            <div className="story-save-heading bg-gradient-to-r from-primary-500 to-orange-500 p-6 text-white text-center">
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
              <p className="text-primary-100 text-sm leading-relaxed">
                {authMode === 'register' 
                  ? 'Erstelle einen Account und habe jederzeit Zugang zu deiner persönlichen Quelle für Sicherheit, Geborgenheit und inneren Schutz'
                  : 'Melde dich an, um auf deine gespeicherten Ressourcen zuzugreifen'
                }
              </p>
            </div>

            {/* Benefits Section */}
            <div className="story-save-content p-6 bg-gradient-to-br from-primary-50 to-orange-50">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
                  className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-orange-500 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
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

      <SubscriptionOffer variant={showSubscriptionOffer ? 'after-first-story' : null} onClose={closeSubscriptionOffer} location="create_story" />

    </div>
  );
}
