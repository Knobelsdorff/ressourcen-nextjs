"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { ResourceFigure } from "@/lib/types/story";
import { getQuestionsWithPronouns } from "@/data/questions";
import { placeQuestions } from "@/data/placeQuestions";
import IdealFamilyIconFinal from './IdealFamilyIconFinal';
import JesusIconFinal from './JesusIconFinal';
import ArchangelMichaelIconFinal from './ArchangelMichaelIconFinal';
import AngelIconFinal from './AngelIconFinal';
import SuperheroIconFinal from './SuperheroIconFinal';

export interface QuestionAnswer {
  questionId: number;
  answer: string;
  selectedBlocks: string[];
  customBlocks?: string[]; // Benutzerdefinierte Snippets pro Frage
}

interface RelationshipSelectionProps {
  selectedFigure: ResourceFigure;
  questionAnswers: QuestionAnswer[];
  onAnswersChange: (answers: QuestionAnswer[]) => void;
  onNext: () => void;
  currentQuestionIndex: number;
  onQuestionIndexChange: (index: number) => void;
}

export default function RelationshipSelection({
  selectedFigure,
  questionAnswers,
  onAnswersChange,
  onNext,
  currentQuestionIndex,
  onQuestionIndexChange
}: RelationshipSelectionProps) {
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  // UI-Schalter: Einfach auf false setzen, um zum alten Hinweis zurückzukehren
  const useCounterChip = true;
  // Design-Schalter: Neutral + grüner Akzent (true) vs. bisherige Amber-Zwischenzustände (false)
  const useNeutralAccentTheme = true;

  // Bestimme, welche Fragen verwendet werden sollen
  const isPlace = selectedFigure.category === 'place';

  const questionsToUse = isPlace ? placeQuestions : getQuestionsWithPronouns(selectedFigure);
  const currentQuestion = questionsToUse[currentQuestionIndex];
  const MAX_SELECTIONS = 3;

  // FIX: Only auto-navigate on initial mount and when answers change (not when currentQuestionIndex changes)
  useEffect(() => {
    if (!hasInitialized.current) {
      const firstIncompleteIndex = questionsToUse.findIndex(q => {
        const answer = questionAnswers.find(a => a.questionId === q.id);
        return !answer || (answer.answer.trim().length === 0 && answer.selectedBlocks.length === 0);
      });

      // If all questions are complete, stay on last question
      const targetIndex = firstIncompleteIndex === -1 ? questionsToUse.length - 1 : firstIncompleteIndex;

      if (currentQuestionIndex !== targetIndex) {
        onQuestionIndexChange(targetIndex);
      }

      hasInitialized.current = true;
    }
  }, [questionAnswers]); // REMOVED: currentQuestionIndex and onQuestionIndexChange from dependencies

  // Auto-scroll to top when question changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentQuestionIndex]);

  const currentAnswer = useMemo<QuestionAnswer>(() => {
    return (
      questionAnswers.find(a => a.questionId === currentQuestion.id) ?? {
        questionId: currentQuestion.id,
        answer: "",
        selectedBlocks: [],
        customBlocks: []
      }
    );
  }, [questionAnswers, currentQuestion.id]);

  const selectedCount = currentAnswer.selectedBlocks.length;

  const updateCurrentAnswer = useCallback(
    (updates: Partial<QuestionAnswer>) => {
      const updated = { ...currentAnswer, ...updates };

      onAnswersChange([
        ...questionAnswers.filter(a => a.questionId !== currentQuestion.id),
        updated
      ]);
    },
    [currentAnswer, questionAnswers, currentQuestion.id, onAnswersChange]
  );


  const handleBlockToggle = (block: string) => {
    if (currentAnswer.selectedBlocks.includes(block)) {
      updateCurrentAnswer({
        selectedBlocks: currentAnswer.selectedBlocks.filter(b => b !== block)
      });
      return;
    }

    if (selectedCount < MAX_SELECTIONS) {
      updateCurrentAnswer({
        selectedBlocks: [...currentAnswer.selectedBlocks, block]
      });
    }
  };

  // Zustand für benutzerdefiniertes Snippet
  const [customSnippet, setCustomSnippet] = useState("");

  const addCustomSnippet = () => {
    const existingCustom = currentAnswer.customBlocks || [];
    // ⛔ no more than MAX_SELECTIONS custom blocks
    if (existingCustom.length >= MAX_SELECTIONS) {
      return;
    }

    const text = customSnippet.trim();
    if (!text) return;
    
    const isDuplicate = existingCustom.includes(text) || currentQuestion.blocks.includes(text);
    if (isDuplicate) {
      setCustomSnippet("");
      return;
    }

    const updatedCustom = [...existingCustom, text];

    // Optional: automatisch auswählen, solange < MAX_SELECTIONS
    let updatedSelected = currentAnswer.selectedBlocks;
    if (updatedSelected.length < MAX_SELECTIONS) {
      updatedSelected = [...updatedSelected, text];
    }

    updateCurrentAnswer({ customBlocks: updatedCustom, selectedBlocks: updatedSelected });
    setCustomSnippet("");
  };

  const canProceedFromCurrentQuestion = () => {
    return currentAnswer.answer.trim().length > 0 || selectedCount >= MAX_SELECTIONS;
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questionsToUse.length - 1) {
      onQuestionIndexChange(currentQuestionIndex + 1);
    } else {
      // All questions completed
      onNext();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      onQuestionIndexChange(currentQuestionIndex - 1);
    }
  };

  const windowWidth = useMemo(
    () => (typeof window !== "undefined" ? window.innerWidth : 0),
    []
  );

  const customLimitReached =
  (currentAnswer.customBlocks?.length || 0) >= MAX_SELECTIONS;

  return (
    <>
      <div className="min-h-screen bg-amber-50 pb-20 lg:pb-0">
        <div className="flex items-start justify-center sm:p-4 p-3 sm:pt-8 pt-5">
          <div className="w-full max-w-[851px] max-sm:flex max-sm:flex-col-reverse max-sm:gap-5">
            {/* Main Card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-[20px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)] sm:p-8 py-3 px-4"
            >
              {/* Header with Emoji and Figure Name */}
              <div className="flex items-center justify-center gap-1 sm:mb-5 mb-2">
                <div className="sm:text-4xl text-3xl ">
                  {selectedFigure.id === 'ideal-family' ? (
                    <IdealFamilyIconFinal size={windowWidth > 599 ? 48 : 24} className="sm:w-12 sm:h-12 w-8 h-8" />
                  ) : selectedFigure.id === 'jesus' ? (
                    <JesusIconFinal size={windowWidth > 599 ? 48 : 24} className="sm:w-12 sm:h-12 w-8 h-8" />
                  ) : selectedFigure.id === 'archangel-michael' ? (
                    <ArchangelMichaelIconFinal size={windowWidth > 599 ? 48 : 24} className="sm:w-12 sm:h-12 w-8 h-8" />
                  ) : selectedFigure.id === 'angel' ? (
                    <AngelIconFinal size={windowWidth > 599 ? 48 : 24} className="sm:w-12 sm:h-12 w-8 h-8" />
                  ) : selectedFigure.id === 'superhero' ? (
                    <SuperheroIconFinal size={windowWidth > 599 ? 48 : 24} className="sm:w-12 sm:h-12 w-8 h-8" />
                  ) : (
                    <span>{selectedFigure.emoji}</span>
                  )}
                </div>
                <div className="sm:text-2xl text-xl text-gray-900 font-normal">{selectedFigure.name}</div>
              </div>

              {/* Question */}
              <div className="text-center sm:mb-8 mb-5">
                <h2 className="sm:text-2xl text-base text-gray-800 font-normal">
                  {currentQuestion.question}
                </h2>
                {useCounterChip && (
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-2 px-3 sm:py-1 py-[2px] rounded-full border text-xs font-medium ${selectedCount === 0
                        ? 'bg-gray-100 text-gray-800 border-gray-200'
                        : selectedCount === MAX_SELECTIONS
                          ? 'bg-green-100 text-green-800 border-[#22c55e]'
                          : (useNeutralAccentTheme
                            ? 'bg-gray-50 text-gray-800 border-gray-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200')
                        }`}
                    >
                      {selectedCount === MAX_SELECTIONS && (
                        <span className="w-3.5 h-3.5 inline-flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span>
                        {selectedCount}/{MAX_SELECTIONS} ausgewählt
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Alternative Hinweis-Leiste (nur wenn Counter-Chip aus) */}
              {!useCounterChip && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                  <p className="text-xs text-gray-700 text-center">Wähle 3 Antworten aus</p>
                </div>
              )}


              {/* Calm helper hint above options */}
              <div className="mb-4">
                <p className="text-xs text-gray-500/80 text-center">
                  Wähle die Aussagen, die sich im Moment am stimmigsten anfühlen.
                </p>
              </div>

              {/* Answer Blocks - 2 Column Layout (inkl. eigene Snippets) */}
              <div className="grid grid-cols-1 md:grid-cols-2 sm:gap-4 gap-3 mb-8">
                {[...currentQuestion.blocks, ...(currentAnswer.customBlocks || [])].map((block, index) => {
                  const personalizedBlock = block;
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBlockToggle(block)}
                      className={`w-full sm:h-11 max-sm:py-[7px] sm:rounded-[30px] rounded-[20px] border flex items-center gap-3 px-4 transition-all ${currentAnswer.selectedBlocks.includes(block)
                        ? (selectedCount === MAX_SELECTIONS
                          ? 'border-green-500 bg-green-50'
                          : (useNeutralAccentTheme
                            ? 'border-zinc-300 bg-gray-50'
                            : 'border-amber-400 bg-amber-50'))
                        : selectedCount >= MAX_SELECTIONS && !currentAnswer.selectedBlocks.includes(block)
                          ? 'border-gray-300 bg-gray-100 opacity-40 cursor-not-allowed'
                          : 'border-zinc-200 bg-gray-50 hover:border-zinc-300'
                        }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${currentAnswer.selectedBlocks.includes(block)
                        ? (selectedCount === MAX_SELECTIONS
                          ? 'border-green-600 bg-green-600'
                          : (useNeutralAccentTheme ? 'border-zinc-400 bg-gray-200' : 'border-amber-500 bg-amber-500'))
                        : selectedCount >= MAX_SELECTIONS && !currentAnswer.selectedBlocks.includes(block)
                          ? 'border-gray-400 bg-gray-200'
                          : 'border-stone-300'
                        }`}>
                        {currentAnswer.selectedBlocks.includes(block) && (
                          <Check className={`w-3 h-3 ${selectedCount === MAX_SELECTIONS ? 'text-white' : 'text-gray-700'}`} />
                        )}
                      </div>

                      {/* Text */}
                      <span className={`sm:text-sm text-xs font-normal flex-1 text-left leading-tight ${selectedCount >= MAX_SELECTIONS && !currentAnswer.selectedBlocks.includes(block)
                        ? 'text-gray-500'
                        : 'text-black'
                        }`}>
                        {personalizedBlock}
                      </span>
                      {(currentAnswer.customBlocks || []).includes(block) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          Custom
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Eigene Snippets hinzufügen */}
              <div className="mb-8 mt-6">
                <Label htmlFor="custom-snippet" className="text-xs text-gray-600/80 mb-2 block">Eigene Worte (optional):</Label>
                <div className="flex gap-2 mb-3">
                  <input
                    id="custom-snippet"
                    type="text"
                    value={customSnippet}
                    onChange={(e) => setCustomSnippet(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSnippet();
                      }
                    }}
                    disabled={customLimitReached}
                    placeholder="Deine Formulierung"
                    className="flex-1 sm:h-11 max-sm:py-1 sm:px-4 px-3 sm:rounded-[12px] rounded-[8px] border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm text-amber-900 leading-none w-[70%]"
                    maxLength={120}
                  />
                  <Button
                    type="button"
                    onClick={addCustomSnippet}
                    disabled={customLimitReached}
                    className="sm:h-11 max-sm:py-1 sm:px-4 px-3 bg-white text-gray-700 border border-gray-300 sm:rounded-[12px] rounded-[8px] hover:bg-gray-50 leading-none"
                  >
                    Hinzufügen
                  </Button>
                </div>
              </div>

              {/* Mobile Zurück Button */}
              <div className="lg:hidden mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`w-full px-4 max-sm:text-sm sm:py-3 py-2 text-gray-700 border border-gray-300 rounded-lg transition-all text-base font-medium flex items-center justify-center gap-2 ${currentQuestionIndex === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50 active:bg-gray-100'
                    }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  Zurück
                </motion.button>
              </div>

              {/* Navigation - Desktop only */}
              <div className="hidden lg:flex justify-between items-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </motion.button>

                <div className="text-center">
                  {/* Progress indicator removed - only bottom progress bar shown */}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNextQuestion}
                  disabled={!canProceedFromCurrentQuestion()}
                  className="px-7 py-3 bg-[#f0fdf4] text-black border border-[#22c55e] rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base font-normal shadow-sm"
                >
                  {currentQuestionIndex === questionsToUse.length - 1 ? (
                    <>
                      Abschließen
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Weiter
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="sm:mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="sm:text-sm text-xs text-gray-700 font-medium">
                  Fortschritt: {currentQuestionIndex + 1} von {questionsToUse.length}
                </span>
                <span className="sm:text-sm text-xs text-gray-600">
                  {Math.round(((currentQuestionIndex + 1) / questionsToUse.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gray-400 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestionIndex + 1) / questionsToUse.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}