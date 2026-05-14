import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

async function findUserByEmail(
  supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>>,
  email: string
): Promise<{ id: string; email?: string; user_metadata?: Record<string, unknown> } | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn('[API/admin/resources/resend] listUsers error:', error.message);
      return null;
    }
    const user = data?.users?.find((u) => u.email?.toLowerCase() === normalized) ?? null;
    if (user) return user;
    if (!data?.users?.length || data.users.length < perPage) return null;
    page++;
    if (page > 50) break;
  }
  return null;
}

function rewriteRecoveryRedirectTo(magicLink: string, origin: string): string {
  try {
    const linkUrl = new URL(magicLink);
    const currentRedirectTo = linkUrl.searchParams.get('redirect_to');
    if (currentRedirectTo) {
      const newRedirectTo = currentRedirectTo.replace(/https:\/\/[^/]+/, origin);
      linkUrl.searchParams.set('redirect_to', newRedirectTo);
      return linkUrl.toString();
    }
  } catch {
    /* ignore */
  }
  return magicLink;
}

function resolveOrigin(request: NextRequest): string {
  const requestUrl = new URL(request.url);
  let origin = requestUrl.origin;

  if (!origin || origin === 'null') {
    const headersList = request.headers;
    origin =
      headersList.get('origin') ||
      headersList.get('referer')?.split('/').slice(0, 3).join('/') ||
      process.env.APP_BASE_URL ||
      'https://www.power-storys.de';
  }

  if (origin.includes('localhost') && !origin.includes(':')) {
    origin = 'http://localhost:3000';
  } else if (origin.includes('localhost') && !origin.includes(':3000')) {
    origin = origin.replace(/:\d+/, ':3000');
  }

  return origin;
}

