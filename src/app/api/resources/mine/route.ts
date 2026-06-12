import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * Lädt alle Stories des eingeloggten Users inkl. Zuordnung pending client_email-Ressourcen.
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    const supabaseAdmin = await createServerAdminClient();

    const { data: pending, error: pendingError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id')
      .eq('client_email', normalizedEmail)
      .is('user_id', null);

    if (pendingError) {
      return NextResponse.json(
        { error: 'Fehler beim Suchen pending Ressourcen', details: pendingError.message },
        { status: 500 }
      );
    }

    let assignedCount = 0;
    if (pending?.length) {
      const ids = pending.map((r: { id: string }) => r.id);
      const { error: updateError } = await (supabaseAdmin as any)
        .from('saved_stories')
        .update({ user_id: user.id })
        .in('id', ids);

      if (updateError) {
        console.error('[API/resources/mine] assign pending failed:', updateError);
      } else {
        assignedCount = ids.length;
        console.log(`[API/resources/mine] Assigned ${assignedCount} pending resources to ${user.id}`);
      }
    }

    const { data: stories, error: storiesError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (storiesError) {
      return NextResponse.json(
        { error: 'Fehler beim Laden der Stories', details: storiesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignedCount,
      stories: stories || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}
