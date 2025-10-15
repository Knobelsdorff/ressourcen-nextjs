import { ResourceFigure } from '@/app/page';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateStoryPrompt } from '@/data/story-generation';

interface AnswerEntry {
  questionId: number;
  answer?: string;
  selectedBlocks?: string[];
}

interface GenerateStoryRequest {
  selectedFigure: ResourceFigure;
  questionAnswers: AnswerEntry[];
  editingInstructions?: string;
  existingStory?: string;
  userName?: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { selectedFigure, questionAnswers, editingInstructions, existingStory, userName } = (await request.json()) as GenerateStoryRequest;
    console.log('API received request:', { selectedFigure, questionAnswers, editingInstructions, existingStory });

    // Wenn es sich um eine Bearbeitung handelt
    if (editingInstructions && existingStory) {
      console.log('Editing existing story with AI');
      
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

    // Organize answers and blocks separately
    const dataById = questionAnswers.reduce<Record<number, { answerText: string; blocksText: string }>>((acc, entry) => {
      acc[entry.questionId] = {
        answerText: entry.answer?.trim() || '',
        blocksText: (entry.selectedBlocks || []).join(', ').replace(/, ([^,]+)$/, ' and $1') || ''
      };
      return acc;
    }, {});

    console.log('Processed answers:', dataById);

    // Build prompt listing question, answer, and blocks
    // Bestimme die Anzahl der Fragen basierend auf der Ressource
    const isPlace = selectedFigure.category === 'place';
    
    const questionsList = isPlace ? [
      { id: 1, label: 'Was siehst du an diesem Ort?' },
      { id: 2, label: 'Was hörst du an diesem Ort?' },
      { id: 3, label: 'Was riechst du an diesem Ort?' },
      { id: 4, label: 'Was tust du an diesem Ort?' },
      { id: 5, label: 'Wie fühlst du dich an diesem Ort?' }
    ] : [
      { id: 1, label: 'Visual & Energetic Appearance' },
      { id: 2, label: 'Inner Reaction to Their Presence' },
      { id: 3, label: 'Response in Difficult Moments' },
      { id: 4, label: 'Shared Experience / Physical Connection' },
      { id: 5, label: 'Your Personal Wish / Request' },
      { id: 6, label: 'Words from the Figure to You' }
    ];

    const connectionDetails = questionsList.map(q => {
      const { answerText, blocksText } = dataById[q.id] || { answerText: '', blocksText: '' };
      return `Q${q.id} - ${q.label}:\n  • Answer: \"${answerText}\"\n  • Block picks: \"${blocksText}\"`;
    }).join('\n');

    const storyPrompt = generateStoryPrompt({ selectedFigure, connectionDetails, userName });

    console.log('Generated story prompt:', storyPrompt);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a therapist specializing in somatic and narrative therapy.' },
        { role: 'user', content: storyPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const story = completion.choices[0]?.message?.content;
    if (!story) throw new Error('No story returned');

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error in generate-story POST:', error);
    return NextResponse.json({ message: 'Failed to generate story' }, { status: 500 });
  }
}