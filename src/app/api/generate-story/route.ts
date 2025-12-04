import { ResourceFigure } from '@/app/page';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateStoryPrompt } from '@/data/story-generation';

interface AnswerEntry {
  questionId: number;
  answer?: string;
  selectedBlocks?: string[];
  customBlocks?: string[];
}

interface GenerateStoryRequest {
  selectedFigure: ResourceFigure;
  questionAnswers: AnswerEntry[];
  editingInstructions?: string;
  existingStory?: string;
  userName?: string;
  userPronunciationHint?: string;
  sparModus?: boolean;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

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

    const storyPrompt = generateStoryPrompt({ selectedFigure, connectionDetails, userName, userPronunciationHint });

    console.log('Generated story prompt:', storyPrompt);
    
    // Sparmodus: Nur den ersten Satz generieren
    console.log('Sparmodus processing:', {
      sparModus: sparModus,
      isTrue: sparModus === true,
      willUseSparmodus: !!sparModus
    });
    
    const systemPrompt = sparModus 
      ? 'You are a therapist specializing in somatic and narrative therapy. Generate ONLY the first sentence of a healing story. Make it warm, safe, and emotionally supportive.'
      : 'You are a therapist specializing in somatic and narrative therapy.';
    
    const maxTokens = sparModus ? 100 : 800; // Viel weniger Tokens im Sparmodus
    
    console.log('OpenAI settings:', {
      systemPrompt: systemPrompt.substring(0, 100) + '...',
      maxTokens: maxTokens,
      sparModus: sparModus
    });
    
    let story: string;

    try {
      // Debug: Prüfe, ob userNameWithPronunciation SSML-Tags enthält
      const storyPromptText = storyPrompt;
      const ssmlInPrompt = storyPromptText.match(/<phoneme[^>]*>([^<]+)<\/phoneme>/g);
      if (ssmlInPrompt) {
        console.log('✓ SSML-Tags im Story-Prompt gefunden:', ssmlInPrompt.length);
        ssmlInPrompt.forEach((tag, index) => {
          console.log(`  Tag ${index + 1}: ${tag}`);
        });
      } else {
        console.log('⚠ Keine SSML-Tags im Story-Prompt gefunden');
      }
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: storyPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      story = completion.choices[0]?.message?.content || '';
      
      // Debug: Prüfe, ob SSML-Tags in der generierten Story enthalten sind
      const ssmlInStory = story.match(/<phoneme[^>]*>([^<]+)<\/phoneme>/g);
      if (ssmlInStory) {
        console.log('✓ SSML-Tags in generierter Story gefunden:', ssmlInStory.length);
        ssmlInStory.forEach((tag, index) => {
          console.log(`  Tag ${index + 1}: ${tag}`);
        });
      } else {
        console.log('⚠ Keine SSML-Tags in generierter Story gefunden - verwende einfachen Namensersatz');
        
        // Vereinfachte Lösung: Wenn ein pronunciation_hint vorhanden ist, verwende ihn als einfachen Ersatz für den Namen
        // Beispiel: Wenn userName="Andy" und pronunciation_hint="Andi", dann ersetze "Andy" durch "Andi"
        if (userName && userPronunciationHint && userPronunciationHint.trim().length > 0) {
          const hintParts = userPronunciationHint.trim().split('|');
          const simpleName = hintParts[0].trim();
          
          // Wenn der pronunciation_hint wie ein normaler Name aussieht (keine Leerzeichen, keine komplexe Formatierung),
          // ersetze den ursprünglichen Namen durch diesen einfachen Namen
          if (simpleName.length > 0 && !simpleName.includes(' ') && /^[A-Za-zÄÖÜäöüß-]+$/.test(simpleName)) {
            // Ersetze den Namen in der Anrede (z.B. "Lieber Andy" -> "Lieber Andi")
            const greetingPatterns = [
              new RegExp(`(Lieber\\s+)${userName}([,\\s])`, 'gi'),
              new RegExp(`(Liebe\\s+)${userName}([,\\s])`, 'gi'),
              new RegExp(`(\\b)${userName}([,\\s\\.\\!\\?])`, 'gi'), // Allgemeiner Fall mit Satzzeichen
            ];
            
            let replacementCount = 0;
            for (const pattern of greetingPatterns) {
              story = story.replace(pattern, (match, prefix, suffix) => {
                // Prüfe, ob bereits ein SSML-Tag vorhanden ist
                if (match.includes('<phoneme') || match.includes('</phoneme>')) {
                  return match;
                }
                replacementCount++;
                return `${prefix || ''}${simpleName}${suffix || ''}`;
              });
            }
            
            if (replacementCount > 0) {
              console.log(`✓ Einfacher Namensersatz: "${userName}" -> "${simpleName}" (${replacementCount} Ersetzungen)`);
              console.log(`  Story-Vorschau (erste 300 Zeichen): ${story.substring(0, 300)}...`);
            } else {
              console.warn(`⚠ Keine Ersetzungen gefunden für "${userName}" - Name möglicherweise nicht in Story enthalten`);
            }
          } else {
            console.log(`⚠ pronunciation_hint "${simpleName}" sieht nicht wie ein einfacher Name aus - keine Ersetzung`);
          }
        }
      }
      
       // Im Sparmodus: Stelle sicher, dass nur der erste Satz zurückgegeben wird
    if (sparModus) {
      const firstSentence = story.match(/^[^.!?]*[.!?]/);
      story = firstSentence ? firstSentence[0] : story.split('.')[0] + '.';
      console.log('Sparmodus applied - original length:', completion.choices[0]?.message?.content?.length, 'final length:', story.length);
    }
      if (!story) throw new Error('No story returned');
    } catch (openaiError: any) {
      // If OpenAI quota is exceeded, use a fallback template story
      if (openaiError.status === 429 || openaiError.code === 'insufficient_quota') {
        console.warn('⚠️ OpenAI quota exceeded, using fallback template story');

        // Simple template story as fallback
        const figureName = selectedFigure.name;
        const pronouns = selectedFigure.pronouns?.toLowerCase() || 'sie/ihr';
        const pronoun = pronouns.startsWith('er') ? 'er' : pronouns.startsWith('sie') ? 'sie' : 'sie';
        const possessive = pronouns.startsWith('er') ? 'sein' : 'ihr';

        story = `Du spürst die warme Präsenz von ${figureName}. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} ist bei dir.

${figureName} sitzt neben dir. Du fühlst dich sicher und geborgen. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} ist ruhig und stabil.

In schwierigen Momenten bleibt ${figureName} bei dir. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} hält deine Hand und spricht sanft mit dir.

Du bittest ${figureName}: "Kannst du bitte immer für mich da sein?"

Und ${figureName} sagt zu dir:

"Ich bin immer für dich da. Du bist genau richtig, so wie du bist. Auf mich kannst du dich jederzeit verlassen."

Du weißt, dass ${pronoun} immer bei dir ist. Du spürst, wie ${pronoun} dich trägt. ${figureName} ist und bleibt für dich da.`;

        // Log the fallback usage for monitoring
        console.log('📝 Fallback story generated for:', figureName);
      } else {
        // Re-throw other errors
        throw openaiError;
      }
    }

   

    console.log('Final story result:', {
      sparModus: sparModus,
      storyLength: story.length,
      storyPreview: story.substring(0, 100) + '...'
    });
    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error in generate-story POST:', error);
    return NextResponse.json({ message: 'Failed to generate story' }, { status: 500 });
  }
}