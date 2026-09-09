/**
 * Fordert einen neuen Langzeit-Zugangslink an.
 *
 * Wird von /zugang aufgerufen, wenn ein Link abgelaufen ist. Antwortet aus
 * Datenschutzgründen immer gleich – egal ob die E-Mail bekannt ist oder nicht.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createInvite } from '@/lib/invites';

export const dynamic = 'force-dynamic';

async function findUserByEmail(
  supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>>,
  email: string
): Promise<{ id: string; email?: string } | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const user = data?.users?.find((u) => u.email?.toLowerCase() === normalized) ?? null;
    if (user) return user;
    if (!data?.users?.length || data.users.length < perPage) return null;
    page++;
  }
  return null;
}

export async function POST(request: NextRequest) {
  // Immer dieselbe Antwort: verrät nicht, welche Adressen registriert sind.
  const generischeAntwort = NextResponse.json({
    success: true,
    message: 'Wenn zu dieser Adresse Power Storys hinterlegt sind, ist ein neuer Link unterwegs.',
  });

  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Bitte gib eine gültige E-Mail-Adresse ein.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabaseAdmin = await createServerAdminClient();

    const user = await findUserByEmail(supabaseAdmin, normalizedEmail);
    if (!user) {
      console.log('[RequestAccessLink] Unbekannte Adresse, keine Aktion');
      return generischeAntwort;
    }

    // Neueste Ressource der Person, damit der Link direkt dorthin führt.
    const { data: resources } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, title, resource_figure')
      .eq('client_email', normalizedEmail)
      .order('created_at', { ascending: false });

    if (!resources || resources.length === 0) {
      console.log('[RequestAccessLink] Keine Ressourcen für', normalizedEmail);
      return generischeAntwort;
    }

    const invite = await createInvite({
      email: normalizedEmail,
      userId: user.id,
      resourceId: resources[0].id,
    });

    const { sendResourceReadyEmail } = await import('@/lib/email');
    const resourceNames = resources.map(
      (r: any) => r.title || r.resource_figure?.name || 'Unbenannte Ressource'
    );

    await sendResourceReadyEmail({
      to: normalizedEmail,
      resourceNames,
      magicLink: invite.url,
      expiresAt: invite.expiresAt,
    });

    console.log('[RequestAccessLink] Neuer Zugangslink versendet an', normalizedEmail);
    return generischeAntwort;
  } catch (e) {
    console.error('[RequestAccessLink] Fehler:', e);
    // Auch im Fehlerfall nichts über die Adresse verraten.
    return generischeAntwort;
  }
}
