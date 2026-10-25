"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { isEnabled } from "@/lib/featureFlags";
import { motion, AnimatePresence } from "framer-motion";
import StoryFlowProgress from "@/components/StoryFlowProgress";
import { ArrowLeft } from "lucide-react";
import ResourceFigureSelection from "@/components/ResourceFigureSelection";
import RelationshipSelection, { QuestionAnswer } from "@/components/RelationshipSelection";
import NamePronunciationForm from "@/components/NamePronunciationForm";
import VoiceSelection from "@/components/VoiceSelection";
import AudioPlayback from "@/components/AudioPlayback";
import AccountCreated from "@/components/AccountCreated";
import SavedStoriesModal from "@/components/SavedStoriesModal";
import { useAppReset } from "@/components/providers/app-reset-provider";
import Paywall from "@/components/Paywall";
import FirstStoryEmailGate from "@/components/FirstStoryEmailGate";
import FirstStoryServerGate from "@/components/FirstStoryServerGate";
import { FIRST_STORY_VOICE_ID, isFirstStoryServerFlowEnabled } from "@/lib/first-story/config";
import { canCreateResource } from "@/lib/access";
import { getOrCreateBrowserFingerprint } from "@/lib/browser-fingerprint";
import { realFigures, fictionalFigures } from "@/data/figures";
import { ResourceFigure, AudioState, AppState } from "@/lib/types/story";
import { generateStoryWithProgress } from "@/lib/generate-story-client";

const FIRST_FLOW_VOICE_ID = FIRST_STORY_VOICE_ID;
const FIRST_FLOW_STORAGE_KEY = "first-power-story-flow";
const FIRST_FLOW_OWNER_KEY = "first-power-story-owner";
const FIRST_FLOW_DONE_KEY = "first-power-story-complete";
const FIRST_FLOW_SNAPSHOT_TTL = 60 * 60 * 1000;
const FIRST_FLOW_OWNER_TTL = 2 * 60 * 1000;

type FirstFlowSnapshot = Partial<AppState> & { pendingEmail?: string };

function readFirstFlowSnapshot(): FirstFlowSnapshot | null {
  // localStorage is shared by the original tab and the email-link tab. A copied
  // sessionStorage value can be stale, so it must not take precedence here.
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = storage.getItem(FIRST_FLOW_STORAGE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (storage === window.localStorage) {
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > FIRST_FLOW_SNAPSHOT_TTL) {
          storage.removeItem(FIRST_FLOW_STORAGE_KEY);
          continue;
        }
        return parsed.state as FirstFlowSnapshot;
      }
      return parsed as FirstFlowSnapshot;
    } catch {
      storage.removeItem(FIRST_FLOW_STORAGE_KEY);
    }
  }
  return null;
}

const initialAppState: AppState = {
  currentStep: 1,
  resourceFigure: null,
  questionAnswers: [],
  generatedStory: "",
  selectedVoice: "",
  audioState: null,
  currentQuestionIndex: 0
};


function CreateStoryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstFlow = searchParams.get('first') === 'true';
  // Serverseitiger Erststory-Flow (Feature-Flag). Dann übernimmt der Server
  // Erzeugung und Speicherung; die Tab-Übergabe unten bleibt inaktiv.
  const serverFirstFlow = firstFlow && isFirstStoryServerFlowEnabled();
  const [appState, setAppState] = useState<AppState>(() => {
    const angel = firstFlow && fictionalFigures.find((figure) => figure.id === 'angel');
    return angel
      ? { ...initialAppState, currentStep: 2, resourceFigure: angel, selectedVoice: FIRST_FLOW_VOICE_ID }
      : initialAppState;
  });
  const [firstFlowReady, setFirstFlowReady] = useState(false);
  const [firstFlowOwner, setFirstFlowOwner] = useState(false);
  const [firstFlowComplete, setFirstFlowComplete] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const firstFlowTabId = useRef<string | null>(null);
  const [showSavedStories, setShowSavedStories] = useState(false);
  const [showAccountCreated, setShowAccountCreated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { setResetFunction } = useAppReset();
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [userPronunciationHint, setUserPronunciationHint] = useState<string | null>(null);
  const [anonymousUserName, setAnonymousUserName] = useState<string | null>(null);
  const [anonymousUserPronunciationHint, setAnonymousUserPronunciationHint] = useState<string | null>(null);
  const [sparModus, setSparModus] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [storyGenerationError, setStoryGenerationError] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [firstPreparationStatus, setFirstPreparationStatus] = useState<'idle' | 'text' | 'audio' | 'ready' | 'error'>('idle');
  const [firstPreparationRetry, setFirstPreparationRetry] = useState(0);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [showNameStep, setShowNameStep] = useState(true);
  // Schritt 1 → 2 prüft erst den Zugang; so lange wartet "Weiter" sichtbar.
  const [checkingAccess, setCheckingAccess] = useState(false);
  // Track if story generation was already attempted to prevent double-triggering
  const storyGenerationAttempted = useRef(false);
  const firstPreparationAttempted = useRef(false);
  const firstFlowSaved = useRef(false);

  // The first-time flow is deliberately fixed to Angel and Kerstin. The
  // regular flow below remains unchanged for later stories.
  useEffect(() => {
    if (!firstFlow) {
      setFirstFlowReady(false);
      return;
    }
    if (!mounted) return;

    const angel = fictionalFigures.find((figure) => figure.id === 'angel');
    if (!angel) return;

    try {
      const restored = readFirstFlowSnapshot();
      if (restored) {
        const restoredStep = (restored.currentStep ?? 0) >= 3 ? 3 : 2;
        setPendingEmail(restored.pendingEmail ?? null);
        setAppState({
          ...initialAppState,
          ...restored,
          currentStep: restoredStep,
          resourceFigure: angel,
          selectedVoice: FIRST_FLOW_VOICE_ID,
          // The audio URL is a persisted Supabase URL, not a blob URL.
          audioState: restored.audioState?.audioUrl ? restored.audioState : null,
        });
        setFirstFlowReady(true);
        return;
      }
    } catch { /* Browser storage is optional. */ }

    setAppState((prev) => ({
      ...prev,
      currentStep: 2,
      resourceFigure: angel,
      selectedVoice: FIRST_FLOW_VOICE_ID,
    }));
    setFirstFlowReady(true);
  }, [firstFlow, mounted]);

  useEffect(() => {
    if (!firstFlow || !firstFlowReady || authLoading || !user) return;
    try {
      const completed = JSON.parse(window.localStorage.getItem(FIRST_FLOW_DONE_KEY) || 'null');
      if (completed?.userId === user.id && Date.now() - completed.savedAt < FIRST_FLOW_SNAPSHOT_TTL) {
        setFirstFlowComplete(true);
        window.sessionStorage.removeItem(FIRST_FLOW_STORAGE_KEY);
      }
    } catch { /* Ignore an unavailable completion marker. */ }
  }, [firstFlow, firstFlowReady, authLoading, user]);

  useEffect(() => {
    if (!firstFlow || !mounted || !firstFlowReady || firstFlowComplete || firstFlowSaved.current) return;
    if (appState.currentStep >= 3 && !firstFlowOwner && !serverFirstFlow) return;
    try {
      const snapshot = {
        currentStep: appState.currentStep,
        questionAnswers: appState.questionAnswers,
        generatedStory: appState.generatedStory,
        audioState: appState.audioState,
        pendingEmail: pendingEmail ?? undefined,
      };
      window.sessionStorage.setItem(FIRST_FLOW_STORAGE_KEY, JSON.stringify(snapshot));
      window.localStorage.setItem(FIRST_FLOW_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state: snapshot }));
    } catch {
      // Session storage is only a resume aid; the in-memory flow still works.
    }
  }, [firstFlow, serverFirstFlow, mounted, firstFlowReady, firstFlowOwner, firstFlowComplete, appState.currentStep, appState.questionAnswers, appState.generatedStory, appState.audioState, pendingEmail]);

  // The email link normally opens a second tab. Only the tab that owns this
  // flow may generate audio or save it; the other tab waits for the owner.
  useEffect(() => {
    if (!firstFlow || serverFirstFlow || !firstFlowReady || appState.currentStep < 3 || firstFlowComplete) return;
    const tabId = firstFlowTabId.current ?? crypto.randomUUID();
    firstFlowTabId.current = tabId;
    const claimOrRenew = () => {
      try {
        const current = JSON.parse(window.localStorage.getItem(FIRST_FLOW_OWNER_KEY) || 'null');
        if (!current || current.id === tabId || current.expiresAt < Date.now()) {
          window.localStorage.setItem(FIRST_FLOW_OWNER_KEY, JSON.stringify({ id: tabId, expiresAt: Date.now() + FIRST_FLOW_OWNER_TTL }));
          setFirstFlowOwner(true);
        } else {
          setFirstFlowOwner(false);
        }
      } catch {
        setFirstFlowOwner(true);
      }
    };
    claimOrRenew();
    const interval = window.setInterval(claimOrRenew, 3000);
    window.addEventListener('storage', claimOrRenew);
    const release = () => {
      try {
        const current = JSON.parse(window.localStorage.getItem(FIRST_FLOW_OWNER_KEY) || 'null');
        if (current?.id === tabId) window.localStorage.removeItem(FIRST_FLOW_OWNER_KEY);
      } catch { /* The next tab can claim after the lease expires. */ }
    };
    window.addEventListener('pagehide', release);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', claimOrRenew);
      window.removeEventListener('pagehide', release);
      // Do not release on a React effect re-run: this tab still owns the flow.
    };
  }, [firstFlow, serverFirstFlow, firstFlowReady, firstFlowComplete, appState.currentStep]);

  useEffect(() => () => {
    const tabId = firstFlowTabId.current;
    if (!tabId) return;
    try {
      const current = JSON.parse(window.localStorage.getItem(FIRST_FLOW_OWNER_KEY) || 'null');
      if (current?.id === tabId) window.localStorage.removeItem(FIRST_FLOW_OWNER_KEY);
    } catch { /* The lease will expire if storage is unavailable. */ }
  }, []);

  useEffect(() => {
    if (!firstFlow || serverFirstFlow || !firstFlowReady || firstFlowOwner || firstFlowComplete) return;
    const syncFromOwner = () => {
      try {
        const completed = JSON.parse(window.localStorage.getItem(FIRST_FLOW_DONE_KEY) || 'null');
        if (user && completed?.userId === user.id && Date.now() - completed.savedAt < FIRST_FLOW_SNAPSHOT_TTL) {
          setFirstFlowComplete(true);
          window.sessionStorage.removeItem(FIRST_FLOW_STORAGE_KEY);
          return;
        }
        const restored = readFirstFlowSnapshot();
        if (restored?.generatedStory || restored?.audioState?.audioUrl) {
          setAppState((prev) => ({
            ...prev,
            questionAnswers: restored.questionAnswers ?? prev.questionAnswers,
            generatedStory: restored.generatedStory ?? prev.generatedStory,
            audioState: restored.audioState?.audioUrl ? restored.audioState : prev.audioState,
          }));
        }
      } catch { /* Keep the in-memory answers. */ }
    };
    window.addEventListener('storage', syncFromOwner);
    syncFromOwner();
    return () => window.removeEventListener('storage', syncFromOwner);
  }, [firstFlow, serverFirstFlow, firstFlowReady, firstFlowOwner, firstFlowComplete, user]);

  // Access control: Anonymous users can only access if they came from /figur (have figure param)
  // Logged in users can access directly
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    const figureId = searchParams?.get('figure');

    // If user is not logged in and there's no figure param, redirect to homepage
    if (!user && !figureId && !firstFlow && !appState.resourceFigure) {
      router.replace('/');
      return;
    }
  }, [user, authLoading, searchParams, appState.resourceFigure, firstFlow, router]);

  useEffect(() => {
    if (firstFlow && !serverFirstFlow && firstFlowReady && firstFlowOwner && user &&
        (!pendingEmail || user.email?.toLowerCase() === pendingEmail) &&
        appState.currentStep === 3 && appState.generatedStory && appState.audioState?.audioUrl) {
      setAppState((prev) => ({ ...prev, currentStep: 5, selectedVoice: FIRST_FLOW_VOICE_ID }));
    }
  }, [firstFlow, serverFirstFlow, firstFlowReady, firstFlowOwner, user, pendingEmail, appState.currentStep, appState.generatedStory, appState.audioState?.audioUrl]);

  // Prepare the complete Angel story while the email link is being sent/opened.
  // No account record is written here; AudioPlayback associates the ready
  // story/audio with the authenticated account after the callback.
  useEffect(() => {
    if (!firstFlowOwner) firstPreparationAttempted.current = false;
  }, [firstFlowOwner]);

  useEffect(() => {
    if (!firstFlow || serverFirstFlow || !firstFlowReady || !firstFlowOwner || firstFlowComplete || appState.currentStep !== 3) return;
    if (appState.audioState?.audioUrl && appState.generatedStory) {
      setFirstPreparationStatus('ready');
      return;
    }
    if (firstPreparationAttempted.current) return;
    firstPreparationAttempted.current = true;
    let cancelled = false;

    const prepare = async () => {
      try {
        let story = appState.generatedStory;
        if (!story) {
          setFirstPreparationStatus('text');
          const response = await fetch('/api/generate-story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedFigure: appState.resourceFigure, questionAnswers: appState.questionAnswers, sparModus: false }),
          });
          if (!response.ok) throw new Error('Der Story-Text konnte nicht erstellt werden.');
          const result = await response.json();
          story = typeof result.story === 'string' ? result.story.trim() : '';
          if (!story) throw new Error('Der Story-Text ist leer.');
          if (cancelled) return;
          setAppState((prev) => ({ ...prev, generatedStory: story }));
          try {
            const saved = readFirstFlowSnapshot();
            window.localStorage.setItem(FIRST_FLOW_STORAGE_KEY, JSON.stringify({
              savedAt: Date.now(), state: { ...saved, currentStep: 3, generatedStory: story },
            }));
          } catch { /* The current tab can still finish the story. */ }
        }

        setFirstPreparationStatus('audio');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) throw new Error('Audio ist momentan nicht verfügbar.');
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}`, apikey: anonKey },
          body: JSON.stringify({ text: story, voiceId: FIRST_FLOW_VOICE_ID, adminPreview: false }),
        });
        if (!response.ok) throw new Error('Das Audio konnte nicht erstellt werden.');
        const result = await response.json();
        if (typeof result.audioUrl !== 'string' || !result.audioUrl) throw new Error('Das Audio ist nicht verfügbar.');
        if (cancelled) return;
        const audioState: AudioState = {
          audioUrl: result.audioUrl,
          voiceId: FIRST_FLOW_VOICE_ID,
          storyText: story,
          duration: 0,
          isGenerated: true,
          filename: result.filename,
        };
        // Persist before setState: the auth callback may open in another tab now.
        try {
          const saved = readFirstFlowSnapshot();
          window.localStorage.setItem(FIRST_FLOW_STORAGE_KEY, JSON.stringify({
            savedAt: Date.now(), state: { ...saved, currentStep: 3, generatedStory: story, audioState },
          }));
        } catch { /* The current tab can still finish the story. */ }
        setAppState((prev) => ({ ...prev, generatedStory: story, audioState }));
        setFirstPreparationStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setStoryGenerationError(error instanceof Error ? error.message : 'Deine Story konnte noch nicht erstellt werden.');
        setFirstPreparationStatus('error');
      }
    };
    // Delay until after React's development-mode effect replay, which would
    // otherwise cancel the first request and leave the attempted ref set.
    const timer = window.setTimeout(() => void prepare(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      firstPreparationAttempted.current = false;
    };
  }, [firstFlow, serverFirstFlow, firstFlowReady, firstFlowOwner, firstFlowComplete, appState.currentStep, firstPreparationRetry]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const email = currentUrl.searchParams.get('email');
      const isDev = currentUrl.searchParams.get('dev') === 'true';

      let origin = window.location.origin;

      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      const isProductionUrl = window.location.hostname.includes('ressourcen.app');

      if (isDev || isLocalhost) {
        origin = 'http://localhost:3000';
      }
      else if (isProductionUrl) {
        origin = window.location.origin;
      }

      const resetUrl = new URL('/auth/reset', origin);
      resetUrl.searchParams.set('code', code);
      if (email) {
        resetUrl.searchParams.set('email', email);
      }

      window.location.replace(resetUrl.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const figureId = searchParams?.get('figure');
    if (figureId && !appState.resourceFigure) {
      const allFigures = [...realFigures, ...fictionalFigures];
      const preselectedFigure = allFigures.find(f => f.id === figureId);

      if (preselectedFigure) {
        // New step order: 1=Figure, 2=Questions, 3=Voice, 4=Name, 5+=Audio
        // When coming from /figur with preselected figure, go directly to step 2 (Questions)
        const targetStep = 2;

        const ambivalentFigures = ['partner', 'teacher', 'sibling', 'best-friend', 'pet-dog', 'pet-cat'];
        if (ambivalentFigures.includes(preselectedFigure.id)) {
          const figureWithPronouns = {
            ...preselectedFigure,
            pronouns: preselectedFigure.id === 'best-friend' ? 'sie/ihr' : preselectedFigure.pronouns
          };
          setAppState(prev => ({
            ...prev,
            resourceFigure: figureWithPronouns,
            currentStep: targetStep
          }));
        } else {
          setAppState(prev => ({
            ...prev,
            resourceFigure: preselectedFigure,
            currentStep: targetStep
          }));
        }

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('figure');
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      }
    }
  }, [searchParams, user, userFullName, userDataLoaded, appState.resourceFigure, router]);

  useEffect(() => {
    const loadFullName = async () => {
      try {
        setUserDataLoaded(false);
        if (!user) {
          setUserFullName(null);
          setUserDataLoaded(true);
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, pronunciation_hint')
          .eq('id', user.id)
          .single();
        if (error) {
          console.warn('Could not fetch full_name:', error.message);
          setUserFullName(null);
          setUserPronunciationHint(null);
          setUserDataLoaded(true);
          return;
        }
        setUserFullName((data as any)?.full_name || null);
        setShowNameStep(!((data as any)?.full_name || '').trim());
        const rawHint = (data as any)?.pronunciation_hint;
        const parsedHint = rawHint ? rawHint.split('|')[0] : null;
        setUserPronunciationHint(parsedHint);
        setUserDataLoaded(true);
      } catch (e) {
        console.warn('Failed loading user full name');
        setUserFullName(null);
        setUserDataLoaded(true);
      }
    };
    loadFullName();
  }, [user]);

  const handleResourceFigureSelect = useCallback((figure: ResourceFigure) => {
    // Reset story generation flag when figure changes to allow new story generation
    storyGenerationAttempted.current = false;
    setStoryGenerationError(null);
    setAppState(prev => ({
      ...prev,
      resourceFigure: figure,
      // Reset story and audio when figure changes
      generatedStory: '',
      audioState: null
    }));
  }, []);

  const handleQuestionAnswersChange = useCallback((answers: QuestionAnswer[]) => {
    setAppState(prev => ({
      ...prev,
      questionAnswers: answers
    }));
  }, []);

  const handleQuestionIndexChange = useCallback((questionIndex: number) => {
    setAppState(prev => ({
      ...prev,
      currentQuestionIndex: questionIndex
    }));
  }, []);

  const handleStoryGenerated = useCallback((story: string) => {
    setAppState(prev => {
      // Only reset audioState if the story content actually changed
      const storyChanged = prev.generatedStory !== story;
      return {
        ...prev,
        generatedStory: story,
        // Only reset audio if story changed - prevents flickering on re-renders
        audioState: storyChanged ? null : prev.audioState
      };
    });
  }, []);

  const handleAudioStateChange = useCallback((audioState: AudioState | null) => {
    setAppState(prev => ({
      ...prev,
      audioState
    }));
  }, []);

  const handleFirstStorySaved = useCallback(() => {
    firstFlowSaved.current = true;
    try {
      window.localStorage.setItem(FIRST_FLOW_DONE_KEY, JSON.stringify({ savedAt: Date.now(), userId: user?.id }));
      window.localStorage.removeItem(FIRST_FLOW_STORAGE_KEY);
      window.sessionStorage.removeItem(FIRST_FLOW_STORAGE_KEY);
    } catch { /* The story has already been saved to the account. */ }
  }, [user?.id]);

  // Serverseitiger Flow: Die Story gehört jetzt einem Account, die Antworten
  // im Browser werden nicht mehr gebraucht.
  const handleServerFirstStoryComplete = useCallback(() => {
    firstFlowSaved.current = true;
    try {
      window.localStorage.removeItem(FIRST_FLOW_STORAGE_KEY);
      window.sessionStorage.removeItem(FIRST_FLOW_STORAGE_KEY);
    } catch { /* Browser storage is optional. */ }
  }, []);

  const retryFirstPreparation = useCallback(() => {
    firstPreparationAttempted.current = false;
    setStoryGenerationError(null);
    setFirstPreparationStatus('idle');
    setFirstPreparationRetry((retry) => retry + 1);
  }, []);

  const handleResetToStart = useCallback(() => {
    if (appState.audioState?.audioUrl) {
      URL.revokeObjectURL(appState.audioState.audioUrl);
    }
    setAppState(initialAppState);
    setAnonymousUserName(null);
    setAnonymousUserPronunciationHint(null);
    // Reset story generation flag so a new story can be generated
    storyGenerationAttempted.current = false;
    setStoryGenerationError(null);
    setIsGeneratingStory(false);
  }, [appState.audioState?.audioUrl]);

  useEffect(() => {
    setResetFunction(handleResetToStart);
  }, [setResetFunction, handleResetToStart]);

  // New step order: 1=Figure, 2=Questions, 3=Voice, 4=Name, 5+=Audio
  const handleNextStep = useCallback(() => {
    const isStep1Complete = appState.currentStep === 1 && appState.resourceFigure;
    const isStep3Complete = appState.currentStep === 3 && appState.selectedVoice;
    const isStep4Complete = appState.currentStep === 4; // Name step
    const isStep5Complete = appState.currentStep === 5 && appState.selectedVoice;
    const isStep6Complete = appState.currentStep === 6 && appState.selectedVoice;

    // Step 1 -> Step 2 (Questions)
    if (isStep1Complete) {
      const paywallDisabled = isEnabled('PAYWALL_DISABLED');
      const paywallEnabled = !paywallDisabled;

      if (user && paywallEnabled) {
        const checkPaywall = async () => {
          setCheckingAccess(true);
          try {
            const { data: existingStories } = await supabase
              .from('saved_stories')
              .select('id, is_audio_only')
              .eq('user_id', user.id);

            const aiResourceCount = existingStories?.filter((s: any) => !s.is_audio_only).length || 0;
            if (aiResourceCount === 0) {
              // First resource is free - go to questions
              setAppState(prev => ({ ...prev, currentStep: 2 }));
            } else {
              const canCreate = await canCreateResource(user.id);

              if (!canCreate) {
                setShowPaywall(true);
                return;
              } else {
                const { hasActiveAccess } = await import('@/lib/access');
                const hasAccess = await hasActiveAccess(user.id);

                if (!hasAccess) {
                  setShowPaywall(true);
                  return;
                }

                setAppState(prev => ({ ...prev, currentStep: 2 }));
              }
            }
          } catch (error) {
            console.error('[handleNextStep] Error checking paywall:', error);
            setShowPaywall(true);
          } finally {
            setCheckingAccess(false);
          }
        };

        checkPaywall();
        return;
      } else if (!user && paywallEnabled) {
        const checkAnonymousRateLimit = async () => {
          setCheckingAccess(true);
          try {
            const fingerprint = await getOrCreateBrowserFingerprint();

            const response = await fetch('/api/check-anonymous-rate-limit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                browserFingerprint: fingerprint,
              }),
            });

            if (!response.ok) {
              setShowPaywall(true);
              return;
            }

            setAppState(prev => ({ ...prev, currentStep: 2 }));
          } catch (error) {
            console.error('[handleNextStep] Error checking anonymous rate limit:', error);
            setAppState(prev => ({ ...prev, currentStep: 2 }));
          } finally {
            setCheckingAccess(false);
          }
        };

        checkAnonymousRateLimit();
        return;
      } else {
        setAppState(prev => ({ ...prev, currentStep: 2 }));
        return;
      }
    }

    // Step 2 (Questions) - handle question progression and move to step 3 (Voice)
    if (appState.currentStep === 2) {
      const questionId = appState.currentQuestionIndex + 1;
      const currentAnswer = appState.questionAnswers.find(a => a.questionId === questionId);
      if (!currentAnswer || currentAnswer.selectedBlocks.length < 1) {
        return;
      }

      const expectedQuestionCount = appState.resourceFigure?.category === 'place' ? 5 : 6;
      const allQuestionsAnswered = appState.questionAnswers.length === expectedQuestionCount &&
        appState.questionAnswers.every(a => a.answer.trim().length > 0 || a.selectedBlocks.length >= 1);

      if (allQuestionsAnswered) {
        setAppState(prev => ({
          ...prev,
          // Erststory: 3 = Account-Gate. Sonst: 3 = Stimme wählen – ohne Stimme
          // rendert Schritt 5 nichts und der Flow bleibt hängen.
          currentStep: 3,
          currentQuestionIndex: 0,
          selectedVoice: firstFlow ? FIRST_FLOW_VOICE_ID : prev.selectedVoice,
        }));
      } else {
        const nextQuestionIndex = (appState.currentQuestionIndex + 1) % expectedQuestionCount;
        setAppState(prev => ({ ...prev, currentQuestionIndex: nextQuestionIndex }));
      }
      return;
    }

    // Step 3 (Voice) -> Step 4 (Name) or skip to Step 5 if logged-in user already has name
    if (isStep3Complete) {
      if (user && userFullName && userFullName.trim() !== '') {
        // Logged-in user already has a name saved - skip name step
        setAppState(prev => ({ ...prev, currentStep: 5 }));
      } else {
        // Anonymous user (always ask) or logged-in user without name
        setAppState(prev => ({ ...prev, currentStep: 4 }));
      }
      return;
    }

    // Step 4 (Name) -> Step 5 (Audio)
    if (isStep4Complete) {
      setAppState(prev => ({ ...prev, currentStep: 5 }));
      return;
    }

    if (isStep5Complete || isStep6Complete) {
      setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  }, [appState.currentStep, appState.currentQuestionIndex, appState.resourceFigure, appState.questionAnswers, appState.generatedStory, appState.selectedVoice, user, userFullName, firstFlow]);

  // New step order: 1=Figure, 2=Questions, 3=Voice, 4=Name, 5+=Audio
  const handlePreviousStep = useCallback(() => {
    setAppState(prev => {
      let newStep = Math.max(1, prev.currentStep - 1);

      // Step 2 (Questions) -> Step 1 (Figure)
      if (prev.currentStep === 2) {
        newStep = 1;
      }

      // Step 3 (Voice) -> Step 2 (Questions)
      if (prev.currentStep === 3) {
        newStep = 2;
      }

      // Step 4 (Name) -> Step 3 (Voice)
      if (prev.currentStep === 4) {
        newStep = 3;
      }

      // Step 5 (Audio) -> Step 4 (Name) or Step 3 (Voice) if name already saved
      if (prev.currentStep === 5) {
        if (user && userFullName && userFullName.trim() !== '') {
          newStep = 3; // Skip name step, go back to voice
        } else {
          newStep = 4; // Go back to name step
        }
      }

      return {
        ...prev,
        currentStep: newStep,
        currentQuestionIndex: newStep === 2 ? 0 : prev.currentQuestionIndex
      };
    });
  }, [user, userFullName]);

  const retryStoryGeneration = useCallback(() => {
    setStoryGenerationError(null);
    storyGenerationAttempted.current = false;
    setAppState(prev => ({ ...prev, generatedStory: '' }));
  }, []);

  const backToVoiceSelection = useCallback(() => {
    setStoryGenerationError(null);
    storyGenerationAttempted.current = false;
    setAppState(prev => ({ ...prev, currentStep: 3, audioState: null }));
  }, []);

  // Raus aus dem Flow. Unterwegs nachfragen – sonst gehen Antworten oder die
  // gerade entstehende Story verloren.
  const exitLabel = user ? 'Meine Storys' : 'Startseite';
  const handleExit = useCallback(() => {
    const generating = appState.currentStep >= 5 && !appState.audioState?.audioUrl;
    const answering = appState.currentStep >= 2 && appState.currentStep < 5 && appState.questionAnswers.length > 0;
    if (generating && !window.confirm('Deine Power Story wird gerade erstellt. Wenn du jetzt gehst, wird sie nicht fertig. Trotzdem verlassen?')) return;
    if (answering && !window.confirm('Deine Antworten gehen verloren, wenn du jetzt gehst. Trotzdem verlassen?')) return;
    router.push(user ? '/dashboard' : '/');
  }, [appState.currentStep, appState.audioState?.audioUrl, appState.questionAnswers.length, router, user]);

  const handleUserDataUpdate = useCallback((fullName: string, pronunciationHint: string | null) => {
    if (user) {
      setUserFullName(fullName || null);
      setUserPronunciationHint(pronunciationHint || null);
    } else {
      setAnonymousUserName(fullName || null);
      setAnonymousUserPronunciationHint(pronunciationHint || null);
    }
  }, [user]);

  useEffect(() => {
    const run = async () => {
      if (firstFlow) return; // Angel is prepared before the account gate.
      if (!appState.resourceFigure) return;

      // Skip if we already have a story (restored from localStorage or already generated)
      if (appState.generatedStory && appState.generatedStory.trim().length > 0) {
        console.log('[CreateStory] Story already exists, skipping generation');
        return;
      }

      // Skip if already generating or already attempted
      if (isGeneratingStory || storyGenerationAttempted.current) {
        return;
      }

      if (appState.currentStep >= 5 && appState.selectedVoice) {
        // Mark as attempted to prevent double-triggering
        storyGenerationAttempted.current = true;
        setIsGeneratingStory(true);
        setStoryGenerationError(null);

        try {
          const effectiveUserName = user
            ? userFullName
            : anonymousUserName;
          const effectivePronunciationHint = user
            ? userPronunciationHint
            : anonymousUserPronunciationHint;

          const requestBody = {
            selectedFigure: appState.resourceFigure,
            questionAnswers: appState.questionAnswers,
            userName: isEnabled('FEATURE_USER_NAME') ? effectiveUserName || undefined : undefined,
            userPronunciationHint: isEnabled('FEATURE_USER_NAME') ? effectivePronunciationHint || undefined : undefined,
            sparModus: sparModus
          };

          // Stream: der Loader zeigt, wie viel der Geschichte schon geschrieben ist.
          const story = await generateStoryWithProgress(requestBody);
          handleStoryGenerated(story);
          setStoryGenerationError(null);
        } catch (error: any) {
          console.error('Story generation failed:', error);
          const errorMessage = error.message || 'Failed to generate story. Please try again.';
          setStoryGenerationError(errorMessage);
          // Reset the attempt flag so user can retry
          storyGenerationAttempted.current = false;
        } finally {
          setIsGeneratingStory(false);
        }
      }
    };
    run();
  }, [firstFlow, appState.currentStep, appState.resourceFigure, appState.questionAnswers, appState.selectedVoice, appState.generatedStory, isGeneratingStory, handleStoryGenerated, userFullName, userPronunciationHint, anonymousUserName, anonymousUserPronunciationHint, sparModus, user]);

  useEffect(() => {
    return () => {
      if (appState.audioState?.audioUrl) {
        URL.revokeObjectURL(appState.audioState.audioUrl);
      }
    };
  }, []);

  // Check if anonymous user is trying to access directly (should redirect)
  const figureParam = searchParams?.get('figure');
  const shouldRedirect = !user && !figureParam && !firstFlow && !appState.resourceFigure;

  if (!mounted || authLoading || (firstFlow && !firstFlowReady) || shouldRedirect) {
    return (
      <div className={`min-h-screen story-flow-background story-flow-boot flex items-center justify-center ${firstFlow ? 'story-flow-first-loading' : ''}`}>
        <div className="story-boot" role="status">
          <span className="story-boot-breath" aria-hidden="true" />
          <p>Einen Moment …</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen story-flow-background ${firstFlow ? 'story-flow-first' : 'story-flow-app'} ${firstFlow && appState.currentStep === 2 ? 'story-flow-first-question' : ''} ${firstFlow && appState.currentStep === 3 ? 'story-flow-first-account' : ''}`}>
      {firstFlow && (
        <div className="story-first-flow-header">
          <button
            type="button"
            className="story-first-flow-back"
            onClick={() => router.push('/')}
            aria-label="Zurück zur Startseite"
          >
            <ArrowLeft aria-hidden="true" />
            <span>Zurück</span>
          </button>
          <Image
            src="/images/power-storys_logo.webp"
            alt="Power Storys"
            width={160}
            height={48}
            className="story-first-flow-logo"
            priority
          />
          <span aria-hidden="true" />
        </div>
      )}
      {!firstFlow && (
        <StoryFlowProgress currentStep={appState.currentStep} showNameStep={showNameStep} onExit={handleExit} exitLabel={exitLabel} />
      )}

      <div className={`relative ${!firstFlow || appState.currentStep === 2 || appState.currentStep === 3 ? 'story-first-flow-content' : ''}`}>
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={appState.currentStep >= 5 ? 'audio-playback' : appState.currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              {appState.currentStep === 1 && !firstFlow && (
                <ResourceFigureSelection
                  selectedFigure={appState.resourceFigure}
                  onFigureSelect={handleResourceFigureSelect}
                  onNext={handleNextStep}
                  busy={checkingAccess}
                />
              )}

              {appState.currentStep === 2 && appState.resourceFigure && !firstFlowComplete && (
                <RelationshipSelection
                  selectedFigure={appState.resourceFigure}
                  questionAnswers={appState.questionAnswers}
                  onAnswersChange={handleQuestionAnswersChange}
                  onNext={handleNextStep}
                  currentQuestionIndex={appState.currentQuestionIndex}
                  onQuestionIndexChange={handleQuestionIndexChange}
                  onPrevious={firstFlow ? undefined : handlePreviousStep}
                />
              )}

              {appState.currentStep === 3 && appState.resourceFigure && !firstFlow && (
                <VoiceSelection
                  onVoiceSelect={(voiceId) => {
                    setAppState(prev => ({ ...prev, selectedVoice: voiceId }));
                  }}
                  onNext={handleNextStep}
                  onPrevious={handlePreviousStep}
                  selectedVoiceId={appState.selectedVoice}
                  resourceFigure={appState.resourceFigure}
                  onSparModusChange={setSparModus}
                />
              )}

              {appState.currentStep === 3 && serverFirstFlow && (
                <FirstStoryServerGate
                  questionAnswers={appState.questionAnswers}
                  linkError={searchParams.get('linkError') === '1'}
                  onComplete={handleServerFirstStoryComplete}
                />
              )}

              {firstFlow && !serverFirstFlow && firstFlowComplete && (
                <div className="story-first-handoff" role="status">
                  <h1>Deine Power Story ist gespeichert.</h1>
                  <p>Du findest sie jetzt in deinem Zugang.</p>
                  <button type="button" onClick={() => router.push('/dashboard')}>Zu meinen Power Storys</button>
                </div>
              )}

              {appState.currentStep >= 3 && firstFlow && !serverFirstFlow && !firstFlowComplete && !firstFlowOwner && (
                <div className="story-first-handoff" role="status">
                  <h1>Deine Power Story entsteht im anderen Tab.</h1>
                  <p>Deine Antworten sind sicher. Wechsle zum Tab, in dem du deine Fragen beantwortet hast. Dort geht es nach dem Login automatisch weiter. Wenn dieser Tab geschlossen wird, übernehmen wir hier automatisch.</p>
                </div>
              )}

              {appState.currentStep === 3 && firstFlow && !serverFirstFlow && firstFlowOwner && !firstFlowComplete && user && pendingEmail && user.email?.toLowerCase() !== pendingEmail && (
                <div className="story-first-handoff" role="alert">
                  <h1>Bitte nutze den richtigen Account.</h1>
                  <p>Der Zugangslink wurde an {pendingEmail} geschickt. Melde dich mit diesem Account an, damit deine Antworten zugeordnet werden.</p>
                  <button type="button" onClick={() => void supabase.auth.signOut()}>Anderen Account verwenden</button>
                </div>
              )}

              {appState.currentStep === 3 && firstFlow && !serverFirstFlow && firstFlowOwner && !firstFlowComplete && !user && (
                <FirstStoryEmailGate
                  linkError={searchParams.get('linkError') === '1'}
                  onEmailSent={setPendingEmail}
                  preparationStatus={firstPreparationStatus}
                  preparationError={storyGenerationError}
                  onRetryPreparation={retryFirstPreparation}
                />
              )}

              {appState.currentStep === 3 && firstFlow && !serverFirstFlow && firstFlowOwner && !firstFlowComplete && user && (!pendingEmail || user.email?.toLowerCase() === pendingEmail) && (
                <div className="story-first-handoff" role="status">
                  <h1>Deine Power Story wird vorbereitet.</h1>
                  <p>{firstPreparationStatus === 'audio' ? 'Die Stimme von Kerstin wird gerade erstellt.' : 'Deine Antworten sind gespeichert. Einen Moment noch …'}</p>
                  {firstPreparationStatus === 'error' && <button type="button" onClick={retryFirstPreparation}>Erneut versuchen</button>}
                </div>
              )}

              {appState.currentStep === 4 && appState.resourceFigure && (
                <NamePronunciationForm
                  onNext={handleNextStep}
                  onBack={handlePreviousStep}
                  selectedFigure={appState.resourceFigure}
                  userFullName={user ? userFullName : anonymousUserName}
                  userPronunciationHint={user ? userPronunciationHint : anonymousUserPronunciationHint}
                  onUserDataUpdate={handleUserDataUpdate}
                  voiceId={appState.selectedVoice}
                />
              )}

              {appState.currentStep >= 5 && appState.resourceFigure && appState.selectedVoice && (!firstFlow || (!serverFirstFlow && firstFlowOwner && !firstFlowComplete)) && (
                  <AudioPlayback
                    selectedFigure={appState.resourceFigure}
                    generatedStory={appState.generatedStory}
                    onNext={handleNextStep}
                    audioState={appState.audioState}
                    onAudioStateChange={handleAudioStateChange}
                    selectedVoiceId={appState.selectedVoice}
                    sparModus={sparModus}
                    questionAnswers={appState.questionAnswers}
                    onShowAccountCreated={() => setShowAccountCreated(true)}
                    storyGenerationError={storyGenerationError}
                    isGeneratingStory={isGeneratingStory}
                    onFirstStorySaved={firstFlow ? handleFirstStorySaved : undefined}
                    onRetryStory={retryStoryGeneration}
                    onChangeVoice={firstFlow ? undefined : backToVoiceSelection}
                  />
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <SavedStoriesModal
        isOpen={showSavedStories}
        onClose={() => setShowSavedStories(false)}
      />

      {showAccountCreated && (
        <AccountCreated
          onClose={() => {
            setShowAccountCreated(false);
            window.location.href = '/dashboard';
          }}
        />
      )}

      {showPaywall && (
        <Paywall
          onClose={() => {
            setShowPaywall(false);
            router.push("/dashboard");
          }}
          message="Deine kostenlose erste Ressource ist bereits erstellt. Fühle dich jeden Tag sicher, geborgen und beschützt"
        />
      )}
    </div>
  );
}

export default function CreateStory() {
  return (
    <Suspense fallback={
      <div className="min-h-screen story-flow-background flex items-center justify-center">
        <div className="text-amber-600">Lade...</div>
      </div>
    }>
      <CreateStoryInner />
    </Suspense>
  );
}
