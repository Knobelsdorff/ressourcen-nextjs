/**
 * Speichert die Analyse-Einwilligung am Account (app_metadata, nur serverseitig
 * schreibbar). Server-Events ohne Request – Stripe-Webhook, Cron für das Ende
 * der Gratis-Tage – senden nur, wenn hier "granted" steht.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { parseConsent } from '@/lib/product-analytics/consent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const state = parseConsent(body?.state);
  if (!state) return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });

  const supabase = await createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  if (user.app_metadata?.analytics_consent === state) return NextResponse.json({ ok: true });

  try {
    const admin = await createServerAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, analytics_consent: state, analytics_consent_at: new Date().toISOString() },
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Analytics/consent] Konnte nicht gespeichert werden:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Nicht gespeichert' }, { status: 500 });
  }
}
