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
  console.log('[API/admin/music/delete] POST request received');
  
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
      console.warn('[API/admin/music/delete] Unauthorized access attempt:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prüfe ob User Admin ist
    if (!isAdminUser(user.email)) {
      console.warn('[API/admin/music/delete] Forbidden: User is not a music admin', { email: user.email });
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { trackId, trackUrl } = body;

    if (!trackId) {
      return NextResponse.json({ error: 'Missing trackId' }, { status: 400 });
    }

    // Verwende Admin Client für Datenbank-Operationen (umgeht RLS)
    const adminSupabase = await createServerAdminClient();

    // 1. Lösche aus Datenbank
    console.log(`[API/admin/music/delete] Deleting track ${trackId} from database`);
    const { error: dbError } = await (adminSupabase as any)
      .from('background_music_tracks')
      .delete()
      .eq('id', trackId);

    if (dbError) {
      console.error('[API/admin/music/delete] Database delete error:', dbError);
      return NextResponse.json(
        { error: `Failed to delete track from database: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 2. Versuche Datei aus Storage zu löschen (optional, kann fehlschlagen wenn RLS aktiv ist)
    if (trackUrl) {
      try {
        const fileName = trackUrl.split('/').pop();
        if (fileName) {
          console.log(`[API/admin/music/delete] Attempting to delete file ${fileName} from storage`);
          const { error: storageError } = await adminSupabase.storage
            .from('background-music')
            .remove([fileName]);

          if (storageError) {
            console.warn('[API/admin/music/delete] Could not delete file from storage:', storageError);
            // Wir geben trotzdem Erfolg zurück, da die DB-Löschung erfolgreich war
          } else {
            console.log('[API/admin/music/delete] File deleted from storage successfully');
          }
        }
      } catch (storageError) {
        console.warn('[API/admin/music/delete] Storage deletion error (non-critical):', storageError);
        // Nicht kritisch - DB-Löschung war erfolgreich
      }
    }

    console.log('[API/admin/music/delete] Track deleted successfully');
    return NextResponse.json({ message: 'Track deleted successfully' });

  } catch (error: any) {
    console.error('[API/admin/music/delete] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

