import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * Prüft ob der aktuelle User ein Admin ist (Full Admin)
 */
function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * API-Endpoint zum Abrufen aller versendeten Ressourcen (mit client_email)
 */
export async function GET(request: NextRequest) {
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

    // Verwende Admin Client um RLS zu umgehen
    const supabaseAdmin = await createServerAdminClient();

    // Hole alle Ressourcen mit client_email (nicht null)
    const { data: resources, error: findError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, title, client_email, created_at, audio_url, resource_figure')
      .not('client_email', 'is', null)
      .order('created_at', { ascending: false });

    if (findError) {
      console.error('[API/admin/resources/list-sent] Error finding resources:', findError);
      return NextResponse.json(
        { error: 'Fehler beim Laden der Ressourcen', details: findError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      resources: resources || [],
    });

  } catch (error: any) {
    console.error('[API/admin/resources/list-sent] Error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}
