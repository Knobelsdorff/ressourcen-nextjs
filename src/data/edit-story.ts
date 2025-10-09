import { ResourceFigure } from '@/app/page';

interface AnswerEntry {
  questionId: number;
  answer?: string;
  selectedBlocks?: string[];
}

interface StoryEditingPromptParams {
  selectedFigure: ResourceFigure;
  questionAnswers: AnswerEntry[];
  currentStory: string;
  editingInstructions: string;
}

export function generateStoryEditingPrompt({ 
  selectedFigure, 
  questionAnswers, 
  currentStory, 
  editingInstructions 
}: StoryEditingPromptParams): string {
  const figureDescription = `${selectedFigure.name} (${selectedFigure.category ?? 'N/A'}) – ${selectedFigure.description ?? ''}`;

  const answersByQuestion = questionAnswers.reduce((acc: any, answer: any) => {
    acc[answer.questionId] = answer;
    return acc;
  }, {});

  const visualDescription = answersByQuestion[1]?.answer || answersByQuestion[1]?.selectedBlocks?.join(', ') || '';
  const emotionalPresence = answersByQuestion[2]?.answer || answersByQuestion[2]?.selectedBlocks?.join(', ') || '';
  const supportDuringStruggle = answersByQuestion[3]?.answer || answersByQuestion[3]?.selectedBlocks?.join(', ') || '';
  const userRequest = answersByQuestion[4]?.answer || answersByQuestion[4]?.selectedBlocks?.join(', ') || '';
  const figureResponse = answersByQuestion[5]?.answer || answersByQuestion[5]?.selectedBlocks?.join(', ') || '';

  return `Du bist ein*e erfahrene*r, traumasensible*r Therapeut*in und bearbeitest eine therapeutische Geschichte zur emotionalen Heilung und zur Regulation des Nervensystems.

KONTEXT:
- Dies ist eine sogenannte „Resourcing“-Geschichte, die Menschen mit Kindheitstrauma helfen soll, innere Sicherheit aufzubauen.
- Die Geschichte soll weiterhin ihrem therapeutischen Zweck dienen: ein Gefühl von Sicherheit und Regulation im Nervensystem zu erzeugen.

RESSOURCENFIGUR: ${figureDescription}

ORIGINALE ANTWORTEN DER PERSON:
- Visuelle/Körperliche Beschreibung: ${visualDescription}
- Gefühl mit der Figur: ${emotionalPresence}
- Wie die Figur in schwierigen Momenten reagiert: ${supportDuringStruggle}
- Was die Person sich von der Figur wünscht: ${userRequest}
- Was die Figur zu der Person sagt: ${figureResponse}

AKTUELLE VERSION DER GESCHICHTE:
${currentStory}

ANWEISUNGEN DER PERSON ZUR ÜBERARBEITUNG:
${editingInstructions}

ANLEITUNG:
Überarbeite die Geschichte gemäß den Anweisungen der Person und achte dabei auf Folgendes:
1. Behalte den therapeutischen, heilenden Ton bei.
2. Schreibe weiterhin in der Gegenwart und in der Du-Form („du fühlst“, „du bemerkst“).
3. Erhalte die zentralen therapeutischen Elemente (Sicherheit, Liebe, Schutz).
4. Halte die Geschichte zwischen 150–250 Wörtern.
5. Fokus bleibt auf Regulation des Nervensystems und dem Gefühl innerer Sicherheit.

Gib **nur die überarbeitete Geschichte** zurück, ohne Kommentare oder Erklärungen.`;
}
