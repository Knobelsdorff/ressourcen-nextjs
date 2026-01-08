import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * API-Route zum Prüfen des E-Mail-Versand-Status
 * Zeigt die letzten Ressourcen mit client_email und deren Status
 */
export async function GET(request: NextRequest) {
  try {
    // Prüfe Authentifizierung
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prüfe ob Admin
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const musicAdminEmails = (process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const allAdminEmails = [...adminEmails, ...musicAdminEmails];
    if (!allAdminEmails.includes(user.email.toLowerCase())) {
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    // Hole Query-Parameter
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const clientEmail = searchParams.get('email')?.toLowerCase().trim();

    // Verwende Admin Client
    const supabaseAdmin = await createServerAdminClient();

    // Baue Query
    let query = (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, title, client_email, created_at, audio_url, is_audio_only, user_id')
      .not('client_email', 'is', null)
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (clientEmail) {
      query = query.eq('client_email', clientEmail);
    }

    const { data: resources, error } = await query;

    if (error) {
      console.error('[check-email-delivery] Database error:', error);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Daten', details: error.message },
        { status: 500 }
      );
    }

    // Gruppiere nach Klientin
    const byClient: Record<string, {
      total: number;
      pending: number;
      assigned: number;
      resources: any[];
      latest: string;
    }> = {};

    resources?.forEach((r: any) => {
      const email = r.client_email;
      if (!byClient[email]) {
        byClient[email] = {
          total: 0,
          pending: 0,
          assigned: 0,
          resources: [],
          latest: r.created_at,
        };
      }
      byClient[email].total++;
      if (r.user_id) {
        byClient[email].assigned++;
      } else {
        byClient[email].pending++;
      }
      byClient[email].resources.push(r);
      if (new Date(r.created_at) > new Date(byClient[email].latest)) {
        byClient[email].latest = r.created_at;
      }
    });

    // Prüfe SMTP-Konfiguration
    const smtpConfig = {
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASSWORD: !!process.env.SMTP_PASSWORD,
      SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@ressourcen.app',
    };

    const smtpConfigured = smtpConfig.SMTP_HOST && smtpConfig.SMTP_PORT && 
                          smtpConfig.SMTP_USER && smtpConfig.SMTP_PASSWORD;

    // Berechne Zeit seit Erstellung für jede Ressource
    const resourcesWithTime = resources?.map((r: any) => {
      const created = new Date(r.created_at);
      const now = new Date();
      const hoursAgo = Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60));
      return {
        ...r,
        hours_ago: hoursAgo,
        created_at_formatted: created.toLocaleString('de-DE', { 
          timeZone: 'Europe/Berlin',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
      };
    }) || [];

    return NextResponse.json({
      success: true,
      smtpConfigured,
      smtpConfig: {
        ...smtpConfig,
        SMTP_PASSWORD: '***', // Nicht anzeigen
      },
      timeRange: `${hours} Stunden`,
      totalResources: resources?.length || 0,
      byClient: Object.entries(byClient).map(([email, stats]) => {
        const latestDate = new Date(stats.latest);
        const now = new Date();
        const hoursAgo = Math.round((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60));
        return {
          email,
          total: stats.total,
          pending: stats.pending,
          assigned: stats.assigned,
          latest: stats.latest,
          latest_formatted: latestDate.toLocaleString('de-DE', { 
            timeZone: 'Europe/Berlin',
            dateStyle: 'short',
            timeStyle: 'short'
          }),
          hours_ago: hoursAgo,
          resources: stats.resources.map(r => ({
            id: r.id,
            title: r.title,
            created_at: r.created_at,
            created_at_formatted: new Date(r.created_at).toLocaleString('de-DE', { 
              timeZone: 'Europe/Berlin',
              dateStyle: 'short',
              timeStyle: 'short'
            }),
            has_audio: !!r.audio_url,
            is_pending: !r.user_id,
          })),
        };
      }),
      allResources: resourcesWithTime.map((r: any) => ({
        id: r.id,
        title: r.title,
        client_email: r.client_email,
        created_at: r.created_at,
        created_at_formatted: r.created_at_formatted,
        hours_ago: r.hours_ago,
        has_audio: !!r.audio_url,
        is_audio_only: r.is_audio_only,
        is_pending: !r.user_id,
      })),
    });
  } catch (error: any) {
    console.error('[check-email-delivery] Error:', error);
    return NextResponse.json(
      { error: 'Interner Fehler', details: error.message },
      { status: 500 }
    );
  }
}

