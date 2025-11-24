// API-Route für Rate-Limit-Prüfung für anonyme User
import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function POST(request: NextRequest) {
  try {
    const { browserFingerprint } = await request.json();

    if (!browserFingerprint) {
      return NextResponse.json(
        { error: 'Browser-Fingerprint ist erforderlich' },
        { status: 400 }
      );
    }

    const supabaseAdmin = await createServerAdminClient();
    
    // Prüfe ob bereits eine Ressource für diesen Fingerprint existiert
    const { data: existing, error } = await (supabaseAdmin as any)
      .from('anonymous_resource_creations')
      .select('id, created_at')
      .eq('browser_fingerprint', browserFingerprint)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Rate limit check error:', error);
      // Bei Fehler: Erlaube (Fail-Open für bessere UX)
      return NextResponse.json({ allowed: true });
    }

    if (existing) {
      console.log('Rate limit exceeded for fingerprint:', browserFingerprint);
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Du hast bereits eine kostenlose Ressource erstellt. Bitte erstelle einen Account für weitere Ressourcen.'
        },
        { status: 403 }
      );
    }

    // Erste Ressource: Erlaube (wird beim Audio-Generieren gespeichert)
    return NextResponse.json({ allowed: true });
  } catch (error: any) {
    console.error('Rate limit check exception:', error);
    // Bei Exception: Erlaube (Fail-Open)
    return NextResponse.json({ allowed: true });
  }
}

