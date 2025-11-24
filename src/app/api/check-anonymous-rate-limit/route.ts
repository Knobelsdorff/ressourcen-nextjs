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

    // Extrahiere IP-Adresse aus Headers
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     null;

    const supabaseAdmin = await createServerAdminClient();
    
    // Prüfe beide Bedingungen parallel: Browser-Fingerprint ODER IP-Adresse
    const queries = [];
    
    if (browserFingerprint) {
      queries.push(
        (supabaseAdmin as any)
          .from('anonymous_resource_creations')
          .select('id, created_at, browser_fingerprint')
          .eq('browser_fingerprint', browserFingerprint)
          .maybeSingle()
      );
    }
    
    if (ipAddress) {
      queries.push(
        (supabaseAdmin as any)
          .from('anonymous_resource_creations')
          .select('id, created_at, ip_address')
          .eq('ip_address', ipAddress)
          .maybeSingle()
      );
    }

    // Führe beide Queries aus
    const results = await Promise.all(queries);
    
    // Prüfe ob eine der Bedingungen erfüllt ist (OR-Logik)
    const existingByFingerprint = browserFingerprint ? results.find(r => r.data && !r.error && r.data.browser_fingerprint === browserFingerprint) : null;
    const existingByIP = ipAddress ? results.find(r => r.data && !r.error && r.data.ip_address === ipAddress) : null;
    
    // Prüfe auf Fehler (außer "keine Zeilen gefunden")
    const hasError = results.some(r => r.error && r.error.code !== 'PGRST116');
    if (hasError) {
      console.error('Rate limit check error:', results.find(r => r.error));
      // Bei Fehler: Erlaube (Fail-Open für bessere UX)
      return NextResponse.json({ allowed: true });
    }

    // Wenn Fingerprint ODER IP bereits verwendet wurde → blockieren
    if (existingByFingerprint?.data || existingByIP?.data) {
      console.log('Rate limit exceeded:', {
        fingerprint: browserFingerprint,
        ip: ipAddress,
        existingByFingerprint: existingByFingerprint?.data,
        existingByIP: existingByIP?.data
      });
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

