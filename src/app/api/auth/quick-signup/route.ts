import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';

/**
 * Schnell-Registrierung für Klienten während einer Sitzung
 * - Erstellt User ohne Passwort
 * - Email ist sofort bestätigt (überspringt Bestätigungs-Email)
 * - Ordnet Ressourcen mit client_email automatisch zu
 * - Generiert Magic-Link für späteres Passwort-Setzen
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Bitte gib eine gültige E-Mail-Adresse ein' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verwende Admin Client für User-Erstellung
    const adminSupabase = await createServerAdminClient();

    // Prüfe ob User bereits existiert
    const { data: existingUser, error: checkError } = await adminSupabase.auth.admin.listUsers();
    
    if (checkError) {
      console.error('Error checking existing users:', checkError);
      return NextResponse.json(
        { error: 'Fehler beim Prüfen der E-Mail-Adresse' },
        { status: 500 }
      );
    }

    const userExists = existingUser.users.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (userExists) {
      // User existiert bereits - ordne Ressourcen zu
      await assignResourcesToUser(adminSupabase, userExists.id, normalizedEmail);
      
      return NextResponse.json({
        success: true,
        user: {
          id: userExists.id,
          email: userExists.email,
        },
        message: 'Account existiert bereits. Ressourcen wurden zugeordnet.',
        isNewUser: false,
      });
    }

    // Erstelle neuen User mit Admin-API (umgeht Email-Bestätigung)
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true, // Email sofort bestätigt
      user_metadata: {
        quick_signup: true,
        signup_method: 'quick_signup'
      }
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Accounts. Bitte versuche es erneut.' },
        { status: 500 }
      );
    }

    // Erstelle automatisch Profil (falls nicht automatisch erstellt)
    try {
      await (adminSupabase as any)
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: normalizedEmail,
          full_name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    } catch (profileError: any) {
      // Profil existiert möglicherweise bereits oder wird automatisch erstellt
      if (!profileError.message?.includes('duplicate') && !profileError.message?.includes('already exists')) {
        console.warn('Could not create profile (may already exist):', profileError);
      }
    }

    // Ordne Ressourcen mit dieser Email zu
    await assignResourcesToUser(adminSupabase, newUser.user.id, normalizedEmail);

    // Generiere Magic-Link für Passwort-Setzen (optional, für später)
    const headersList = await request.headers;
    const origin = headersList.get('origin') || headersList.get('referer') || 'http://localhost:3000';
    const redirectUrl = `${origin}/auth/set-password`;

    const { data: magicLinkData, error: magicLinkError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: redirectUrl,
      }
    });

    // Magic-Link ist optional - Fehler ist nicht kritisch
    if (magicLinkError) {
      console.warn('Could not generate magic link:', magicLinkError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
      message: 'Account erfolgreich erstellt! Du kannst dich jetzt anmelden.',
      isNewUser: true,
      magicLink: magicLinkData?.properties?.action_link || null, // Für späteres Passwort-Setzen
    });
    
  } catch (error: any) {
    console.error('Quick signup error:', error);
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}

/**
 * Ordnet Ressourcen mit client_email automatisch dem User zu
 */
async function assignResourcesToUser(
  adminSupabase: any,
  userId: string,
  email: string
) {
  try {
    // Finde alle Ressourcen mit dieser client_email
    const { data: resources, error: findError } = await (adminSupabase as any)
      .from('saved_stories')
      .select('id, client_email, user_id')
      .eq('client_email', email.toLowerCase());

    if (findError) {
      console.error('Error finding resources:', findError);
      return;
    }

    if (!resources || resources.length === 0) {
      console.log(`No resources found for client email: ${email}`);
      return;
    }

    // Aktualisiere user_id für alle gefundenen Ressourcen
    const resourceIds = resources.map((r: any) => r.id);
    
    const { error: updateError } = await (adminSupabase as any)
      .from('saved_stories')
      .update({ user_id: userId })
      .in('id', resourceIds);

    if (updateError) {
      console.error('Error assigning resources:', updateError);
    } else {
      console.log(`Assigned ${resourceIds.length} resources to user ${userId}`);
    }
  } catch (error) {
    console.error('Error in assignResourcesToUser:', error);
  }
}

