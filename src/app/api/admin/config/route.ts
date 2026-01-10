import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * GET: Lade aktuelle Konfiguration
 */
export async function GET(request: NextRequest) {
  try {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUser(user.email)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const supabaseAdmin = await createServerAdminClient();
    const { data: config, error } = await (supabaseAdmin as any)
      .from('app_config')
      .select('*')
      .eq('key', 'example_resource_id')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[admin/config] Error loading config:', error);
      return NextResponse.json(
        { error: 'Fehler beim Laden der Konfiguration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: config || null,
    });
  } catch (error: any) {
    console.error('[admin/config] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Konfiguration' },
      { status: 500 }
    );
  }
}

/**
 * POST/PUT: Setze Beispiel-Ressourcenfigur-ID
 */
export async function POST(request: NextRequest) {
  try {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUser(user.email)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { resourceId } = body;

    if (!resourceId || typeof resourceId !== 'string') {
      return NextResponse.json(
        { error: 'resourceId ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob die Ressourcenfigur existiert
    const supabaseAdmin = await createServerAdminClient();
    const { data: resource, error: resourceError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, audio_url')
      .eq('id', resourceId)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json(
        { error: 'Ressourcenfigur nicht gefunden' },
        { status: 404 }
      );
    }

    if (!resource.audio_url || resource.audio_url.trim() === '') {
      return NextResponse.json(
        { error: 'Ressourcenfigur hat keine Audio-Datei' },
        { status: 400 }
      );
    }

    // Speichere oder aktualisiere die Konfiguration
    const { data: config, error: configError } = await (supabaseAdmin as any)
      .from('app_config')
      .upsert({
        key: 'example_resource_id',
        value: resourceId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (configError) {
      console.error('[admin/config] Error saving config:', configError);
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Konfiguration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: config,
    });
  } catch (error: any) {
    console.error('[admin/config] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Konfiguration' },
      { status: 500 }
    );
  }
}

