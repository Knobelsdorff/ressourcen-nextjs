import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateStoryEditingPrompt } from '@/data/edit-story';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'OPENAI_API_KEY fehlt. Bitte in deiner .env setzen, damit der KI-Editor funktioniert.' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });
    const { selectedFigure, questionAnswers, currentStory, editingInstructions } = await request.json();

    const prompt = generateStoryEditingPrompt({
      selectedFigure,
      questionAnswers,
      currentStory,
      editingInstructions
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a trauma-informed therapist specializing in therapeutic story editing. You maintain the healing essence while implementing requested changes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const editedStory = completion.choices[0]?.message?.content;

    if (!editedStory) {
      throw new Error('Failed to edit story');
    }

    return NextResponse.json({ story: editedStory });
  } catch (error) {
    console.error('Error editing story:', error);
    return NextResponse.json({ message: 'Error editing story' }, { status: 500 });
  }
}