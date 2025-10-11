"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, ChevronLeft, ChevronRight, ArrowRight, Eye, Heart, Shield, MessageCircle, Sparkles, Users } from "lucide-react";
import { ResourceFigure } from "@/app/page";
import { questions, getQuestionsWithPronouns } from "@/data/questions";
import { placeQuestions } from "@/data/placeQuestions";

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
  currentQuestionIndex: number; // Added prop
  onQuestionIndexChange: (index: number) => void; // Added prop
}

export default function RelationshipSelection({
  selectedFigure,
  questionAnswers,
  onAnswersChange,
  onNext,
  currentQuestionIndex, // New prop
  onQuestionIndexChange // New prop
}: RelationshipSelectionProps) {
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Bestimme, welche Fragen verwendet werden sollen
  const isPlace = selectedFigure.category === 'place';
  
  const questionsToUse = isPlace ? placeQuestions : getQuestionsWithPronouns(selectedFigure);
  const currentQuestion = questionsToUse[currentQuestionIndex];
  
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
  
  const getCurrentAnswer = (): QuestionAnswer => {
    return questionAnswers.find(a => a.questionId === currentQuestion.id) || {
      questionId: currentQuestion.id,
      answer: "",
      selectedBlocks: [],
      customBlocks: []
    };
  };

  const updateCurrentAnswer = (updates: Partial<QuestionAnswer>) => {
    const currentAnswer = getCurrentAnswer();
    const updatedAnswer = { ...currentAnswer, ...updates };
    
    const newAnswers = questionAnswers.filter(a => a.questionId !== currentQuestion.id);
    newAnswers.push(updatedAnswer);
    
    onAnswersChange(newAnswers);
  };

  const handleTextChange = (text: string) => {
    updateCurrentAnswer({ answer: text });
  };

  const handleBlockToggle = (block: string) => {
    const currentAnswer = getCurrentAnswer();
    
    // Wenn der Block bereits ausgewählt ist, entferne ihn
    if (currentAnswer.selectedBlocks.includes(block)) {
      const newSelectedBlocks = currentAnswer.selectedBlocks.filter(b => b !== block);
      updateCurrentAnswer({ selectedBlocks: newSelectedBlocks });
    } 
    // Wenn der Block noch nicht ausgewählt ist und weniger als 2 ausgewählt sind
    else if (currentAnswer.selectedBlocks.length < 2) {
      const newSelectedBlocks = [...currentAnswer.selectedBlocks, block];
      updateCurrentAnswer({ selectedBlocks: newSelectedBlocks });
    }
    // Wenn bereits 2 ausgewählt sind, tue nichts (oder zeige eine Benachrichtigung)
  };

  // Zustand für benutzerdefiniertes Snippet
  const [customSnippet, setCustomSnippet] = useState("");

  const addCustomSnippet = () => {
    const text = customSnippet.trim();
    if (!text) return;

    const currentAnswer = getCurrentAnswer();
    const existingCustom = currentAnswer.customBlocks || [];
    const isDuplicate = existingCustom.includes(text) || currentQuestion.blocks.includes(text);
    if (isDuplicate) {
      setCustomSnippet("");
      return;
    }

    const updatedCustom = [...existingCustom, text];

    // Optional: automatisch auswählen, solange < 2 ausgewählt
    let updatedSelected = currentAnswer.selectedBlocks;
    if (updatedSelected.length < 2) {
      updatedSelected = [...updatedSelected, text];
    }

    updateCurrentAnswer({ customBlocks: updatedCustom, selectedBlocks: updatedSelected });
    setCustomSnippet("");
  };

  const canProceedFromCurrentQuestion = () => {
    const currentAnswer = getCurrentAnswer();
    return currentAnswer.answer.trim().length > 0 || currentAnswer.selectedBlocks.length >= 2;
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

  const allQuestionsCompleted = questionsToUse.every(q => {
    const answer = questionAnswers.find(a => a.questionId === q.id);
    return answer && (answer.answer.trim().length > 0 || answer.selectedBlocks.length > 0);
  });

  const currentAnswer = getCurrentAnswer();

  return (
    <>
      <div ref={containerRef} className="min-h-screen bg-amber-50">
        <div className="flex items-start justify-center p-4 pt-8">
          <div className="w-full max-w-[851px]">
            {/* Main Card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-[20px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)] p-8"
            >
              {/* Header with Emoji and Figure Name */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="text-4xl">{selectedFigure.emoji}</div>
                <div className="text-2xl text-amber-900 font-normal">{selectedFigure.name}</div>
              </div>

              {/* Mobile Question Counter */}
              <div className="lg:hidden text-center mb-4">
                <p className="text-amber-600 text-sm mb-1">
                  Frage {currentQuestionIndex + 1} von {questionsToUse.length}
                </p>
              </div>

              {/* Question */}
              <div className="text-center mb-8">
                <h2 className="text-2xl text-amber-700 font-normal">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Admin Sparmodus Schalter bei Frage 6 */}
              {(() => {
                const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
                  .split(',')
                  .map(e => e.trim().toLowerCase())
                  .filter(Boolean);
                const email = (user?.email || '').toLowerCase();
                const isAdmin = email && list.includes(email);
                const isLastQuestion = ! (selectedFigure.category === 'place') && currentQuestionIndex === 5; // Q6 bei Personen
                const isLastQuestionPlace = (selectedFigure.category === 'place') && currentQuestionIndex === 4; // Q5 bei Orten
                if (!isAdmin) return null;
                if (!(isLastQuestion || isLastQuestionPlace)) return null;
                const current = (typeof window !== 'undefined' ? localStorage.getItem('admin_sparmodus') === '1' : false);
                return (
                  <div className="flex items-center justify-center mb-6">
                    <label className="inline-flex items-center gap-2 text-amber-800">
                      <input
                        type="checkbox"
                        defaultChecked={current}
                        onChange={(e) => {
                          try { localStorage.setItem('admin_sparmodus', e.target.checked ? '1' : '0'); } catch {}
                        }}
                      />
                      <span className="text-sm">Sparmodus (nur erster Satz im Audio)</span>
                    </label>
                  </div>
                );
              })()}

              {/* Answer Blocks - 2 Column Layout (inkl. eigene Snippets) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[...currentQuestion.blocks, ...(currentAnswer.customBlocks || [])].map((block, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBlockToggle(block)}
                    className={`w-full h-11 rounded-[30px] border flex items-center gap-3 px-4 transition-all ${
                      currentAnswer.selectedBlocks.includes(block)
                        ? 'border-amber-400 bg-amber-50'
                        : currentAnswer.selectedBlocks.length >= 2 && !currentAnswer.selectedBlocks.includes(block)
                        ? 'border-gray-300 bg-gray-100 opacity-40 cursor-not-allowed'
                        : 'border-zinc-200 bg-gray-50 hover:border-zinc-300'
                    }`}
                  >
                                         {/* Checkbox */}
                     <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                       currentAnswer.selectedBlocks.includes(block)
                         ? 'border-amber-500 bg-amber-500'
                         : currentAnswer.selectedBlocks.length >= 2 && !currentAnswer.selectedBlocks.includes(block)
                         ? 'border-gray-400 bg-gray-200'
                         : 'border-stone-300'
                     }`}>
                       {currentAnswer.selectedBlocks.includes(block) && (
                         <Check className="w-3 h-3 text-white" />
                       )}
                     </div>
                     
                     {/* Text */}
                     <span className={`text-sm font-normal flex-1 text-left leading-tight ${
                       currentAnswer.selectedBlocks.length >= 2 && !currentAnswer.selectedBlocks.includes(block)
                         ? 'text-gray-500'
                         : 'text-black'
                     }`}>
                       {block}
                     </span>
                     {(currentAnswer.customBlocks || []).includes(block) && (
                       <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                         Custom
                       </span>
                     )}
                  </motion.button>
                ))}
              </div>

              {/* Eigene Snippets hinzufügen */}
              <div className="mb-8">
                <Label htmlFor="custom-snippet" className="text-sm text-amber-800 mb-2 block">Eigenen Text hinzufügen:</Label>
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
                    placeholder="Deine Formulierung"
                    className="flex-1 h-11 px-4 rounded-[12px] border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm text-amber-900"
                    maxLength={120}
                  />
                  <Button
                    type="button"
                    onClick={addCustomSnippet}
                    className="h-11 px-4 bg-white text-amber-700 border border-amber-300 rounded-[12px] hover:bg-amber-50"
                  >
                    Hinzufügen
                  </Button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700 text-center">Tipp: Du kannst bis zu 2 Optionen pro Frage auswählen.</p>
                </div>
              </div>

              {/* Mobile Zurück Button */}
              <div className="lg:hidden mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`w-full px-4 py-3 text-amber-700 border border-amber-300 rounded-lg transition-all text-base font-medium flex items-center justify-center gap-2 ${
                    currentQuestionIndex === 0 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-amber-50 active:bg-amber-100'
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
                  className="px-6 py-2 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </motion.button>

                <div className="text-center">
                  <p className="text-amber-600 text-sm mb-1">
                    Frage {currentQuestionIndex + 1} von {questionsToUse.length}
                  </p>
                  {currentAnswer.selectedBlocks.length > 0 && (
                    <p className="text-green-700 text-xs">
                      {currentAnswer.selectedBlocks.length} von 2 Option{currentAnswer.selectedBlocks.length !== 1 ? 'en' : ''} ausgewählt
                    </p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNextQuestion}
                  disabled={!canProceedFromCurrentQuestion()}
                  className="px-7 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base font-semibold shadow-sm"
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
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-amber-700 font-medium">
                  Fortschritt: {currentQuestionIndex + 1} von {questionsToUse.length}
                </span>
                <span className="text-sm text-amber-600">
                  {Math.round(((currentQuestionIndex + 1) / questionsToUse.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-amber-500 h-2 rounded-full"
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