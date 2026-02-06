"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { isEnabled } from "@/lib/featureFlags";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import ResourceFigureSelection from "@/components/ResourceFigureSelection";
import RelationshipSelection, { QuestionAnswer } from "@/components/RelationshipSelection";
import NamePronunciationForm from "@/components/NamePronunciationForm";
import VoiceSelection from "@/components/VoiceSelection";
import AudioPlayback from "@/components/AudioPlayback";
import AccountCreated from "@/components/AccountCreated";
import SavedStoriesModal from "@/components/SavedStoriesModal";
import { useAppReset } from "@/components/providers/app-reset-provider";
import Paywall from "@/components/Paywall";
import { canCreateResource } from "@/lib/access";
import { getOrCreateBrowserFingerprint } from "@/lib/browser-fingerprint";
import { realFigures, fictionalFigures } from "@/data/figures";
import { ResourceFigure, AudioState, AppState } from "@/lib/types/story";

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
  const [appState, setAppState] = useState<AppState>(initialAppState);
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
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  // Track if story generation was already attempted to prevent double-triggering
  const storyGenerationAttempted = useRef(false);

  // Note: Anonymous users are allowed to create stories
  // They will be prompted to create an account after story generation

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
    setAppState(prev => ({
      ...prev,
      resourceFigure: figure
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

  const handleResetToStart = useCallback(() => {
    if (appState.audioState?.audioUrl) {
      URL.revokeObjectURL(appState.audioState.audioUrl);
    }
    setAppState(initialAppState);
    setAnonymousUserName(null);
    setAnonymousUserPronunciationHint(null);
  }, [appState.audioState?.audioUrl]);

  useEffect(() => {
    setResetFunction(handleResetToStart);
  }, [setResetFunction, handleResetToStart]);

  // New step order: 1=Figure, 2=Questions, 3=Voice, 4=Name, 5+=Audio
  const canProceed =
    (appState.currentStep === 1 && appState.resourceFigure) ||
    (appState.currentStep === 2 && (() => {
      const currentAnswer = appState.questionAnswers.find(a => {
        const questionId = appState.currentQuestionIndex + 1;
        return a.questionId === questionId;
      });

      const selectedBlocksLength = currentAnswer?.selectedBlocks?.length || 0;
      const hasEnoughAnswers = selectedBlocksLength >= 3;

      return hasEnoughAnswers;
    })()) ||
    (appState.currentStep === 3 && appState.selectedVoice) ||
    (appState.currentStep === 4) || // Name step - always can proceed
    (appState.currentStep === 5 && appState.selectedVoice) ||
    (appState.currentStep === 6 && appState.selectedVoice);

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
          }
        };

        checkPaywall();
        return;
      } else if (!user && paywallEnabled) {
        const checkAnonymousRateLimit = async () => {
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
      const currentAnswer = appState.questionAnswers[appState.currentQuestionIndex];
      if (!currentAnswer || currentAnswer.selectedBlocks.length < 2) {
        return;
      }

      const expectedQuestionCount = appState.resourceFigure?.category === 'place' ? 5 : 6;
      const allQuestionsAnswered = appState.questionAnswers.length === expectedQuestionCount &&
        appState.questionAnswers.every(a => a.answer.trim().length > 0 || a.selectedBlocks.length >= 2);

      if (allQuestionsAnswered) {
        setAppState(prev => ({ ...prev, currentStep: 3, currentQuestionIndex: 0 }));
      } else {
        const nextQuestionIndex = (appState.currentQuestionIndex + 1) % expectedQuestionCount;
        setAppState(prev => ({ ...prev, currentQuestionIndex: nextQuestionIndex }));
      }
      return;
    }

    // Step 3 (Voice) -> Step 4 (Name)
    if (isStep3Complete) {
      setAppState(prev => ({ ...prev, currentStep: 4 }));
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
  }, [appState.currentStep, appState.resourceFigure, appState.questionAnswers, appState.generatedStory, appState.selectedVoice, user]);

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

      return {
        ...prev,
        currentStep: newStep,
        currentQuestionIndex: newStep === 2 ? 0 : prev.currentQuestionIndex
      };
    });
  }, []);

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

          const response = await fetch('/api/generate-story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            const { story } = await response.json();
            if (story && story.trim().length > 0) {
              handleStoryGenerated(story);
              setStoryGenerationError(null);
            } else {
              throw new Error('Empty story received from API');
            }
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate story`);
          }
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
  }, [appState.currentStep, appState.resourceFigure, appState.questionAnswers, appState.selectedVoice, appState.generatedStory, isGeneratingStory, handleStoryGenerated, userFullName, userPronunciationHint, anonymousUserName, anonymousUserPronunciationHint, sparModus, user]);

  useEffect(() => {
    return () => {
      if (appState.audioState?.audioUrl) {
        URL.revokeObjectURL(appState.audioState.audioUrl);
      }
    };
  }, []);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          {/* Breathing Circle - consistent loader */}
          <motion.div
            className="w-20 h-20 rounded-full border-2 border-amber-400 relative mx-auto mb-6"
            animate={{
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-amber-400"
              style={{ opacity: 0.08 }}
              animate={{
                opacity: [0.05, 0.1, 0.05],
              }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <p className="text-amber-600">Lade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Sticky mobile button for Questions step (step 2) */}
      {appState.currentStep === 2 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-orange-100 p-3 z-10">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: canProceed ? 1 : 0.5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              handleNextStep();
            }}
            disabled={!canProceed}
            className={`w-full px-4 py-3 text-white rounded-lg transition-all text-base font-semibold flex items-center justify-center gap-2 shadow-lg max-sm:text-sm ${canProceed
                ? 'cursor-pointer'
                : 'cursor-not-allowed'
              }`}
            style={{
              backgroundColor: 'rgb(217, 119, 6)',
              opacity: canProceed ? 1 : 0.5,
              transition: 'opacity 0.3s ease'
            }}
          >
            Weiter
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      )}

      <div className="min-h-screen relative">
        <div className="flex-1 min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={appState.currentStep >= 5 ? 'audio-playback' : appState.currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {appState.currentStep === 1 && (
                <ResourceFigureSelection
                  selectedFigure={appState.resourceFigure}
                  onFigureSelect={handleResourceFigureSelect}
                  onNext={handleNextStep}
                />
              )}

              {appState.currentStep === 2 && appState.resourceFigure && (
                <RelationshipSelection
                  selectedFigure={appState.resourceFigure}
                  questionAnswers={appState.questionAnswers}
                  onAnswersChange={handleQuestionAnswersChange}
                  onNext={handleNextStep}
                  currentQuestionIndex={appState.currentQuestionIndex}
                  onQuestionIndexChange={handleQuestionIndexChange}
                />
              )}

              {appState.currentStep === 3 && appState.resourceFigure && (
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

              {appState.currentStep === 4 && appState.resourceFigure && (
                <NamePronunciationForm
                  onNext={handleNextStep}
                  onBack={handlePreviousStep}
                  selectedFigure={appState.resourceFigure}
                  userFullName={user ? userFullName : anonymousUserName}
                  userPronunciationHint={user ? userPronunciationHint : anonymousUserPronunciationHint}
                  onUserDataUpdate={handleUserDataUpdate}
                />
              )}

              {appState.currentStep >= 5 && appState.resourceFigure && appState.selectedVoice && (
                <>
                  {storyGenerationError && (
                    <div className="max-w-4xl mx-auto mb-6 p-6 bg-red-50 border border-red-200 rounded-2xl">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 text-3xl">⚠️</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-900 mb-2">
                            Fehler bei der Story-Generierung
                          </h3>
                          <p className="text-red-700 mb-4">
                            {storyGenerationError}
                          </p>
                          <button
                            onClick={() => {
                              setStoryGenerationError(null);
                              storyGenerationAttempted.current = false;
                              setAppState(prev => ({ ...prev, generatedStory: '' }));
                            }}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Erneut versuchen
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
                  />
                </>
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
          onClose={() => setShowPaywall(false)}
          message="Deine kostenlose erste Ressource ist bereits erstellt. Fühle dich jeden Tag sicher, geborgen und beschützt"
        />
      )}
    </div>
  );
}

export default function CreateStory() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-amber-600">Lade...</div>
      </div>
    }>
      <CreateStoryInner />
    </Suspense>
  );
}
