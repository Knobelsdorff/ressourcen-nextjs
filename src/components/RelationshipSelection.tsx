"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { ResourceFigure } from "@/lib/types/story";
import { getQuestionsWithPronouns } from "@/data/questions";
import { placeQuestions } from "@/data/placeQuestions";
import AngelQuestionStep from './AngelQuestionStep';

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
  /** "Zurück" bei der ersten Frage – zur Figurenwahl. Ohne: Button versteckt. */
  onPrevious?: () => void;
}

export default function RelationshipSelection({
  selectedFigure,
  questionAnswers,
  onAnswersChange,
  onNext,
  currentQuestionIndex,
  onQuestionIndexChange,
  onPrevious
}: RelationshipSelectionProps) {
  const hasInitialized = useRef(false);

  // Bestimme, welche Fragen verwendet werden sollen
  const isPlace = selectedFigure.category === 'place';

  const questionsToUse = isPlace ? placeQuestions : getQuestionsWithPronouns(selectedFigure);
  const currentQuestion = questionsToUse[currentQuestionIndex];
  const MIN_SELECTIONS = 1;
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

  /** Gibt true zurück, wenn das Eingabefeld geleert werden soll. */
  const addCustomText = (raw: string): boolean => {
    const existingCustom = currentAnswer.customBlocks || [];
    // ⛔ no more than MAX_SELECTIONS custom blocks
    if (existingCustom.length >= MAX_SELECTIONS) {
      return false;
    }

    const text = raw.trim();
    if (!text) return false;

    const isDuplicate = existingCustom.includes(text) || currentQuestion.blocks.includes(text);
    if (isDuplicate) {
      return true;
    }

    const updatedCustom = [...existingCustom, text];

    // Optional: automatisch auswählen, solange < MAX_SELECTIONS
    let updatedSelected = currentAnswer.selectedBlocks;
    if (updatedSelected.length < MAX_SELECTIONS) {
      updatedSelected = [...updatedSelected, text];
    }

    updateCurrentAnswer({ customBlocks: updatedCustom, selectedBlocks: updatedSelected });
    return true;
  };

  const canProceedFromCurrentQuestion = () => {
    return currentAnswer.answer.trim().length > 0 || selectedCount >= MIN_SELECTIONS;
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

  return (
    <AngelQuestionStep
      figure={selectedFigure}
      question={currentQuestion}
      index={currentQuestionIndex}
      total={questionsToUse.length}
      selectedBlocks={currentAnswer.selectedBlocks}
      customBlocks={currentAnswer.customBlocks || []}
      maxSelections={MAX_SELECTIONS}
      canProceed={canProceedFromCurrentQuestion()}
      onToggle={handleBlockToggle}
      onAddCustom={addCustomText}
      onPrevious={handlePreviousQuestion}
      onNext={handleNextQuestion}
      onExit={onPrevious}
    />
  );
}
