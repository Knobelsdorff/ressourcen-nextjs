import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * Ordnet pending Ressourcen (mit client_email) automatisch dem eingeloggten User zu
 */
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

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const normalizedEmail = user.email.toLowerCase().trim();

    // Verwende Admin Client um RLS zu umgehen
    const supabaseAdmin = await createServerAdminClient();

    // Finde alle pending Ressourcen mit dieser client_email
    const { data: resources, error: findError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, client_email, user_id')
      .eq('client_email', normalizedEmail)
      .is('user_id', null); // Nur Ressourcen ohne user_id

    if (findError) {
      console.error('Error finding pending resources:', findError);
      return NextResponse.json(
        { error: 'Fehler beim Suchen nach Ressourcen', details: findError.message },
        { status: 500 }
      );
    }

    if (!resources || resources.length === 0) {
      return NextResponse.json({
        success: true,
        assignedCount: 0,
        message: 'Keine pending Ressourcen gefunden',
      });
    }

    // Aktualisiere user_id für alle gefundenen Ressourcen
    const resourceIds = resources.map((r: any) => r.id);
    
    const { error: updateError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .update({ user_id: user.id })
      .in('id', resourceIds);

    if (updateError) {
      console.error('Error assigning resources:', updateError);
      return NextResponse.json(
        { error: 'Fehler beim Zuordnen der Ressourcen', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`Assigned ${resourceIds.length} pending resources to user ${user.id} (${normalizedEmail})`);

    return NextResponse.json({
      success: true,
      assignedCount: resourceIds.length,
      resourceIds,
      message: `${resourceIds.length} Ressource(n) wurden zugeordnet`,
    });
  } catch (error: any) {
    console.error('Assign pending resources API error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}

