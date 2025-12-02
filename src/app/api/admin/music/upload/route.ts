import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * Prüft ob der aktuelle User ein Admin ist (Full Admin oder Music Admin)
 */
function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const musicAdminEmails = (process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase()) || 
         musicAdminEmails.includes(email.toLowerCase());
}

export async function POST(request: NextRequest) {
  console.log('[API/admin/music/upload] POST request received');
  
  try {
    // Erstelle Supabase Client für Session-Check
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
            });
          },
        },
      }
    );

    // Prüfe Authentifizierung
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prüfe ob User Admin ist
    if (!isAdminUser(user.email)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const figureId = formData.get('figureId') as string;
    const figureName = formData.get('figureName') as string | null;
    const sourceLink = formData.get('sourceLink') as string | null;
    const isDefault = formData.get('isDefault') === 'true';

    console.log('[API/admin/music/upload] Upload request:', {
      fileName: file?.name,
      fileSize: file?.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'unknown',
      figureId,
      figureName,
      isDefault
    });

    // Validierung
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      return NextResponse.json(
        { error: 'Only MP3 files are allowed' },
        { status: 400 }
      );
    }

    // Dateigrößenprüfung (max 100MB)
    const maxFileSize = 100 * 1024 * 1024; // 100MB in Bytes
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    
    console.log(`[API/admin/music/upload] File size check: ${fileSizeMB} MB (max: 100 MB)`);
    
    if (file.size > maxFileSize) {
      console.warn(`[API/admin/music/upload] File too large: ${fileSizeMB}MB (max: 100MB)`);
      return NextResponse.json(
        { 
          error: `Die Datei ist zu groß (${fileSizeMB} MB). Maximale Dateigröße: 100 MB. Bitte komprimiere die Datei oder verwende eine kleinere Version.`,
          fileSize: file.size,
          maxSize: maxFileSize
        },
        { status: 400 }
      );
    }

    if (!figureId) {
      return NextResponse.json(
        { error: 'No figureId provided' },
        { status: 400 }
      );
    }

    // Optional: URL-Validierung für Source-Link
    if (sourceLink) {
      try {
        new URL(sourceLink);
      } catch {
        return NextResponse.json(
          { error: 'Invalid source link URL format' },
          { status: 400 }
        );
      }
    }

    // Verwende Admin Client für Storage Upload (umgeht RLS)
    const supabaseAdmin = await createServerAdminClient();

    // Generiere eindeutigen Dateinamen
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fileName = `${figureId}_${timestamp}_${randomId}.${fileExt}`;

    console.log(`[API/admin/music/upload] Starting upload to storage: ${fileName}`);

    // Konvertiere File zu ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload zu Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('background-music')
      .upload(fileName, arrayBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      
      // Spezielle Fehlermeldungen für häufige Probleme
      let errorMessage = 'Fehler beim Hochladen der Datei';
      if (uploadError.message?.includes('File size exceeds') || uploadError.message?.includes('too large')) {
        errorMessage = `Die Datei ist zu groß (${fileSizeMB} MB). Bitte komprimiere die Datei oder verwende eine kleinere Version.`;
      } else if (uploadError.message?.includes('quota') || uploadError.message?.includes('limit')) {
        errorMessage = 'Speicherplatz-Limit erreicht. Bitte kontaktiere den Administrator.';
      } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('access')) {
        errorMessage = 'Zugriff verweigert. Bitte stelle sicher, dass du als Admin eingeloggt bist.';
      } else {
        errorMessage = `Fehler beim Hochladen: ${uploadError.message || 'Unbekannter Fehler'}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: uploadError.message,
          fileSize: file.size,
          fileName: file.name
        },
        { status: 500 }
      );
    }

    // Hole öffentliche URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('background-music')
      .getPublicUrl(fileName);

    // Wenn isDefault, setze andere Tracks dieser Figur auf false
    if (isDefault) {
      const { error: updateError } = await (supabaseAdmin as any)
        .from('background_music_tracks')
        .update({ is_default: false })
        .eq('figure_id', figureId)
        .eq('is_default', true);

      if (updateError) {
        console.warn('Warning: Could not update other default tracks:', updateError);
      }
    }

    // Speichere in Datenbank
    const trackId = `${figureId}_${timestamp}_${randomId}`;
    const { data: dbData, error: dbError } = await (supabaseAdmin as any)
      .from('background_music_tracks')
      .insert({
        figure_id: figureId,
        figure_name: figureName,
        track_id: trackId,
        track_url: publicUrl,
        track_title: sourceLink || null, // Verwende track_title für Source-Link
        track_artist: null,
        is_default: isDefault,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Versuche Datei aus Storage zu löschen, wenn DB-Insert fehlschlägt
      try {
        await supabaseAdmin.storage.from('background-music').remove([fileName]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Failed to save track to database', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('[API/admin/music/upload] Upload successful:', {
      trackId: dbData?.id,
      fileName,
      figureId
    });

    return NextResponse.json({
      success: true,
      track: dbData,
      publicUrl,
    });
  } catch (error: any) {
    console.error('[API/admin/music/upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

