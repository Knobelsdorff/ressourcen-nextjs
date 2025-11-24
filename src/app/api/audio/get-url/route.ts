// API-Route für temporäre Audio-URLs mit Token
import { NextRequest, NextResponse } from 'next/server';
import { generateAudioToken, extractFilenameFromUrl } from '@/lib/audio-token';

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, resourceId, userId } = await request.json();

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Audio-URL ist erforderlich' },
        { status: 400 }
      );
    }

    // Extrahiere Filename aus URL
    const filename = extractFilenameFromUrl(audioUrl);
    if (!filename) {
      return NextResponse.json(
        { error: 'Ungültige Audio-URL' },
        { status: 400 }
      );
    }

    // Generiere Token
    const token = generateAudioToken(filename, resourceId, userId);

    // Erstelle Streaming-URL mit Token
    const streamingUrl = `/api/audio/stream?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      streamingUrl,
      token,
      expiresIn: 3600, // 1 Stunde in Sekunden
    });
  } catch (error: any) {
    console.error('Error generating audio token:', error);
    return NextResponse.json(
      { error: 'Fehler beim Generieren des Tokens' },
      { status: 500 }
    );
  }
}

