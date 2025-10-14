"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, Heart } from "lucide-react";
import UserNameInput from "@/components/UserNameInput";
import ResourceFigureSelection from "@/components/ResourceFigureSelection";
import RelationshipSelection, { QuestionAnswer } from "@/components/RelationshipSelection";
import StoryGeneration from "@/components/StoryGeneration";
import VoiceSelection from "@/components/VoiceSelection";
import AudioPlayback from "@/components/AudioPlayback";
import SaveAndReflect from "@/components/SaveAndReflect";
import SavedStoriesModal from "@/components/SavedStoriesModal";
import { useAppReset } from "@/components/providers/app-reset-provider";

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
  userName: string; // Added for personalization
  resourceFigure: ResourceFigure | null;
  questionAnswers: QuestionAnswer[];
  generatedStory: string;
  selectedVoice: string;
  audioState: AudioState | null;
  currentQuestionIndex: number; // Added for step 2 question tracking
}

const steps = [
  {
    number: 0,
    title: "Name",
    icon: "👤"
  },
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
    title: "Geschichte erzeugen",
    icon: "✨"
  },
      {
        number: 4,
        title: "Stimme wechseln",
        icon: "🎤"
      },
  {
    number: 5,
    title: "Anhören",
    icon: "🎧"
  },
  {
    number: 6,
    title: "Speichern & Reflektieren",
    icon: "🌟"
  }
];


const initialAppState: AppState = {
  currentStep: 0, // Start with step 0 (name input)
  userName: "", // Added for personalization
  resourceFigure: null,
  questionAnswers: [],
  generatedStory: "",
  selectedVoice: "",
  audioState: null,
  currentQuestionIndex: 0 // Added for step 2 question tracking
};

