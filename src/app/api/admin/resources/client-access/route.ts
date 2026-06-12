import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

async function findUserByEmail(
  supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>>,
  email: string
) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) break;
    const user = data?.users?.find((u) => u.email?.toLowerCase() === normalized) ?? null;
    if (user) return user;
    if (!data?.users?.length || data.users.length < perPage) break;
    page++;
  }
  return null;
}

/**
 * GET ?email= — Diagnose Klienten-Zugang (Auth-User, Stories, pending Zuordnung)
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
            cookiesToSet.forEach(({ name, value }) => {
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

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUser(user.email)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const emailParam = new URL(request.url).searchParams.get('email')?.trim();
    if (!emailParam) {
      return NextResponse.json({ error: 'email query parameter required' }, { status: 400 });
    }

    const normalizedEmail = emailParam.toLowerCase();
    const supabaseAdmin = await createServerAdminClient();
    const authUser = await findUserByEmail(supabaseAdmin, normalizedEmail);

    const { data: stories, error: storiesError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, title, client_email, user_id, is_audio_only, audio_url, created_at')
      .eq('client_email', normalizedEmail)
      .order('created_at', { ascending: false });

    if (storiesError) {
      return NextResponse.json(
        { error: 'Fehler beim Laden der Stories', details: storiesError.message },
        { status: 500 }
      );
    }

    const rows = stories || [];
    const pending = rows.filter((r: { user_id: string | null }) => !r.user_id);
    const assigned = rows.filter(
      (r: { user_id: string | null }) => r.user_id && authUser && r.user_id === authUser.id
    );
    const orphaned = rows.filter(
      (r: { user_id: string | null }) => r.user_id && authUser && r.user_id !== authUser.id
    );

    const appBaseUrl = process.env.APP_BASE_URL || 'https://www.power-storys.de';

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      authUser: authUser
        ? {
            id: authUser.id,
            email: authUser.email,
            password_set: authUser.user_metadata?.password_set === true,
            created_at: authUser.created_at,
          }
        : null,
      stories: {
        total: rows.length,
        pendingCount: pending.length,
        assignedToAuthUserCount: assigned.length,
        assignedToOtherUserCount: orphaned.length,
        pending,
        assigned,
        orphaned,
      },
      recommendations: [
        !authUser
          ? 'Kein Auth-User — Klientin muss E-Mail-Link öffnen oder Admin sendet Ressource erneut.'
          : authUser.user_metadata?.password_set !== true
            ? 'password_set ist false — Klientin soll Passwort auf /auth/set-password einrichten oder Reset abschließen.'
            : `Login für Klientin: ${appBaseUrl}/zugang (exakt diese E-Mail verwenden)`,
        pending.length > 0
          ? `${pending.length} Story(s) ohne user_id — nach Login sollte assign-pending sie zuordnen; ggf. erneut einloggen.`
          : null,
        orphaned.length > 0
          ? `${orphaned.length} Story(s) an andere user_id gebunden — manuell prüfen.`
          : null,
        'E-Mail-Links sind einmalig — für Wiedereinstieg immer /zugang mit Passwort.',
      ].filter(Boolean),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}
