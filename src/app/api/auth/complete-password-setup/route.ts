/**
 * Schließt das Setzen eines Passworts ab.
 *
 * Einziger Ort, an dem `password_set` gesetzt UND der Zugangslink entwertet
 * wird. Beides gehört zusammen: Sobald ein Passwort existiert, hat der
 * Langzeit-Link seine Aufgabe erfüllt und darf nicht weiter gelten.
 *
 * Das Passwort selbst wird weiterhin clientseitig über `supabase.auth.updateUser`
 * gesetzt – diese Route wird direkt danach aufgerufen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { consumeInvitesForUser, INVITE_COOKIE_NAME } from '@/lib/invites';

export const dynamic = 'force-dynamic';

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
          setAll() {
            /* diese Route setzt keine Auth-Cookies */
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = await createServerAdminClient();

    // Flag serverseitig setzen, damit es auch dann stimmt, wenn der Client
    // zwischen updateUser und diesem Aufruf abbricht.
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        password_set: true,
        password_set_at: new Date().toISOString(),
      },
    });

    const consumed = await consumeInvitesForUser(user.id);
    console.log(`[CompletePasswordSetup] ${consumed} Zugangslink(s) entwertet für ${user.email}`);

    const response = NextResponse.json({ success: true, consumedInvites: consumed });

    // Invite-Cookie entfernen: Die Session braucht ihn nicht mehr,
    // ab jetzt gilt die normale Passwort-Anmeldung.
    response.cookies.set(INVITE_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (e) {
    console.error('[CompletePasswordSetup] Fehler:', e);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
