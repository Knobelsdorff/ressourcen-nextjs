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
  console.log('[API/admin/music/toggle-default] POST request received');
  
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
      console.warn('[API/admin/music/toggle-default] Unauthorized access attempt:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prüfe ob User Admin ist
    if (!isAdminUser(user.email)) {
      console.warn('[API/admin/music/toggle-default] Forbidden: User is not a music admin', { email: user.email });
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { trackId, figureId, isDefault } = body;

    if (!trackId || figureId === undefined) {
      return NextResponse.json({ error: 'Missing trackId or figureId' }, { status: 400 });
    }

    // Use adminSupabase client to bypass RLS for update
    const adminSupabase = await createServerAdminClient();

    if (isDefault) {
      // Wenn bereits default, entferne default-Status
      console.log(`[API/admin/music/toggle-default] Removing default status from track ${trackId}`);
      const { error } = await (adminSupabase as any)
        .from('background_music_tracks')
        .update({ is_default: false })
        .eq('id', trackId);

      if (error) {
        console.error('[API/admin/music/toggle-default] Error removing default:', error);
        return NextResponse.json({ error: `Failed to remove default: ${error.message}` }, { status: 500 });
      }
    } else {
      // Setze alle anderen auf false
      console.log(`[API/admin/music/toggle-default] Setting other tracks for ${figureId} to non-default`);
      const { error: updateError } = await (adminSupabase as any)
        .from('background_music_tracks')
        .update({ is_default: false })
        .eq('figure_id', figureId)
        .eq('is_default', true);

      if (updateError) {
        console.warn('[API/admin/music/toggle-default] Warning: Could not update other default tracks:', updateError.message);
      }

      // Setze diesen auf true
      console.log(`[API/admin/music/toggle-default] Setting track ${trackId} as default`);
      const { error } = await (adminSupabase as any)
        .from('background_music_tracks')
        .update({ is_default: true })
        .eq('id', trackId);

      if (error) {
        console.error('[API/admin/music/toggle-default] Error setting default:', error);
        return NextResponse.json({ error: `Failed to set default: ${error.message}` }, { status: 500 });
      }
    }

    console.log('[API/admin/music/toggle-default] Default status toggled successfully');
    return NextResponse.json({ message: 'Default status toggled successfully' });

  } catch (error: any) {
    console.error('[API/admin/music/toggle-default] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

