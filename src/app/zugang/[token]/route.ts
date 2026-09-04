/**
 * Einlösung eines Langzeit-Zugangslinks.
 *
 * Der Klartext-Token kommt aus der E-Mail. Wir lösen ihn serverseitig ein,
 * bauen daraus eine Supabase-Session und leiten direkt zur Power Story weiter.
 * Die Klient:in bekommt keinen Supabase-Token zu sehen – der kurzlebige
 * Magic-Link wird innerhalb dieses einen Requests erzeugt und sofort verbraucht.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { redeemInvite, attachInviteToUser, INVITE_COOKIE_NAME } from '@/lib/invites';
import { appUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}

/** Abgelaufen, widerrufen oder unbekannt: zurück auf /zugang mit freundlichem Hinweis. */
function fehlerRedirect(grund: 'abgelaufen' | 'fehler') {
  return NextResponse.redirect(appUrl(`/zugang?fehler=${grund}`));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const invite = await redeemInvite(token, clientIp(request));

    if (!invite) {
      console.log('[Zugang] Invite ungültig, abgelaufen oder bereits verbraucht');
      return fehlerRedirect('abgelaufen');
    }

    const supabaseAdmin = await createServerAdminClient();

    // Kurzlebigen Magic-Link erzeugen und sofort einlösen – rein serverseitig.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: invite.email,
    });

    const emailOtp = linkData?.properties?.email_otp;
    const hashedToken = linkData?.properties?.hashed_token;

    if (linkError || (!emailOtp && !hashedToken)) {
      console.error('[Zugang] generateLink fehlgeschlagen:', linkError?.message);
      return fehlerRedirect('fehler');
    }

    // Ziel bestimmen, bevor wir die Response (und damit die Cookies) bauen.
    const target = invite.resourceId
      ? appUrl(`/dashboard?resource=${invite.resourceId}`)
      : appUrl('/dashboard');

    const response = NextResponse.redirect(target);

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
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: sessionData, error: verifyError } = hashedToken
      ? await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: hashedToken })
      : await supabase.auth.verifyOtp({ type: 'magiclink', email: invite.email, token: emailOtp! });

    if (verifyError || !sessionData?.session) {
      console.error('[Zugang] verifyOtp fehlgeschlagen:', verifyError?.message);
      return fehlerRedirect('fehler');
    }

    // Invite nachträglich mit dem User verknüpfen, falls beim Erstellen
    // noch keine user_id bekannt war.
    const userId = sessionData.session.user.id;
    if (!invite.userId && userId) {
      await attachInviteToUser(invite.inviteId, userId);
    }

    // Markiert diese Session als Invite-Login. Die Middleware lässt solche
    // Sessions ohne Passwort ins Dashboard – das Passwort ist optional.
    response.cookies.set(INVITE_COOKIE_NAME, invite.inviteId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // 60 Tage, wie der Invite selbst
    });

    console.log('[Zugang] Invite erfolgreich eingelöst für', invite.email);
    return response;
  } catch (e) {
    console.error('[Zugang] Unerwarteter Fehler:', e);
    return fehlerRedirect('fehler');
  }
}
