import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Bekannte Temp-Mail-Domains (zusätzlich zur Datenbank-Prüfung)
const BLOCKED_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'tempmail.com',
  'temp-mail.org',
  'mailinator.com',
  'throwaway.email',
  'getnada.com',
  'maildrop.cc',
  'mohmal.com',
  'yopmail.com',
  'mailnesia.com',
  'meltmail.com',
  'dispostable.com',
  'trashmail.com',
  'sharklasers.com',
  'grr.la',
  'spamgourmet.com',
  'emailondeck.com',
  'fakemail.net',
  'mintemail.com',
  'mytrashmail.com',
  'tempail.com',
  'tempmailo.com',
  'tmpmail.org',
  'mailcatch.com',
  'spambox.us',
  'getairmail.com',
  'mailinater.com',
  'tempr.email',
  'burnermail.io',
  'mail.tm',
  'inboxkitten.com',
  'tempmail.net',
  'tempmail.plus',
  'tempmailaddress.com',
  'tempinbox.co.uk',
  'temp-mail.io',
  'tmail.ws',
];

function isEmailDomainBlocked(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  
  // Prüfe lokale Liste
  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
    return true;
  }
  
  // Prüfe auch generische Temp-Mail-Patterns
  const tempMailPatterns = [
    /^temp/i,
    /^fake/i,
    /^trash/i,
    /^throwaway/i,
    /^disposable/i,
    /^spam/i,
    /^mohmal/i,
    /^yopmail/i,
    /mail\.tm$/i,
    /tempmail/i,
    /tmpmail/i,
  ];
  
  return tempMailPatterns.some(pattern => pattern.test(domain));
}

