import { ResourceFigure } from '@/lib/types/story';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateStoryPrompt } from '@/data/story-generation';

/**
 * Entfernt Doppelungen aus der generierten Story.
 * Erkennt wiederholte Sätze, Phrasen und ähnliche Konstruktionen.
 */
function removeDuplications(story: string): string {
  let cleaned = story;
  
  // Normalisiere Whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 1. Entferne wiederholte Sätze (z.B. "Du bittest Mutter Erde. Du bittest Mutter Erde")
  // Erkenne Sätze, die mit demselben Anfang beginnen und sehr ähnlich sind
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const uniqueSentences: string[] = [];
  const seenPatterns = new Set<string>();
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;
    
    // Normalisiere den Satz für Vergleich (kleinschreibung, entferne Interpunktion)
    const normalized = sentence.toLowerCase()
      .replace(/[.,!?;:]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Prüfe, ob dieser Satz oder ein sehr ähnlicher Satz bereits vorkam
    let isDuplicate = false;
    for (const seen of seenPatterns) {
      // Wenn der Satz identisch ist oder sehr ähnlich (über 80% Übereinstimmung)
      if (normalized === seen || 
          (normalized.length > 10 && seen.length > 10 && 
           (normalized.includes(seen.substring(0, Math.min(20, seen.length))) ||
            seen.includes(normalized.substring(0, Math.min(20, normalized.length)))))) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueSentences.push(sentence);
      seenPatterns.add(normalized);
    }
  }
  
  cleaned = uniqueSentences.join(' ');
  
  // 2. Entferne wiederholte Phrasen innerhalb von Sätzen
  // (z.B. "und Mutter Erde versichert dir, und Mutter Erde versichert dir")
  const phrasePatterns = [
    // Wiederholte Phrasen mit Komma-Trennung
    /\b([^,]{10,50}),\s*\1\b/gi,
    // Wiederholte Phrasen mit "und" Trennung
    /\b([^.!?]{10,50})\s+und\s+\1\b/gi,
    // Wiederholte Phrasen mit "du" am Anfang
    /\b(Du\s+[^.!?]{10,50})\s+\.\s*\1\b/gi,
  ];
  
  for (const pattern of phrasePatterns) {
    cleaned = cleaned.replace(pattern, (match, phrase) => {
      // Entferne die Wiederholung, behalte nur einmal
      return phrase;
    });
  }
  
  // 3. Entferne spezifische bekannte Doppelungen
  const specificPatterns = [
    // "Du bittest [Name]. Du bittest [Name]"
    /\b(Du bittest [^.!?]+)\.\s*\1\b/gi,
    // "Und [Name] versichert dir, und [Name] versichert dir"
    /\b(Und [^.!?]+ versichert dir,)\s*\1/gi,
    // "Und [Name] sagt zu dir, und [Name] sagt zu dir"
    /\b(Und [^.!?]+ sagt zu dir:)\s*\1/gi,
  ];
  
  for (const pattern of specificPatterns) {
    cleaned = cleaned.replace(pattern, '$1');
  }
  
  // 4. Normalisiere Whitespace erneut
  cleaned = cleaned.replace(/\s+/g, ' ')
    .replace(/\s+([.!?,:;])/g, '$1')
    .replace(/([.!?])\s+/g, '$1 ')
    .trim();
  
  return cleaned;
}

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
      if (!apiKey) {
        // Lokaler Fallback ohne OpenAI-Key
        const figureName = selectedFigure.name;
        const pronouns = selectedFigure.pronouns?.toLowerCase() || 'sie/ihr';
        const pronoun = pronouns.startsWith('er') ? 'er' : pronouns.startsWith('sie') ? 'sie' : 'sie';
        story = sparModus
          ? `Du spürst die warme Präsenz von ${figureName}.`
          : `Du spürst die warme Präsenz von ${figureName}. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} ist bei dir.\n\nDu atmest ein, und mit dem Ausatmen darf dein Körper ein wenig weicher werden.\n\n${figureName} bleibt an deiner Seite – ruhig, freundlich und stabil.\n\nIn schwierigen Momenten erinnert dich ${figureName} sanft: „Du bist jetzt sicher. Ich bin hier.“`;
        return NextResponse.json({ story });
      }

      const openai = new OpenAI({ apiKey });

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
      
      // Entferne Doppelungen aus der generierten Story
      const originalLength = story.length;
      story = removeDuplications(story);
      if (originalLength !== story.length) {
        console.log(`✓ Doppelungen entfernt: ${originalLength} -> ${story.length} Zeichen`);
      }
      
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