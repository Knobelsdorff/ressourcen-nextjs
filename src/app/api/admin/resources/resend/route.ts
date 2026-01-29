import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * Prüft ob der aktuelle User ein Admin ist (Full Admin)
 */
function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * API-Endpoint zum erneuten Versenden von Klienten-Ressourcen
 * Generiert einen neuen Magic Link und versendet die E-Mail erneut
 */
export async function POST(request: NextRequest) {
  try {
    // Erstelle Supabase Client für Session-Check
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
              request.cookies.set(name, value);
            });
          },
        },
      }
    );

    // Prüfe Authentifizierung
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prüfe ob User Admin ist
    if (!isAdminUser(user.email)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse Request Body
    const body = await request.json();
    const { resourceId, clientEmail } = body;

    if (!resourceId && !clientEmail) {
      return NextResponse.json(
        { error: 'resourceId oder clientEmail ist erforderlich' },
        { status: 400 }
      );
    }

    // Verwende Admin Client um RLS zu umgehen
    const supabaseAdmin = await createServerAdminClient();

    // Finde Ressource(n)
    let query = (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, title, client_email, audio_url, resource_figure, created_at');

    if (resourceId) {
      query = query.eq('id', resourceId);
    } else if (clientEmail) {
      query = query.eq('client_email', clientEmail.toLowerCase().trim());
    }

    const { data: resources, error: findError } = await query.order('created_at', { ascending: false });

    if (findError) {
      console.error('[API/admin/resources/resend] Error finding resources:', findError);
      return NextResponse.json(
        { error: 'Fehler beim Suchen nach Ressourcen', details: findError.message },
        { status: 500 }
      );
    }

    if (!resources || resources.length === 0) {
      return NextResponse.json(
        { error: 'Keine Ressourcen gefunden' },
        { status: 404 }
      );
    }

    // Für jede Ressource: Generiere Magic Link und versende E-Mail
    const normalizedClientEmail = resources[0].client_email?.toLowerCase().trim();
    
    if (!normalizedClientEmail) {
      return NextResponse.json(
        { error: 'Ressource hat keine client_email' },
        { status: 400 }
      );
    }

    // Bestimme origin für Magic Link
    const requestUrl = new URL(request.url);
    let origin = requestUrl.origin;
    if (!origin || origin === 'null') {
      const headersList = await request.headers;
      origin = headersList.get('origin') || 
               headersList.get('referer')?.split('/').slice(0, 3).join('/') || 
               'https://www.ressourcen.app';
    }

    // Prüfe ob User existiert
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users.find(u => u.email?.toLowerCase() === normalizedClientEmail);

    let magicLink: string | null = null;

    if (userExists) {
      // User existiert - generiere Magic Link für Login
      const redirectUrl = `${origin}/dashboard?resource=${resources[0].id}`;
      
      const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedClientEmail,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (!magicLinkError && magicLinkData?.properties?.action_link) {
        magicLink = magicLinkData.properties.action_link;
      }
    } else {
      // User existiert nicht - erstelle User
      const redirectUrl = `${origin}/dashboard?resource=${resources[0].id}`;
      
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedClientEmail,
        email_confirm: true,
        user_metadata: {
          resource_id: resources[0].id,
          resource_name: resources.length > 1 ? `${resources.length} Ressourcen` : resources[0].title,
          message: 'Deine Ressource ist bereit!'
        }
      });

      if (!createUserError && newUser.user) {
        const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedClientEmail,
          options: {
            redirectTo: redirectUrl,
          },
        });

        if (!magicLinkError && magicLinkData?.properties?.action_link) {
          magicLink = magicLinkData.properties.action_link;
        }
      }
    }

    if (!magicLink) {
      return NextResponse.json(
        { error: 'Fehler beim Generieren des Magic Links' },
        { status: 500 }
      );
    }

    // Versende E-Mail erneut
    const { sendResourceReadyEmail } = await import('@/lib/email');
    const resourceNames = resources.map((r: any) => r.title || r.resource_figure?.name || 'Unbenannte Ressource');
    
    const emailResult = await sendResourceReadyEmail({
      to: normalizedClientEmail,
      resourceNames: resourceNames,
      magicLink: magicLink,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { 
          error: 'E-Mail konnte nicht versendet werden',
          details: emailResult.error 
        },
        { status: 500 }
      );
    }

    // Sende Bestätigungs-Email an Admin
    try {
      const { sendAdminConfirmationEmail } = await import('@/lib/email');
      const adminEmailsList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const primaryAdminEmail = adminEmailsList[0] || 'safe@ressourcen.app';
      
      await sendAdminConfirmationEmail({
        to: primaryAdminEmail,
        clientEmail: normalizedClientEmail,
        resourceNames: resourceNames,
        success: true,
      });
    } catch (adminEmailError: any) {
      console.error('[API/admin/resources/resend] Error sending admin confirmation:', adminEmailError);
      // Nicht kritisch
    }

    return NextResponse.json({
      success: true,
      message: 'E-Mail wurde erfolgreich erneut versendet',
      resourceId: resources[0].id,
      clientEmail: normalizedClientEmail,
      resourceName: resourceNames[0],
      resourceCount: resources.length,
    });

  } catch (error: any) {
    console.error('[API/admin/resources/resend] Error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}