export default function RessourcenApp() {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [showSavedStories, setShowSavedStories] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { setResetFunction } = useAppReset();

  useEffect(() => {
    setMounted(true);
  }, []);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  const handleUserNameChange = useCallback((name: string) => {
    setAppState(prev => ({
      ...prev,
      userName: name
    }));
  }, []);

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
    (appState.currentStep === 0 && appState.userName.trim().length > 0) ||
    (appState.currentStep === 1 && appState.resourceFigure) ||
    (appState.currentStep === 2 && (() => {
      // In Schritt 2: Prüfe, ob die aktuelle Frage mindestens 2 Antworten hat
      const currentAnswer = appState.questionAnswers.find(a => {
        const questionId = appState.currentQuestionIndex + 1; // Fragen sind 1-indexiert
        return a.questionId === questionId;
      });
      
      const selectedBlocksLength = currentAnswer?.selectedBlocks?.length || 0;
      const hasEnoughAnswers = selectedBlocksLength >= 2;
      
      console.log('Step 2 canProceed check:', {
        currentQuestionIndex: appState.currentQuestionIndex,
        currentAnswer,
        selectedBlocksLength,
        hasEnoughAnswers
      });
      
      return hasEnoughAnswers;
    })()) ||
    // Schritt 3 wird übersprungen
    (appState.currentStep === 4 && appState.selectedVoice) ||
    (appState.currentStep === 5 && appState.generatedStory.trim().length > 0 && appState.selectedVoice) ||
    (appState.currentStep === 6 && appState.generatedStory.trim().length > 0 && appState.selectedVoice);

  console.log('canProceed calculation:', {
    currentStep: appState.currentStep,
    resourceFigure: appState.resourceFigure,
    canProceed,
    step1Check: appState.currentStep === 1 && appState.resourceFigure
  });

  const handleNextStep = useCallback(() => {
    console.log('handleNextStep called', { 
      currentStep: appState.currentStep, 
      resourceFigure: appState.resourceFigure,
      questionAnswers: appState.questionAnswers.length
    });
    
    const isStep0Complete = appState.currentStep === 0 && appState.userName.trim().length > 0;
    const isStep1Complete = appState.currentStep === 1 && appState.resourceFigure;
    
    // Bestimme die erwartete Anzahl von Fragen basierend auf der Ressource
    const expectedQuestionCount = appState.resourceFigure?.category === 'place' ? 5 : 6;
    
    const isStep2Complete = appState.currentStep === 2 && 
      appState.questionAnswers.length === expectedQuestionCount && 
      appState.questionAnswers.every(a => a.answer.trim().length > 0 || a.selectedBlocks.length > 0);
    const isStep3Complete = appState.currentStep === 3 && appState.generatedStory.trim().length > 0;
    const isStep4Complete = appState.currentStep === 4 && appState.selectedVoice;
    const isStep5Complete = appState.currentStep === 5 && appState.selectedVoice;
    
    console.log('Step completion checks:', { 
      isStep1Complete, 
      isStep2Complete, 
      isStep3Complete, 
      isStep4Complete, 
      isStep5Complete 
    });
    
    if (isStep0Complete || isStep1Complete) {
      console.log('Moving from step', appState.currentStep, 'to', appState.currentStep + 1);
      setAppState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
      return;
    }

    if (isStep2Complete) {
      console.log('Moving from step 2 to 4 (skipping 3)');
      // Direkt zur Stimmauswahl springen und Story im Hintergrund starten
      setAppState(prev => ({ ...prev, currentStep: 4, currentQuestionIndex: 0 }));
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
        console.log('All questions answered, moving to step 4');
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
      // Schritt 4: erlauben ohne fertige Geschichte
      (stepNumber === 4 && appState.resourceFigure && appState.questionAnswers.length === expectedQuestionCount) ||
      (stepNumber === 5 && appState.resourceFigure && appState.questionAnswers.length === expectedQuestionCount && appState.selectedVoice) ||
      (stepNumber === 6 && appState.resourceFigure && appState.questionAnswers.length === expectedQuestionCount && appState.selectedVoice);
    
    if (canNavigate) {
      setAppState(prev => ({
        ...prev,
        currentStep: stepNumber,
        // Reset question index when navigating to step 2
        currentQuestionIndex: stepNumber === 2 ? 0 : prev.currentQuestionIndex
      }));
    }
  }, [appState.resourceFigure, appState.questionAnswers, appState.generatedStory, appState.selectedVoice]);

  const showNavigation = appState.currentStep > 1 || (canProceed && appState.currentStep <= 6);

  // Starte Story-Erzeugung im Hintergrund ab Schritt 4, wenn noch leer
  useEffect(() => {
    const run = async () => {
      if (!appState.resourceFigure) return;
      if (appState.currentStep >= 4 && !isGeneratingStory && !appState.generatedStory.trim()) {
        setIsGeneratingStory(true);
        try {
          const response = await fetch('/api/generate-story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedFigure: appState.resourceFigure, questionAnswers: appState.questionAnswers })
          });
          if (response.ok) {
            const { story } = await response.json();
            handleStoryGenerated(story);
          }
        } catch {
          // ignore background errors
        } finally {
          setIsGeneratingStory(false);
        }
      }
    };
    run();
  }, [appState.currentStep, appState.resourceFigure, appState.questionAnswers, appState.generatedStory, isGeneratingStory, handleStoryGenerated]);

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
    
    const currentStepData = steps[appState.currentStep];
    return {
      title: `Step ${appState.currentStep + 1} of ${steps.length}`,
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
      {/* Mobile Header Progress - OPTIMIZED */}
      <div className="lg:hidden bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-10">
        <div className="px-4 py-3">
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-light text-amber-900">Ressourcen</h1>
              <p className="text-amber-700 text-xs">{getCurrentStepInfo().subtitle}</p>
            </div>
            
            {/* Compact Saved Stories Button */}
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => setShowSavedStories(true)}
              className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            >
              <Heart className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Horizontal Compact Progress */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-1">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center"
                >
                  <button
                    onClick={() => handleStepClick(step.number)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 hover:scale-110 ${
                      step.number === appState.currentStep
                        ? 'bg-amber-500 text-white'
                        : step.number < appState.currentStep
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-orange-100 text-amber-600 hover:bg-orange-200'
                    }`}
                  >
                    {step.number < appState.currentStep ? '✓' : step.number}
                  </button>
                  {index < 4 && (
                    <div 
                      className={`w-3 h-0.5 mx-0.5 rounded-full transition-all duration-300 ${
                        step.number < appState.currentStep ? 'bg-green-300' : 'bg-orange-200'
                      }`}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

        {/* Mobile Navigation - Weiter Button (nur ab Schritt 2) */}
        {appState.currentStep >= 2 && (
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
              {appState.currentStep === 0 && (
                <UserNameInput
                  userName={appState.userName}
                  onUserNameChange={handleUserNameChange}
                  onNext={handleNextStep}
                />
              )}

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
                  userName={appState.userName}
                />
              )}

              {appState.currentStep === 3 && appState.resourceFigure && (() => {
                // Bestimme die erwartete Anzahl von Fragen basierend auf der Ressource
                const expectedQuestionCount = appState.resourceFigure?.category === 'place' ? 5 : 6;
                
                return appState.questionAnswers.length === expectedQuestionCount;
              })() && (
                <StoryGeneration
                  selectedFigure={appState.resourceFigure}
                  questionAnswers={appState.questionAnswers}
                  generatedStory={appState.generatedStory}
                  onStoryGenerated={handleStoryGenerated}
                  onNext={handleNextStep}
                  onSave={async () => {
                    // Geschichte direkt speichern und zum Dashboard weiterleiten
                    console.log('=== DIRECT SAVE AND GO TO DASHBOARD ===');
                    
                    try {
                      // Verwende die bestehende Supabase-Logik
                      const { supabase } = await import('@/lib/supabase');
                      
                      if (!user) {
                        throw new Error('Benutzer nicht angemeldet');
                      }

                      // Geschichte in Supabase speichern
                      const { data, error } = await supabase
                        .from('saved_stories')
                        .insert({
                          user_id: user.id,
                          title: `Reise mit ${appState.resourceFigure?.name}`,
                          content: appState.generatedStory,
                          resource_figure: appState.resourceFigure,
                          question_answers: appState.questionAnswers,
                          audio_url: null,
                          voice_id: null
                        })
                        .select();

                      if (error) {
                        throw new Error(`Fehler beim Speichern: ${error.message}`);
                      }

                      console.log('Story saved successfully, redirecting to dashboard...');
                      
                      // Zum Dashboard weiterleiten
                      window.location.href = '/dashboard';
                      
                    } catch (error) {
                      console.error('Error saving story:', error);
                      alert(`Fehler beim Speichern der Geschichte: ${error}`);
                    }
                  }}
                />
              )}

              {appState.currentStep === 4 && appState.resourceFigure && (
                <VoiceSelection
                  onVoiceSelect={(voiceId) => {
                    setAppState(prev => ({ ...prev, selectedVoice: voiceId }));
                  }}
                  onNext={handleNextStep}
                  onPrevious={handlePreviousStep}
                  selectedVoiceId={appState.selectedVoice}
                  resourceFigure={appState.resourceFigure}
                />
              )}

              {appState.currentStep === 5 && appState.resourceFigure && appState.selectedVoice && (
                <AudioPlayback
                  selectedFigure={appState.resourceFigure}
                  generatedStory={appState.generatedStory}
                  onNext={handleNextStep}
                  audioState={appState.audioState}
                  onAudioStateChange={handleAudioStateChange}
                  selectedVoiceId={appState.selectedVoice}
                />
              )}

              {appState.currentStep === 6 && appState.resourceFigure && appState.generatedStory.trim().length > 0 && appState.selectedVoice && (
                <SaveAndReflect
                  resourceFigure={appState.resourceFigure}
                  questionAnswers={appState.questionAnswers}
                  generatedStory={appState.generatedStory}
                  onDiscard={handleStoryDiscard}
                  audioState={appState.audioState}
                />
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
    </div>
  );
}