// Server-seitige Audio-Streaming-API mit Token-Authentifizierung
import { NextRequest, NextResponse } from 'next/server';
import { validateAudioToken } from '@/lib/audio-token';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

function getMimeTypeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/mp4';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.webm')) return 'audio/webm';
  return 'application/octet-stream';
}

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

    const inferredMime = getMimeTypeFromFilename(filename);
    const blobMime = audioData.type || '';
    const mimeType = blobMime && blobMime !== 'application/octet-stream' ? blobMime : inferredMime;

    // Stream Audio zurück
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': mimeType,
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

