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

    // Verwende den vollen Text, außer bei Admin-Preview
    const effectiveText = adminPreview ? shortenForPreview(text) : text;

    // Request payload
    const requestPayload: TextToSpeechRequest = {
      text: effectiveText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
      output_format: 'mp3_44100_128'
    };

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
        signal: AbortSignal.timeout(60000), // 60 Sekunden Timeout für längere Texte
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
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Audio generation timed out. Please try again.' },
        { status: 408 }
      );
    }
    
    if (error.message?.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error. Please check your connection and try again.' },
        { status: 503 }
      );
    }
    
    // Detaillierte Fehlermeldung für Debugging
    return NextResponse.json(
      { 
        error: 'Failed to generate audio. Please try again.',
        details: error.message || 'Unknown error',
        type: error.name || 'Error'
      },
      { status: 500 }
    );
  }
}