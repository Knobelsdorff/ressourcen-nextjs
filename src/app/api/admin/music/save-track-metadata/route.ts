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

/**
 * Speichert Track-Metadaten in der Datenbank nach direktem Upload zu Storage
 */
export async function POST(request: NextRequest) {
  console.log('[API/admin/music/save-track-metadata] POST request received');
  
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
      console.warn('[API/admin/music/save-track-metadata] Unauthorized access attempt:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prüfe ob User Admin ist
    if (!isAdminUser(user.email)) {
      console.warn('[API/admin/music/save-track-metadata] Forbidden: User is not a music admin', { email: user.email });
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { figureId, figureName, trackUrl, storageFileName, sourceLink, isDefault } = body;

    if (!figureId || !trackUrl) {
      return NextResponse.json(
        { error: 'Missing figureId or trackUrl' },
        { status: 400 }
      );
    }

    // Verwende Admin Client für Datenbank-Operationen (umgeht RLS)
    const adminSupabase = await createServerAdminClient();

    // Wenn isDefault, setze andere Tracks dieser Figur auf false
    if (isDefault) {
      const { error: updateError } = await (adminSupabase as any)
        .from('background_music_tracks')
        .update({ is_default: false })
        .eq('figure_id', figureId)
        .eq('is_default', true);

      if (updateError) {
        console.warn('Warning: Could not update other default tracks:', updateError);
      }
    }

    // Generiere trackId aus storageFileName
    const trackId = storageFileName.split('.')[0]; // Entferne Dateiendung

    // Speichere in Datenbank
    const { data: dbData, error: dbError } = await (adminSupabase as any)
      .from('background_music_tracks')
      .insert({
        figure_id: figureId,
        figure_name: figureName,
        track_id: trackId,
        track_url: trackUrl,
        track_title: sourceLink || null,
        track_artist: null,
        is_default: isDefault,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[API/admin/music/save-track-metadata] Database insert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save track to database', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('[API/admin/music/save-track-metadata] Track metadata saved successfully:', {
      trackId: dbData?.id,
      figureId
    });

    return NextResponse.json({
      success: true,
      track: dbData,
    });

  } catch (error: any) {
    console.error('[API/admin/music/save-track-metadata] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

