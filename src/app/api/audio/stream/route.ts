// Server-seitige Audio-Streaming-API mit Token-Authentifizierung
import { NextRequest, NextResponse } from 'next/server';
import { validateAudioToken } from '@/lib/audio-token';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token ist erforderlich' },
        { status: 400 }
      );
    }

    // Validiere Token
    const validation = validateAudioToken(token);
    if (!validation.valid || !validation.payload) {
      return NextResponse.json(
        { error: validation.error || 'Ungültiger Token' },
        { status: 403 }
      );
    }

    const { filename } = validation.payload;

    // Lade Audio aus Supabase Storage
    const supabaseAdmin = await createServerAdminClient();
    const { data: audioData, error: downloadError } = await supabaseAdmin.storage
      .from('audio-files')
      .download(filename);

    if (downloadError || !audioData) {
      console.error('Error downloading audio:', downloadError);
      return NextResponse.json(
        { error: 'Audio-Datei nicht gefunden' },
        { status: 404 }
      );
    }

    // Konvertiere Blob zu ArrayBuffer
    const arrayBuffer = await audioData.arrayBuffer();

    // Stream Audio zurück
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600', // 1 Stunde Cache
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error: any) {
    console.error('Error streaming audio:', error);
    return NextResponse.json(
      { error: 'Fehler beim Streamen des Audios' },
      { status: 500 }
    );
  }
}