/** Erneutes Versenden der Klienten-E-Mail (neuer Magic/Recovery-Link), Logik wie create-batch. */
export async function POST(request: NextRequest) {
  try {
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminUser(user.email)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { resourceId, clientEmail } = body;

    if (!resourceId && !clientEmail) {
      return NextResponse.json(
        { error: 'resourceId oder clientEmail ist erforderlich' },
        { status: 400 }
      );
    }

    const supabaseAdmin = await createServerAdminClient();

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
      return NextResponse.json({ error: 'Keine Ressourcen gefunden' }, { status: 404 });
    }

    const normalizedClientEmail = resources[0].client_email?.toLowerCase().trim();

    if (!normalizedClientEmail) {
      return NextResponse.json({ error: 'Ressource hat keine client_email' }, { status: 400 });
    }

    const origin = resolveOrigin(request);
    const redirectUrl = `${origin}/dashboard?resource=${resources[0].id}`;
    const resourceCount = resources.length;
    const resourceLabel =
      resourceCount > 1 ? `${resourceCount} Ressourcen` : resources[0].title || 'Deine Ressource';

    let userExists = await findUserByEmail(supabaseAdmin, normalizedClientEmail);
    let magicLink: string | null = null;

    if (userExists) {
      const hasPasswordSet = userExists.user_metadata?.password_set === true;

      await supabaseAdmin.auth.admin.updateUserById(userExists.id, {
        user_metadata: {
          ...userExists.user_metadata,
          resource_id: resources[0].id,
          resource_name: resourceLabel,
          message:
            resourceCount > 1
              ? `Du hast ${resourceCount} neue Ressourcen!`
              : 'Deine Ressource ist bereit!',
        },
      });

      if (hasPasswordSet) {
        const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedClientEmail,
          options: { redirectTo: redirectUrl },
        });
        if (!magicLinkError && magicLinkData?.properties?.action_link) {
          magicLink = magicLinkData.properties.action_link;
        } else {
          console.error('[API/admin/resources/resend] magiclink error:', magicLinkError);
        }
      } else {
        const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: normalizedClientEmail,
          options: { redirectTo: redirectUrl },
        });
        if (!recoveryError && recoveryData?.properties?.action_link) {
          magicLink = rewriteRecoveryRedirectTo(recoveryData.properties.action_link, origin);
        } else {
          console.error('[API/admin/resources/resend] recovery error:', recoveryError);
        }
      }
    } else {
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedClientEmail,
        email_confirm: true,
        user_metadata: {
          resource_id: resources[0].id,
          resource_name: resourceLabel,
          message:
            resourceCount > 1
              ? `Du hast ${resourceCount} neue Ressourcen!`
              : 'Deine Ressource ist bereit!',
          password_set: false,
        },
      });

      if (!createUserError && newUser.user) {
        const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: normalizedClientEmail,
          options: { redirectTo: redirectUrl },
        });
        if (!recoveryError && recoveryData?.properties?.action_link) {
          magicLink = rewriteRecoveryRedirectTo(recoveryData.properties.action_link, origin);
        } else {
          console.error('[API/admin/resources/resend] recovery (new user) error:', recoveryError);
        }
      } else {
        const isEmailExists =
          (createUserError as { code?: string; status?: number })?.code === 'email_exists' ||
          (createUserError as { code?: string; status?: number })?.status === 422;
        if (isEmailExists) {
          userExists = await findUserByEmail(supabaseAdmin, normalizedClientEmail);
          if (userExists) {
            const hasPasswordSet = userExists.user_metadata?.password_set === true;
            await supabaseAdmin.auth.admin.updateUserById(userExists.id, {
              user_metadata: {
                ...userExists.user_metadata,
                resource_id: resources[0].id,
                resource_name: resourceLabel,
                message:
                  resourceCount > 1
                    ? `Du hast ${resourceCount} neue Ressourcen!`
                    : 'Deine Ressource ist bereit!',
              },
            });
            if (hasPasswordSet) {
              const { data: magicLinkData, error: magicLinkError } =
                await supabaseAdmin.auth.admin.generateLink({
                  type: 'magiclink',
                  email: normalizedClientEmail,
                  options: { redirectTo: redirectUrl },
                });
              if (!magicLinkError && magicLinkData?.properties?.action_link) {
                magicLink = magicLinkData.properties.action_link;
              }
            } else {
              const { data: recoveryData, error: recoveryError } =
                await supabaseAdmin.auth.admin.generateLink({
                  type: 'recovery',
                  email: normalizedClientEmail,
                  options: { redirectTo: redirectUrl },
                });
              if (!recoveryError && recoveryData?.properties?.action_link) {
                magicLink = rewriteRecoveryRedirectTo(recoveryData.properties.action_link, origin);
              }
            }
          }
        } else {
          console.error('[API/admin/resources/resend] createUser error:', createUserError);
        }
      }
    }

    if (!magicLink) {
      return NextResponse.json({ error: 'Fehler beim Generieren des Zugangslinks' }, { status: 500 });
    }

    const userForFlag = await findUserByEmail(supabaseAdmin, normalizedClientEmail);
    const isNewUser = !userForFlag || userForFlag.user_metadata?.password_set !== true;

    const { sendResourceReadyEmail } = await import('@/lib/email');
    const resourceNames = resources.map(
      (r: any) => r.title || r.resource_figure?.name || 'Unbenannte Ressource'
    );

    const emailResult = await sendResourceReadyEmail({
      to: normalizedClientEmail,
      resourceNames,
      magicLink,
      isNewUser,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'E-Mail konnte nicht versendet werden', details: emailResult.error },
        { status: 500 }
      );
    }

    try {
      const { sendAdminConfirmationEmail } = await import('@/lib/email');
      const adminEmailsList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      const primaryAdminEmail = adminEmailsList[0] || 'safe@ressourcen.app';

      await sendAdminConfirmationEmail({
        to: primaryAdminEmail,
        clientEmail: normalizedClientEmail,
        resourceNames,
        success: true,
      });
    } catch (adminEmailError: unknown) {
      console.error('[API/admin/resources/resend] admin confirmation:', adminEmailError);
    }

    return NextResponse.json({
      success: true,
      message: 'E-Mail wurde erfolgreich erneut versendet',
      resourceId: resources[0].id,
      clientEmail: normalizedClientEmail,
      resourceName: resourceNames[0],
      resourceCount: resourceNames.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API/admin/resources/resend] Error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler', details: message }, { status: 500 });
  }
}
