// app/api/generate-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
interface VoiceConfig {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface TextToSpeechRequest {
  text: string;
  model_id: string;
  voice_settings: VoiceConfig;
  output_format: string;
}

// Get available voices endpoint
export async function GET() {
  try {
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
    });
    
    if (!voicesResponse.ok) {
      throw new Error(`Failed to fetch voices: ${voicesResponse.statusText}`);
    }
    
    const voices = await voicesResponse.json();
    return NextResponse.json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, adminPreview } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Text and voiceId are required' },
        { status: 400 }
      );
    }

    // Verwende die übergebene voiceId direkt (keine Mapping nötig)
    const elevenlabsVoiceId = voiceId;

    // Voice settings
    const voiceSettings: VoiceConfig = {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true
    };

    // Admin-Sparmodus: Text serverseitig kürzen (erster Satz oder ~200 Zeichen)
    const shortenForPreview = (t: string) => {
      const clean = (t || '').trim();
      if (!clean) return clean;
      const match = clean.match(/^[\s\S]*?[\.!?](\s|$)/);
      const firstSentence = match ? match[0].trim() : '';
      const clipped = clean.slice(0, 220).trim();
      const chosen = firstSentence || clipped;
      return chosen.length > 0 ? chosen : clean.slice(0, 220);
    };

    // Funktion: Ersetze Leerzeilen durch ElevenLabs SSML Pausen-Tags
    // Sucht nach Mustern wie "Du bittest [Figur]:" oder "Und [Figur] sagt zu dir:" gefolgt von Leerzeilen
    const addSSMLPauses = (t: string) => {
      let processed = t;
      
      // Ersetze Leerzeilen nach "Du bittest [irgendwas]:" durch SSML Pause
      // Muster: "Du bittest ...:\n\n" -> "Du bittest ...:\n<break time="1.0s" />\n"
      // Unterstützt: "Du bittest Oma:", "Du bittest deinen Engel:", "Du bittest Mutter Erde:", etc.
      // Format gemäß ElevenLabs-Dokumentation: <break time="1.0s" /> (mit Leerzeichen vor /)
      processed = processed.replace(
        /(Du bittest [^\n]+:)\s*\n\s*\n/g,
        '$1\n<break time="1.0s" />\n'
      );
      
      // Ersetze Leerzeilen nach "Und [irgendwas] sagt zu dir:" oder "versichert dir:" durch SSML Pause
      // Muster: "Und ... sagt zu dir: ...\n\n" -> "Und ... sagt zu dir: ...\n<break time="1.0s" />\n"
      // Unterstützt: "Und Oma sagt zu dir:", "Und dein Engel sagt zu dir: 'Liebe Angela',", "Und Mutter Erde versichert dir:", etc.
      // Das Pattern erfasst alles nach "sagt zu dir:" oder "versichert dir:" bis zur nächsten Zeile, dann die Leerzeile
      processed = processed.replace(
        /(Und [^\n]+ (?:sagt zu dir|versichert dir):[^\n]*)\s*\n\s*\n/g,
        '$1\n<break time="1.0s" />\n'
      );
      
      // Ersetze Leerzeilen NACH der Bitte (vor der Antwort) durch SSML Pause
      // Muster: "[Bitte mit Fragezeichen]?\n\nUnd ... sagt zu dir:" -> "[Bitte]?\n<break time="1.0s" />\nUnd ... sagt zu dir:"
      // Das Pattern erkennt das Ende einer Bitte (mit Fragezeichen) gefolgt von Leerzeilen und dann "Und [Figur] sagt"
      // Unterstützt auch mehrzeilige Bitten (die nach "Du bittest ...:" auf einer neuen Zeile stehen können)
      // Pattern: Sucht nach einem Fragezeichen, dann Leerzeilen, dann "Und ... sagt zu dir:"
      processed = processed.replace(
        /(\?[^\n]*)\s*\n\s*\n(Und [^\n]+ (?:sagt zu dir|versichert dir):)/g,
        '$1\n<break time="1.0s" />\n$2'
      );
      
      // Ersetze Leerzeilen NACH der Antwort (Idealsatz) durch SSML Pause
      // Muster: "[Antwort mit Punkt/!]\.\n\n[Nächster Absatz]" -> "[Antwort].\n<break time="1.5s" />\n[Nächster Absatz]"
      // Das Pattern erkennt das Ende einer Antwort (die nach "sagt zu dir:" oder "versichert dir:" kommt)
      // Die Antwort endet mit Punkt, Ausrufezeichen oder Fragezeichen
      // Dann kommt eine Leerzeile und dann beginnt der nächste Absatz der Geschichte (Schritt 6: "Beende die Geschichte sanft")
      // WICHTIG: Diese Pause sollte nur NACH der vollständigen Antwort kommen, nicht nach Zwischensätzen
      // Pattern: Sucht nach einer Zeile, die mit Satzzeichen endet, gefolgt von Leerzeilen, dann Text der NICHT mit "Du bittest" oder "Und ... sagt" beginnt
      // Wir müssen vorsichtig sein, um nicht Pausen in der Mitte der Antwort einzufügen
      processed = processed.replace(
        /([\.!?][^\n]*)\s*\n\s*\n(?=\S)(?![^\n]*(?:Du bittest|Und [^\n]+ (?:sagt zu dir|versichert dir)))/g,
        '$1\n<break time="1.5s" />\n'
      );
      
      // Falls noch andere Doppel-Leerzeilen vorhanden sind (z.B. am Ende von Absätzen),
      // können wir diese optional auch durch kürzere Pausen ersetzen
      // Aber nur wenn nicht bereits ein break-Tag vorhanden ist
      processed = processed.replace(
        /([^>])\n\s*\n(?!<break)/g,
        '$1\n<break time="0.8s" />\n'
      );
      
      return processed;
    };

    // Verwende den vollen Text, außer bei Admin-Preview
    let effectiveText = (adminPreview === true) ? shortenForPreview(text) : text;
    
    // Füge SSML Pausen-Tags hinzu
    const beforeSSML = effectiveText;
    effectiveText = addSSMLPauses(effectiveText);
    
    // Debug: Log SSML-Pausen-Erkennung
    // Pattern unterstützt sowohl altes Format (<break time="1.0s"/>) als auch neues Format (<break time="1.0s" />)
    const ssmlMatches = effectiveText.match(/<break time="[\d.]+s"\s*\/>/g);
    const ssmlCount = ssmlMatches ? ssmlMatches.length : 0;
    
    // Extrahiere alle SSML-Tags mit ihren Zeitwerten
    const ssmlDetails = ssmlMatches ? ssmlMatches.map((tag: string) => {
      const timeMatch = tag.match(/time="([\d.]+)s"/);
      return timeMatch ? `${timeMatch[1]}s` : 'unknown';
    }) : [];
    
    // Debug: Log the decision
    console.log('\n=== Audio Generation Debug ===');
    console.log('Audio generation debug:', {
      adminPreview,
      originalLength: text.length,
      effectiveLength: effectiveText.length,
      isShortened: effectiveText.length < text.length,
      ssmlPausesDetected: ssmlCount,
      hasSSMLChanges: beforeSSML !== effectiveText,
      ssmlPauseDurations: ssmlDetails
    });
    
    // Debug: Zeige Beispiel mit SSML-Tags (nur wenn vorhanden)
    if (ssmlCount > 0) {
      console.log(`\n✓ ${ssmlCount} SSML-Pausen gefunden (${ssmlDetails.join(', ')})`);
      
      // Zeige die ersten 3 SSML-Tags im Kontext
      let foundCount = 0;
      const breakPattern = /<break time="[\d.]+s"\s*\/>/g;
      let match;
      
      while ((match = breakPattern.exec(effectiveText)) !== null && foundCount < 3) {
        const start = Math.max(0, match.index - 80);
        const end = Math.min(effectiveText.length, match.index + 120);
        const snippet = effectiveText.substring(start, end)
          .replace(/\n/g, ' ')
          .replace(/<break time="[\d.]+s"\s*\/>/g, '\n▶ [PAUSE $&]\n');
        console.log(`\nSSML-Pause #${foundCount + 1} (${match[0]}):`);
        console.log(`  ...${snippet}...`);
        foundCount++;
      }
      
      // Zeige auch, ob der Text an ElevenLabs gesendet wird (erste 300 Zeichen)
      if (effectiveText.length > 0) {
        const preview = effectiveText.substring(0, 300).replace(/\n/g, ' ');
        console.log('\n📤 Text-Vorschau (erste 300 Zeichen, der an ElevenLabs gesendet wird):');
        console.log(`  ${preview}${effectiveText.length > 300 ? '...' : ''}`);
      }
    } else {
      console.log('\n⚠ Keine SSML-Pausen erkannt - Text wurde möglicherweise nicht verarbeitet');
    }
    console.log('================================\n');

    // Request payload
    const requestPayload: TextToSpeechRequest = {
      text: effectiveText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
      output_format: 'mp3_44100_128'
    };

    const startTime = Date.now();
    console.log('Making request with voice ID:', elevenlabsVoiceId);
    console.log('Text length:', text.length, '->', effectiveText.length);
    console.log('Text preview:', effectiveText.slice(0, 100) + '...');
    console.log('Environment check:', {
      hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // Generate audio with ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(300000), // 300 Sekunden Timeout für Vercel Pro
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        voiceId: elevenlabsVoiceId
      });
      
      return NextResponse.json(
        { 
          error: `ElevenLabs API error: ${response.status}`,
          details: errorBody 
        },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    
    const elevenLabsTime = Date.now() - startTime;
    console.log(`ElevenLabs API took: ${elevenLabsTime}ms (${(elevenLabsTime/1000).toFixed(1)}s)`);
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const filename = `audio_${timestamp}_${randomId}.mp3`;
const supabaseAdmin = await import('@/lib/supabase/serverAdminClient').then(mod => mod.createServerAdminClient());
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('audio-files')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to store audio file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('audio-files')
      .getPublicUrl(filename);

    const totalTime = Date.now() - startTime;
    console.log(`Total processing time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log('Audio uploaded successfully:', publicUrl);

    // Return the public URL and metadata
    return NextResponse.json({
      audioUrl: publicUrl,
      filename: filename,
      voiceId: voiceId,
      size: audioBuffer.byteLength
    });

  } catch (error: any) {
    console.error('Audio generation error:', error);
    
    // Spezifische Fehlermeldungen
    if ((error as any)?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Audio generation timed out. Please try again.' },
        { status: 408 }
      );
    }
    
    if ((error as any)?.message?.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error. Please check your connection and try again.' },
        { status: 503 }
      );
    }
    
    // Detaillierte Fehlermeldung für Debugging
    return NextResponse.json(
      { 
        error: 'Failed to generate audio. Please try again.',
        details: (error as any)?.message || 'Unknown error',
        type: (error as any)?.name || 'Error'
      },
      { status: 500 }
    );
  }
}