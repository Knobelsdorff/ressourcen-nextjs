import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
export const runtime = 'nodejs';

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

export async function POST(request: NextRequest) {
  try {
    const { voiceId, text } = await request.json();

    if (!voiceId) {
      return NextResponse.json({ error: 'voiceId is required' }, { status: 400 });
    }

    const demoText = (text && String(text).trim().length > 0)
      ? String(text)
      : 'Das ist ein kurzer Test. Hörst du meine Stimme klar und angenehm?';

    const voiceSettings: VoiceConfig = {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true
    };

    const payload: TextToSpeechRequest = {
      text: demoText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
      output_format: 'mp3_44100_128'
    };

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'Missing ELEVENLABS_API_KEY' }, { status: 500 });
    }

    console.log('Voice preview request:', { voiceId, textLength: demoText.length });
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('ElevenLabs preview error', { status: response.status, statusText: response.statusText, body });
      return NextResponse.json({ error: 'Failed to generate preview', status: response.status, statusText: response.statusText, details: body }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');

    return NextResponse.json({
      audioData: base64,
      mimeType: 'audio/mpeg',
    });
  } catch (error: any) {
    console.error('Voice preview route error:', error);
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Preview timed out' }, { status: 408 });
    }
    return NextResponse.json({ error: 'Failed to generate preview', details: error?.message || 'unknown' }, { status: 500 });
  }
}
