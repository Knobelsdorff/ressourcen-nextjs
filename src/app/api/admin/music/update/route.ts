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

    const body = await request.json();
    const { trackId, sourceLink, volume } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: 'No trackId provided' },
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

    // Validierung: Lautstärke muss zwischen 0.01 und 0.25 sein (1% - 25%)
    if (volume !== undefined) {
      const volumeNum = parseFloat(volume);
      if (isNaN(volumeNum) || volumeNum < 0.01 || volumeNum > 0.25) {
        return NextResponse.json(
          { error: 'Volume must be between 0.01 and 0.25 (1% - 25%)' },
          { status: 400 }
        );
      }
    }

    // Verwende Admin Client für Datenbank-Operationen
    const supabaseAdmin = await createServerAdminClient();

    // Update Source-Link und/oder Lautstärke
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (sourceLink !== undefined) {
      updateData.track_title = sourceLink || null;
    }
    
    if (volume !== undefined) {
      updateData.volume = parseFloat(volume);
    }

    const { data: dbData, error: dbError } = await (supabaseAdmin as any)
      .from('background_music_tracks')
      .update(updateData)
      .eq('id', trackId)
      .select()
      .single();

    if (dbError) {
      console.error('Database update error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update track', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      track: dbData,
    });
  } catch (error: any) {
    console.error('Update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

