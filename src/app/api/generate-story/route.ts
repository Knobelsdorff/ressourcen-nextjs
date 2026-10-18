import { ResourceFigure } from '@/lib/types/story';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AnswerEntry, generateStoryText } from '@/lib/story-text';

interface GenerateStoryRequest {
  selectedFigure: ResourceFigure;
  questionAnswers: AnswerEntry[];
  editingInstructions?: string;
  existingStory?: string;
  userName?: string;
  userPronunciationHint?: string;
  sparModus?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { selectedFigure, questionAnswers, editingInstructions, existingStory, userName, userPronunciationHint, sparModus } = (await request.json()) as GenerateStoryRequest;
    console.log('API received request:', {
      selectedFigure: selectedFigure?.name,
      questionAnswers: questionAnswers?.length,
      editingInstructions,
      existingStory: existingStory?.length,
      userName,
      userPronunciationHint,
      sparModus,
      selectedFigureDetails: selectedFigure ? {
        id: selectedFigure.id,
        name: selectedFigure.name,
        category: selectedFigure.category,
        pronouns: selectedFigure.pronouns
      } : null,
      questionAnswersDetails: questionAnswers ? questionAnswers.map(qa => ({
        questionId: qa.questionId,
        answer: qa.answer,
        selectedBlocksCount: qa.selectedBlocks?.length || 0,
        customBlocksCount: qa.customBlocks?.length || 0
      })) : null
    });

    console.log('Full API request details:', JSON.stringify({
      selectedFigure,
      questionAnswers,
      userName,
      userPronunciationHint,
      sparModus
    }, null, 2));

    console.log('SparModus API check:', {
      sparModus: sparModus,
      type: typeof sparModus,
      isTrue: sparModus === true,
      isFalse: sparModus === false,
      isUndefined: sparModus === undefined
    });

    const apiKey = process.env.OPENAI_API_KEY;

    // Wenn es sich um eine Bearbeitung handelt
    if (editingInstructions && existingStory) {
      console.log('Editing existing story with AI');
      if (!apiKey) {
        return NextResponse.json(
          { story: existingStory },
          { status: 200 }
        );
      }
      const openai = new OpenAI({ apiKey });

      const editPrompt = `Du bist ein Therapeut, der bestehende Heilungsgeschichten verbessert.

Bestehende Geschichte:
${existingStory}

Anweisung zur Verbesserung:
${editingInstructions}

Bitte bearbeite die Geschichte entsprechend der Anweisung. Behalte den ursprünglichen Stil und die Struktur bei, aber verbessere sie gemäß den Anweisungen. Die Geschichte sollte weiterhin therapeutisch wertvoll und emotional unterstützend sein.

Bearbeitete Geschichte:`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a therapist specializing in somatic and narrative therapy.' },
          { role: 'user', content: editPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const story = completion.choices[0]?.message?.content;
      if (!story) throw new Error('No edited story returned');

      return NextResponse.json({ story });
    }

    const story = await generateStoryText({ selectedFigure, questionAnswers, userName, userPronunciationHint, sparModus });
    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error in generate-story POST:', error);
    return NextResponse.json({ message: 'Failed to generate story' }, { status: 500 });
  }
}