function getClientIP(request: NextRequest): string {
  // Versuche verschiedene Header für IP-Adresse
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Nimm die erste IP (Original-Client)
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback: In Vercel/Edge-Funktionen sollte immer ein Header vorhanden sein
  // Falls nicht, verwende 'unknown' (wird in Produktion nicht verwendet)
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email und Passwort sind erforderlich' },
        { status: 400 }
      );
    }
    
    // 1. Prüfe Email-Domain (lokal)
    if (isEmailDomainBlocked(email)) {
      console.log(`[Multi-Account] Blocked email domain: ${email}`);
      return NextResponse.json(
        { error: 'Diese E-Mail-Domain wird nicht akzeptiert. Bitte verwenden Sie eine echte E-Mail-Adresse.' },
        { status: 403 }
      );
    }
    
    // 2. Prüfe IP-Rate-Limit
    const clientIP = getClientIP(request);
    console.log(`[Multi-Account] Registration attempt from IP: ${clientIP}, Email: ${email}`);
    
    const adminSupabase = await createServerAdminClient();
    
    // TEST-MODUS: Überspringe IP-Rate-Limit wenn Umgebungsvariable gesetzt ist
    const testMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true' || process.env.TEST_MODE === 'true';
    
    if (!testMode) {
      // Prüfe ob IP zu viele Registrierungen hat
      // can_register_from_ip ist nicht in den generierten Typen, existiert aber in der DB
      const { data: canRegister, error: ipCheckError } = await (adminSupabase as any).rpc(
        'can_register_from_ip',
        { ip_address_text: clientIP }
      );
      
      if (ipCheckError) {
        console.error('[Multi-Account] Error checking IP rate limit:', ipCheckError);
        // Wenn Funktion nicht existiert (PGRST202), überspringe die Prüfung
        if (ipCheckError.code === 'PGRST202' || ipCheckError.message?.includes('does not exist')) {
          console.warn('[Multi-Account] IP rate limit function not found - skipping check. Please run supabase-multi-account-prevention.sql');
        } else {
          console.error('[Multi-Account] IP rate limit check failed:', ipCheckError);
        }
        // Bei Fehler: Erlaube Registrierung (Fail-Open für bessere UX)
      } else if (canRegister === false) {
        console.log(`[Multi-Account] IP rate limit exceeded: ${clientIP}`);
        return NextResponse.json(
          { error: 'Zu viele Registrierungen von dieser IP-Adresse. Bitte versuchen Sie es später erneut.' },
          { status: 429 }
        );
      }
    } else {
      console.log('[Multi-Account] TEST-MODUS aktiviert - IP-Rate-Limit übersprungen');
    }
    
    // 3. Prüfe Email-Domain in Datenbank (zusätzliche Sicherheit)
    // is_email_domain_blocked ist nicht in den generierten Typen, existiert aber in der DB
    const { data: isBlocked, error: domainCheckError } = await (adminSupabase as any).rpc(
      'is_email_domain_blocked',
      { email_text: email }
    );
    
    if (domainCheckError) {
      // Wenn Funktion nicht existiert, überspringe die Prüfung
      if (domainCheckError.code === 'PGRST202' || domainCheckError.message?.includes('does not exist')) {
        console.warn('[Multi-Account] Email domain check function not found - skipping check. Please run supabase-multi-account-prevention.sql');
      }
      // Bei Fehler: Erlaube Registrierung (Fail-Open für bessere UX)
    } else if (isBlocked === true) {
      console.log(`[Multi-Account] Blocked email domain (DB): ${email}`);
      return NextResponse.json(
        { error: 'Diese E-Mail-Domain wird nicht akzeptiert. Bitte verwenden Sie eine echte E-Mail-Adresse.' },
        { status: 403 }
      );
    }
    
    // 4. Erstelle User in Supabase Auth
    // Verwende normalen signUp für Email-Bestätigung (admin.createUser sendet keine Email)
    const headersList = await headers();
    const origin = headersList.get('origin') || headersList.get('referer') || 'http://localhost:3000';
    const redirectUrl = `${origin}/api/auth/callback?next=/dashboard?confirmed=true`;
    
    // Verwende normalen Supabase Client für signUp (sendet automatisch Bestätigungs-Email)
    const publicSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: authData, error: authError } = await publicSupabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          signup_origin: origin
        }
      }
    });
    
    if (authError) {
      console.error('[Multi-Account] Error creating user:', authError);
      
      // Bekannte Fehler behandeln
      if (authError.message.includes('already registered') || 
          authError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.' },
          { status: 409 }
        );
      }
      
      // Wenn nur Email-Versand fehlschlägt, aber User erstellt wurde
      if (authError.message.includes('confirmation email') || 
          authError.message.includes('Error sending')) {
        // Prüfe ob User trotzdem erstellt wurde
        if (authData?.user) {
          console.warn('[Multi-Account] User created but email confirmation failed:', authError.message);
          // User wurde erstellt, aber Email konnte nicht gesendet werden
          // Das ist OK - User kann sich trotzdem einloggen (wenn Email-Bestätigung deaktiviert ist)
          return NextResponse.json({
            success: true,
            user: {
              id: authData.user.id,
              email: authData.user.email,
            },
            message: 'Registrierung erfolgreich! Bitte melden Sie sich an (Email-Bestätigung wurde übersprungen).',
            warning: 'Email-Bestätigung konnte nicht gesendet werden. Bitte überprüfe deine Supabase SMTP-Konfiguration.',
          });
        }
      }
      
      return NextResponse.json(
        { error: authError.message || 'Fehler bei der Registrierung' },
        { status: 500 }
      );
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: 'User konnte nicht erstellt werden' },
        { status: 500 }
      );
    }
    
    // 5. Logge erfolgreichen Registrierungsversuch
    try {
      await adminSupabase
        .from('registration_attempts')
        .insert({
          ip_address: clientIP,
          email: email,
          user_id: authData.user.id,
          success: true,
        });
      
      console.log(`[Multi-Account] Successfully registered user: ${authData.user.id} from IP: ${clientIP}`);
    } catch (logError: any) {
      // Logging-Fehler sollten die Registrierung nicht blockieren
      if (logError.code === '42P01' || logError.message?.includes('does not exist')) {
        console.warn('[Multi-Account] registration_attempts table not found - skipping log. Please run supabase-multi-account-prevention.sql');
      } else {
        console.error('[Multi-Account] Error logging registration attempt:', logError);
      }
    }
    
    // 6. Sende Bestätigungs-Email (wird von Supabase automatisch gemacht)
    // Wir geben die User-Daten zurück, aber die Email-Bestätigung muss separat gehandhabt werden
    
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.',
    });
    
  } catch (error: any) {
    console.error('[Multi-Account] Unexpected error:', error);
    console.error('[Multi-Account] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Spezifische Fehlermeldungen
    let errorMessage = 'Ein unerwarteter Fehler ist aufgetreten';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code) {
      errorMessage = `Fehler ${error.code}: ${error.message || 'Unbekannter Datenbankfehler'}`;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

