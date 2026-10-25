/**
 * signup_completed für neue Accounts – egal über welchen Weg sie entstanden
 * sind (E-Mail-Link der Erststory, Magic Link, Registrierung). Der Browser
 * meldet sich nach dem ersten Login; hier wird geprüft, ob der Account wirklich
 * neu ist. Idempotent über eine feste Event-UUID: auch der Server-Aufruf aus
 * /willkommen zählt nicht doppelt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { captureServerEvent, requestHasConsent } from '@/lib/product-analytics/server';
import { signupEventFor } from '@/lib/product-analytics/signup';

export const dynamic = 'force-dynamic';

const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!requestHasConsent(request)) return new NextResponse(null, { status: 204 });

  const supabase = await createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  const createdAt = new Date(user.created_at).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > NEW_ACCOUNT_WINDOW_MS) {
    return new NextResponse(null, { status: 204 });
  }

  const { props, options } = signupEventFor(user);
  await captureServerEvent('signup_completed', props, options);
  return new NextResponse(null, { status: 204 });
}
