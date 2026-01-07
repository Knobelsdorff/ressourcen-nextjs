"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { isEnabled } from "@/lib/featureFlags";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, Heart } from "lucide-react";
import ResourceFigureSelection from "@/components/ResourceFigureSelection";
import RelationshipSelection, { QuestionAnswer } from "@/components/RelationshipSelection";
import StoryGeneration from "@/components/StoryGeneration";
import VoiceSelection from "@/components/VoiceSelection";
import AudioPlayback from "@/components/AudioPlayback";
import AccountCreated from "@/components/AccountCreated";
import SavedStoriesModal from "@/components/SavedStoriesModal";
import { useAppReset } from "@/components/providers/app-reset-provider";
import Paywall from "@/components/Paywall";
import { canCreateResource } from "@/lib/access";
import { getOrCreateBrowserFingerprint } from "@/lib/browser-fingerprint";
import { realFigures, fictionalFigures } from "@/data/figures";

export interface ResourceFigure {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  isCustom?: boolean;
  category: 'real' | 'fictional' | 'custom' | 'place';
  pronouns: string; // Add this line
}
export interface AudioState {
  audioUrl: string | null;
  voiceId: string;
  storyText: string;
  duration: number;
  isGenerated: boolean;
  filename?: string;
}

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

export interface AppState {
  currentStep: number;
  resourceFigure: ResourceFigure | null;
  questionAnswers: QuestionAnswer[];
  generatedStory: string;
  selectedVoice: string;
  audioState: AudioState | null;
  currentQuestionIndex: number;
}

  const steps = [
    {
      number: 1,
      title: "Ressourcenfigur",
      icon: "🤗"
    },
    {
      number: 2,
      title: "Beziehung",
      icon: "💝"
    },
    {
      number: 3,
      title: "Stimme wechseln",
      icon: "🎤"
    },
    {
      number: 4,
      title: "Anhören",
      icon: "🎧"
    }
  ];


const initialAppState: AppState = {
  currentStep: 1, // Start with resource figure selection (original landing page)
  resourceFigure: null,
  questionAnswers: [],
  generatedStory: "",
  selectedVoice: "",
  audioState: null,
  currentQuestionIndex: 0
};

function RessourcenAppInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [showSavedStories, setShowSavedStories] = useState(false);
  const [showAccountCreated, setShowAccountCreated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { setResetFunction } = useAppReset();
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [userPronunciationHint, setUserPronunciationHint] = useState<string | null>(null);
  const [sparModus, setSparModus] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [storyGenerationError, setStoryGenerationError] = useState<string | null>(null);
  
  // Debug: Log current state
  console.log('Current user state:', { 
    user: user?.email, 
    userFullName: userFullName, 
    userPronunciationHint: userPronunciationHint,
    featureEnabled: isEnabled('FEATURE_USER_NAME'),
    envVar: process.env.NEXT_PUBLIC_FEATURE_USER_NAME
  });
  
  // Debug: Log the actual values
  console.log('User details:', {
    email: user?.email,
    fullName: userFullName,
    pronunciationHint: userPronunciationHint,
    isLoggedIn: !!user,
    featureEnabled: isEnabled('FEATURE_USER_NAME')
  });
  
  // Debug: Log sparModus state
  console.log('SparModus state:', {
    sparModus: sparModus,
    type: typeof sparModus
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle figure preselection from query parameter (from /figur)
  useEffect(() => {
    const figureId = searchParams?.get('figure');
    if (figureId && !appState.resourceFigure) {
      // Find figure in all figures
      const allFigures = [...realFigures, ...fictionalFigures];
      const preselectedFigure = allFigures.find(f => f.id === figureId);
      
      if (preselectedFigure) {
        // Handle ambivalent figures (best-friend needs pronoun selection)
        const ambivalentFigures = ['partner', 'teacher', 'sibling', 'best-friend', 'pet-dog', 'pet-cat'];
        if (ambivalentFigures.includes(preselectedFigure.id)) {
          // For best-friend, default to 'sie/ihr' (can be changed later)
          const figureWithPronouns = {
            ...preselectedFigure,
            pronouns: preselectedFigure.id === 'best-friend' ? 'sie/ihr' : preselectedFigure.pronouns
          };
          setAppState(prev => ({
            ...prev,
            resourceFigure: figureWithPronouns,
            currentStep: 2 // Skip to questions
          }));
        } else {
          setAppState(prev => ({
            ...prev,
            resourceFigure: preselectedFigure,
            currentStep: 2 // Skip to questions
          }));
        }
        
        // Remove query parameter from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('figure');
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  // Fetch user's full name from profiles (optional)
  useEffect(() => {
    const loadFullName = async () => {
      try {
        if (!user) {
          setUserFullName(null);
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
          return;
        }
        setUserFullName((data as any)?.full_name || null);
        setUserPronunciationHint((data as any)?.pronunciation_hint || null);
        console.log('Loaded user data:', { 
          fullName: (data as any)?.full_name, 
          pronunciationHint: (data as any)?.pronunciation_hint 
        });
      } catch (e) {
        console.warn('Failed loading user full name');
        setUserFullName(null);
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

  // New handler for question index changes in step 2
  const handleQuestionIndexChange = useCallback((questionIndex: number) => {
    setAppState(prev => ({
      ...prev,
      currentQuestionIndex: questionIndex
    }));
  }, []);

  const handleStoryGenerated = useCallback((story: string) => {
    setAppState(prev => ({
      ...prev,
      generatedStory: story,
      audioState: null
    }));
  }, []);

  const handleAudioStateChange = useCallback((audioState: AudioState | null) => {
    setAppState(prev => ({
      ...prev,
      audioState
    }));
  }, []);

  const handleStorySave = useCallback(() => {
    if (appState.audioState?.audioUrl) {
      URL.revokeObjectURL(appState.audioState.audioUrl);
    }
    setAppState(initialAppState);
  }, [appState.audioState?.audioUrl]);

  const handleStoryDiscard = useCallback(() => {
    if (appState.audioState?.audioUrl) {
      URL.revokeObjectURL(appState.audioState.audioUrl);
    }
    setAppState(initialAppState);
  }, [appState.audioState?.audioUrl]);

  // Reset function for header link
  const handleResetToStart = useCallback(() => {
    if (appState.audioState?.audioUrl) {
      URL.revokeObjectURL(appState.audioState.audioUrl);
    }
    setAppState(initialAppState);
  }, [appState.audioState?.audioUrl]);

  // Register reset function with context
  useEffect(() => {
    setResetFunction(handleResetToStart);
  }, [setResetFunction, handleResetToStart]);

  // Define canProceed before handleNextStep
  const canProceed = 
    (appState.currentStep === 1 && appState.resourceFigure) ||
    (appState.currentStep === 2 && (() => {
      // In Schritt 2: Prüfe, ob die aktuelle Frage beantwortet ist
      const currentAnswer = appState.questionAnswers.find(a => {
        const questionId = appState.currentQuestionIndex + 1; // Fragen sind 1-indexiert
        return a.questionId === questionId;
      });
      
      // Normale Behandlung für alle Fragen
      const selectedBlocksLength = currentAnswer?.selectedBlocks?.length || 0;
      const hasEnoughAnswers = selectedBlocksLength >= 2;
      
      return hasEnoughAnswers;
    })()) ||
    (appState.currentStep === 3 && appState.selectedVoice) ||
    (appState.currentStep === 4 && appState.selectedVoice) ||
    (appState.currentStep === 5 && appState.selectedVoice);

  console.log('canProceed calculation:', {
    currentStep: appState.currentStep,
    resourceFigure: appState.resourceFigure,
    canProceed,
    step1Check: appState.currentStep === 1 && appState.resourceFigure,
    step3Check: appState.currentStep === 3 && appState.generatedStory.trim().length > 0,
    generatedStoryLength: appState.generatedStory?.length || 0
  });

  const handleNextStep = useCallback(() => {
    console.log('handleNextStep called', { 
      currentStep: appState.currentStep, 
      resourceFigure: appState.resourceFigure,
      questionAnswers: appState.questionAnswers.length
    });
    
    const isStep1Complete = appState.currentStep === 1 && appState.resourceFigure;
    
    // Bestimme die erwartete Anzahl von Fragen basierend auf der Ressource
    const expectedQuestionCount = appState.resourceFigure?.category === 'place' ? 5 : 6;
    
    const isStep2Complete = appState.currentStep === 2 && 
      appState.questionAnswers.length === expectedQuestionCount && 
      appState.questionAnswers.every(a => a.answer.trim().length > 0 || a.selectedBlocks.length > 0);
    const isStep3Complete = appState.currentStep === 3 && appState.selectedVoice;
    const isStep4Complete = appState.currentStep === 4 && appState.selectedVoice;
    const isStep5Complete = appState.currentStep === 5 && appState.selectedVoice;
    
    console.log('Step completion checks:', { 
      isStep1Complete, 
      isStep2Complete, 
      isStep3Complete, 
      isStep4Complete, 
      isStep5Complete 
    });
    
    if (isStep1Complete) {
      // Paywall-Prüfung: Wenn User bereits 1 KI-generierte Ressource hat, prüfe Zugang BEVOR Step 2 startet
      // Paywall ist standardmäßig aktiviert (nur deaktiviert wenn PAYWALL_DISABLED explizit auf true gesetzt ist)
      const paywallDisabled = isEnabled('PAYWALL_DISABLED');
      const paywallEnabled = !paywallDisabled; // Standardmäßig aktiviert
      
      console.log(`[handleNextStep] Paywall check: disabled=${paywallDisabled}, enabled=${paywallEnabled}`);
      
      if (user && paywallEnabled) {
        console.log('[handleNextStep] Step 1 complete, checking if user can create resource...');
        
        const checkPaywall = async () => {
          try {
            // WICHTIG: Zähle nur KI-generierte Ressourcen (ignoriere Audio-only)
            // Gleiche Logik wie in canCreateResource
            const { data: existingStories } = await supabase
              .from('saved_stories')
              .select('id, is_audio_only')
              .eq('user_id', user.id);
            
            // Zähle nur KI-generierte Ressourcen (nicht Audio-only)
            const aiResourceCount = existingStories?.filter((s: any) => !s.is_audio_only).length || 0;
            const totalResourceCount = existingStories?.length || 0;
            console.log(`[handleNextStep] User has ${totalResourceCount} total resource(s), ${aiResourceCount} AI-generated`);
            
            // 1. KI-Ressource ist gratis (immer erlaubt)
            if (aiResourceCount === 0) {
              console.log('[handleNextStep] First AI resource - allowing progression to step 2');
              setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
            } else {
              // Ab der 2. KI-Ressource: Prüfe Zugang über canCreateResource
              console.log(`[handleNextStep] User has ${aiResourceCount} AI-generated resource(s), checking access...`);
              const canCreate = await canCreateResource(user.id);
              
              console.log(`[handleNextStep] canCreateResource returned: ${canCreate} for user ${user.id}`);
              
              if (!canCreate) {
                console.log('[handleNextStep] User cannot create more resources - showing paywall');
                setShowPaywall(true);
                // Nicht weiterleiten - Paywall blockiert
                return;
              } else {
                console.log('[handleNextStep] User has access - allowing progression to step 2');
                // WICHTIG: Prüfe nochmal explizit, ob User wirklich ein aktives Abo hat
                // Falls canCreateResource fälschlicherweise true zurückgibt
                const { hasActiveAccess } = await import('@/lib/access');
                const hasAccess = await hasActiveAccess(user.id);
                console.log(`[handleNextStep] hasActiveAccess check: ${hasAccess}`);
                
                if (!hasAccess) {
                  console.log('[handleNextStep] User does NOT have active access - showing paywall despite canCreateResource=true');
                  setShowPaywall(true);
                  return;
                }
                
                setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
              }
            }
          } catch (error) {
            console.error('[handleNextStep] Error checking paywall:', error);
            // Bei Fehler: Blockiere Weiterleitung (Fail-Closed für Sicherheit)
            setShowPaywall(true);
          }
        };
        
        checkPaywall();
        return;
      } else if (!user && paywallEnabled) {
        // Unauthenticated User: Prüfe Browser-Fingerprint Rate-Limiting
        console.log('[handleNextStep] Unauthenticated user - checking browser fingerprint rate limit...');
        
        const checkAnonymousRateLimit = async () => {
          try {
            const fingerprint = await getOrCreateBrowserFingerprint();
            console.log('[handleNextStep] Browser fingerprint:', fingerprint);
            
            // Prüfe Rate-Limit über API
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
              const errorData = await response.json();
              console.log('[handleNextStep] Rate limit exceeded:', errorData);
              setShowPaywall(true);
              return;
            }
            
            // Rate-Limit OK: Erlaube Weiterleitung
            console.log('[handleNextStep] Rate limit OK - allowing progression to step 2');
            setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
          } catch (error) {
            console.error('[handleNextStep] Error checking anonymous rate limit:', error);
            // Bei Fehler: Erlaube Weiterleitung (Fail-Open für bessere UX)
            setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
          }
        };
        
        checkAnonymousRateLimit();
        return;
      } else {
        // Paywall deaktiviert oder nicht eingeloggt: Erlaube Weiterleitung
        console.log('Moving from step', appState.currentStep, 'to', appState.currentStep + 1);
        setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
        return;
      }
    }

    if (isStep2Complete) {
      console.log('Moving from step 2 to 3');
      setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
      return;
    }

        // In Schritt 2: Erlaube Navigation zwischen Fragen oder zum nächsten Schritt
        if (appState.currentStep === 2) {
          console.log('In step 2 - checking if we can proceed to next step');
          
          // Prüfe, ob die aktuelle Frage mindestens 2 Antworten hat
          const currentAnswer = appState.questionAnswers[appState.currentQuestionIndex];
          if (!currentAnswer || currentAnswer.selectedBlocks.length < 2) {
            console.log('Current question needs at least 2 answers');
            return;
          }
          
          // Prüfe, ob alle Fragen beantwortet sind
          const expectedQuestionCount = appState.resourceFigure?.category === 'place' ? 5 : 6;
          const allQuestionsAnswered = appState.questionAnswers.length === expectedQuestionCount && 
            appState.questionAnswers.every(a => a.answer.trim().length > 0 || a.selectedBlocks.length >= 2);
          
          if (allQuestionsAnswered) {
            console.log('All questions answered, moving directly to step 4 (voice selection)');
            setAppState(prev => ({ ...prev, currentStep: 4, currentQuestionIndex: 0 }));
          } else {
            console.log('Moving to next question');
            // Navigiere zur nächsten Frage
            const nextQuestionIndex = (appState.currentQuestionIndex + 1) % expectedQuestionCount;
            setAppState(prev => ({ ...prev, currentQuestionIndex: nextQuestionIndex }));
          }
          return;
        }

    if (isStep3Complete || isStep4Complete || isStep5Complete) {
      console.log('Moving to next step');
      setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  }, [appState.currentStep, appState.resourceFigure, appState.questionAnswers, appState.generatedStory, appState.selectedVoice]);

  const handlePreviousStep = useCallback(() => {
    setAppState(prev => {
      let newStep = Math.max(1, prev.currentStep - 1);
      
      // Wenn wir von Schritt 4 (VoiceSelection) zurückgehen, sollten wir zu Schritt 2 (RelationshipSelection) gehen
      // da Schritt 3 (StoryGeneration) übersprungen wird
      if (prev.currentStep === 4) {
        newStep = 2;
      }
      
      return {
        ...prev,
        currentStep: newStep,
        // Reset question index when entering step 2
        currentQuestionIndex: newStep === 2 ? 0 : prev.currentQuestionIndex
      };
    });
  }, []);

  const handleStepClick = useCallback((stepNumber: number) => {
    // Bestimme die erwartete Anzahl von Fragen basierend auf der Ressource
    const expectedQuestionCount = appState.resourceFigure?.category === 'place' ? 5 : 6;
    
    const canNavigate = 
      stepNumber === 1 ||
      (stepNumber === 2 && appState.resourceFigure) ||
      (stepNumber === 3 && appState.resourceFigure && appState.questionAnswers.length === expectedQuestionCount) ||
      (stepNumber === 4 && appState.resourceFigure && appState.questionAnswers.length === expectedQuestionCount && appState.selectedVoice) ||
      (stepNumber === 5 && appState.resourceFigure && appState.questionAnswers.length === expectedQuestionCount && appState.selectedVoice);
    
    if (canNavigate) {
      setAppState(prev => ({
        ...prev,
        currentStep: stepNumber,
        // Reset question index when navigating to step 2
        currentQuestionIndex: stepNumber === 2 ? 0 : prev.currentQuestionIndex
      }));
    }
  }, [appState.resourceFigure, appState.questionAnswers, appState.generatedStory, appState.selectedVoice]);

  const showNavigation = appState.currentStep > 1 || (canProceed && appState.currentStep <= 5);

  // Starte Story-Erzeugung im Hintergrund ab Schritt 4 (Audio Playback), wenn noch leer UND eine Stimme ausgewählt wurde
  useEffect(() => {
    const run = async () => {
      if (!appState.resourceFigure) return;
      if (appState.currentStep >= 4 && appState.selectedVoice && !isGeneratingStory && !appState.generatedStory.trim()) {
        setIsGeneratingStory(true);
        setStoryGenerationError(null); // Clear previous errors
        try {
          const requestBody = {
            selectedFigure: appState.resourceFigure,
            questionAnswers: appState.questionAnswers,
            userName: isEnabled('FEATURE_USER_NAME') ? userFullName || undefined : undefined,
            userPronunciationHint: isEnabled('FEATURE_USER_NAME') ? userPronunciationHint || undefined : undefined,
            sparModus: sparModus
          };

      console.log('Story generation request:', {
        featureEnabled: isEnabled('FEATURE_USER_NAME'),
        userFullName: userFullName,
        userPronunciationHint: userPronunciationHint,
        sparModus: sparModus,
        requestBody: JSON.stringify(requestBody, null, 2)
      });

      console.log('Detailed request body:', JSON.stringify(requestBody, null, 2));

      console.log('Story generation details:', {
        userName: requestBody.userName,
        userPronunciationHint: requestBody.userPronunciationHint,
        sparModus: requestBody.sparModus,
        willUseName: !!requestBody.userName,
        willUseHint: !!requestBody.userPronunciationHint,
        selectedFigure: requestBody.selectedFigure?.name,
        questionAnswersCount: requestBody.questionAnswers?.length
      });

      console.log('User state check:', {
        isLoggedIn: !!user,
        userEmail: user?.email,
        userFullName: userFullName,
        userPronunciationHint: userPronunciationHint,
        featureEnabled: isEnabled('FEATURE_USER_NAME'),
        willSendUserName: isEnabled('FEATURE_USER_NAME') ? userFullName || undefined : undefined,
        willSendPronunciationHint: isEnabled('FEATURE_USER_NAME') ? userPronunciationHint || undefined : undefined
      });

          console.log('SparModus check:', {
            sparModus: sparModus,
            requestBodySparModus: requestBody.sparModus,
            isTrue: sparModus === true,
            isFalse: sparModus === false
          });

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
          // Don't proceed to audio generation if story failed
        } finally {
          setIsGeneratingStory(false);
        }
      }
    };
    run();
  }, [appState.currentStep, appState.resourceFigure, appState.questionAnswers, appState.selectedVoice, appState.generatedStory, isGeneratingStory, handleStoryGenerated, userFullName, userPronunciationHint, sparModus]);

  // Helper function to get current step display info
  const getCurrentStepInfo = () => {
    if (appState.currentStep === 2) {
      // Bestimme die Anzahl der Fragen basierend auf der Ressource
      const expectedQuestionCount = appState.resourceFigure?.category === 'place' ? 5 : 6;
      
      return {
        title: `Question ${appState.currentQuestionIndex + 1} of ${expectedQuestionCount}`,
        subtitle: "Relationship Questions",
        icon: "💝"
      };
    }
    
    const currentStepData = steps[appState.currentStep - 1];
    return {
      title: `Step ${appState.currentStep} of ${steps.length}`,
      subtitle: currentStepData.title,
      icon: currentStepData.icon
    };
  };

  useEffect(() => {
    return () => {
      if (appState.audioState?.audioUrl) {
        URL.revokeObjectURL(appState.audioState.audioUrl);
      }
    };
  }, []);

  // Verhindere Hydration-Mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-amber-600">Lade...</div>
      </div>
    );
  }

  return (
   <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">

        {/* Mobile Navigation - Weiter Button (nur ab Schritt 2, NICHT bei Audio/Schritt 4) */}
        {appState.currentStep >= 2 && appState.currentStep !== 4 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-orange-100 p-3 z-10">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: canProceed ? 1 : 0.5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              console.log('Mobile button clicked', { canProceed, currentStep: appState.currentStep });
              handleNextStep();
            }}
            disabled={!canProceed}
            className={`w-full px-4 py-3 text-white rounded-lg transition-all text-base font-semibold flex items-center justify-center gap-2 shadow-lg ${
              canProceed 
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

      {/* Desktop Layout - OHNE Sidebar */}
      <div className="min-h-screen relative">
        {/* Main Content Area - VOLLER PLATZ */}
        <div className="flex-1 min-h-screen pb-16 lg:pb-20">
          <AnimatePresence mode="sync">
            <motion.div
              key={appState.currentStep}
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

                {appState.currentStep === 4 && appState.resourceFigure && appState.selectedVoice && (
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
                    />
                  </>
                )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>


      {/* Saved Stories Modal */}
      <SavedStoriesModal 
        isOpen={showSavedStories} 
        onClose={() => setShowSavedStories(false)} 
      />

      {/* Account Created Modal */}
      {showAccountCreated && (
        <AccountCreated 
          onClose={() => {
            setShowAccountCreated(false);
            // Weiterleitung zum Dashboard
            window.location.href = '/dashboard';
          }} 
        />
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          message="Deine kostenlose erste Ressource ist bereits erstellt. Fühle dich jeden Tag sicher, geborgen und beschützt"
        />
      )}
    </div>
  );
}

export default function RessourcenApp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-amber-600">Lade...</div>
      </div>
    }>
      <RessourcenAppInner />
    </Suspense>
  );
}