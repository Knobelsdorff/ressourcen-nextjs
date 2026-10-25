/**
 * Link aus der Erststory-E-Mail.
 *
 * Meldet an (legt den Account bei Bedarf an), ordnet den Entwurf dem Account
 * zu und leitet direkt ins Dashboard. Funktioniert in jedem Tab und auf jedem
 * Gerät – es wird nichts aus dem Browser benötigt, in dem die Fragen
 * beantwortet wurden.
 *
 * Bleibt auch bei ausgeschaltetem Feature-Flag aktiv, damit bereits versendete
 * Links weiter funktionieren.
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { INVITE_COOKIE_NAME } from '@/lib/invites';
import { FIRST_STORY_LINK_DAYS } from '@/lib/first-story/config';
import {
  attachDraftToUser,
  claimFirstStoryDraft,
  draftNeedsWork,
  getSessionUser,
  loadDraft,
  loadDraftAnalyticsId,
  processFirstStoryDraft,
  requestOrigin,
  verifyFirstStoryLinkToken,
} from '@/lib/first-story/server';
import { captureServerEvent, identifyServer } from '@/lib/product-analytics/server';
import { signupEventFor } from '@/lib/product-analytics/signup';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function isAlreadyRegistered(error: { code?: string; status?: number; message?: string }): boolean {
  return (
    error.code === 'email_exists' ||
    error.code === 'user_already_exists' ||
    error.status === 422 ||
    /already (been )?registered|already exists/i.test(error.message ?? '')
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const origin = requestOrigin(request);
  const dashboardUrl = `${origin}/dashboard?welcome=1`;
  const restartUrl = `${origin}/create-story?first=true&linkError=1`;
  const loginUrl = `${origin}/zugang?returnTo=${encodeURIComponent('/dashboard?welcome=1')}`;

  const parsed = verifyFirstStoryLinkToken(token);
  if (!parsed) {
    console.log('[Willkommen] Ungültiger Link');
    return NextResponse.redirect(restartUrl);
  }

  try {
    const admin = await createServerAdminClient();
    const draft = await loadDraft(admin, parsed.draftId);
    if (!draft) {
      console.log('[Willkommen] Entwurf nicht gefunden', parsed.draftId);
      return NextResponse.redirect(restartUrl);
    }

    if (parsed.expired) {
      // Bereits angemeldet: einfach weiter. Sonst normal einloggen lassen.
      const sessionUser = await getSessionUser(request);
      if (sessionUser && sessionUser.id === draft.user_id) return NextResponse.redirect(dashboardUrl);
      return NextResponse.redirect(draft.user_id ? loginUrl : restartUrl);
    }

    // 1. Account sicherstellen. Der Klick auf den Link bestätigt die Adresse.
    const { error: createError } = await admin.auth.admin.createUser({
      email: draft.email,
      email_confirm: true,
      user_metadata: { signup_method: 'first_story' },
    });
    if (createError && !isAlreadyRegistered(createError)) {
      console.error('[Willkommen] createUser fehlgeschlagen:', createError.message);
      return NextResponse.redirect(restartUrl);
    }

    // 2. Session aufbauen – kurzlebiger Magic-Link, sofort serverseitig eingelöst
    //    (gleiches Verfahren wie /zugang/[token]).
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: draft.email,
    });
    const hashedToken = linkData?.properties?.hashed_token;
    if (linkError || !hashedToken) {
      console.error('[Willkommen] generateLink fehlgeschlagen:', linkError?.message);
      return NextResponse.redirect(restartUrl);
    }

    const sessionCookies: { name: string; value: string; options: CookieOptions }[] = [];
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            sessionCookies.push(...cookiesToSet);
          },
        },
      }
    );

    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashedToken,
    });
    if (verifyError || !sessionData?.session) {
      console.error('[Willkommen] verifyOtp fehlgeschlagen:', verifyError?.message);
      return NextResponse.redirect(restartUrl);
    }

    // 3. Entwurf zuordnen und – falls schon fertig – sofort speichern.
    const userId = sessionData.session.user.id;
    if (!draft.user_id) {
      await attachDraftToUser(admin, draft.id, userId);
    } else if (draft.user_id !== userId) {
      console.warn('[Willkommen] Entwurf gehört einem anderen Account', draft.id);
    }

    const storyId = await claimFirstStoryDraft(draft.id);
    if (!storyId && draftNeedsWork(draft)) {
      after(() => processFirstStoryDraft(draft.id));
    }

    // Funnel: Der Link wird oft auf einem anderen Gerät geöffnet als dem, auf
    // dem die Fragen beantwortet wurden. Mit Einwilligung (analytics_id am
    // Entwurf) beide Kennungen zusammenführen; neuer Account → signup_completed.
    const sessionUserForAnalytics = sessionData.session.user;
    const accountCreated = !createError;
    after(async () => {
      const analyticsId = await loadDraftAnalyticsId(admin, draft.id);
      if (!analyticsId) return;
      await identifyServer(userId, analyticsId, accountCreated ? { signup_method: 'first_story' } : undefined);
      if (accountCreated) {
        const { props, options } = signupEventFor(sessionUserForAnalytics);
        await captureServerEvent('signup_completed', props, options);
      }
    });

    const response = NextResponse.redirect(dashboardUrl);
    sessionCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

    // Wie bei den Zugangslinks: Diese Session darf ohne Passwort ins Dashboard
    // (siehe src/middleware.ts). Das Passwort bleibt ein Angebot.
    response.cookies.set(INVITE_COOKIE_NAME, 'first-story', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * FIRST_STORY_LINK_DAYS,
    });

    console.log('[Willkommen] Angemeldet und zugeordnet', { draftId: draft.id, storyId });
    return response;
  } catch (e) {
    console.error('[Willkommen] Unerwarteter Fehler:', e);
    return NextResponse.redirect(restartUrl);
  }
}
