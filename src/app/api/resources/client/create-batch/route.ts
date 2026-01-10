import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * Prüft ob der aktuelle User ein Admin ist (Full Admin oder Music Admin)
 */
function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const musicAdminEmails = (process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase()) || 
         musicAdminEmails.includes(email.toLowerCase());
}

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

    // Prüfe Content-Type: JSON (neue Methode) oder FormData (alte Methode)
    const contentType = request.headers.get('content-type') || '';
    let clientEmail: string | null = null;
    let resources: Array<{ name: string; audioFile?: File; audioUrl?: string }> = [];

    if (contentType.includes('application/json')) {
      // Neue Methode: JSON mit bereits hochgeladenen URLs
      const body = await request.json();
      clientEmail = body.clientEmail;
      resources = (body.resources || []).map((r: any) => ({
        name: r.name,
        audioUrl: r.audioUrl,
      }));
    } else {
      // Alte Methode: FormData mit Dateien
      const formData = await request.formData();
      clientEmail = formData.get('clientEmail') as string | null;
      
      // Parse alle Ressourcen aus FormData
      let resourceIndex = 0;
      while (true) {
        const resourceName = formData.get(`resourceName_${resourceIndex}`) as string | null;
        const audioFile = formData.get(`audioFile_${resourceIndex}`) as File | null;
        
        if (!resourceName || !audioFile) {
          break; // Keine weiteren Ressourcen
        }
        
        resources.push({
          name: resourceName.trim(),
          audioFile: audioFile,
        });
        
        resourceIndex++;
      }
    }
    
    if (!clientEmail || !clientEmail.trim()) {
      return NextResponse.json(
        { error: 'Klienten-Email ist erforderlich' },
        { status: 400 }
      );
    }

    const normalizedClientEmail = clientEmail.trim().toLowerCase();

    if (resources.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens eine Ressource ist erforderlich' },
        { status: 400 }
      );
    }

    console.log(`[API/resources/client/create-batch] Processing ${resources.length} resources for ${normalizedClientEmail} (method: ${contentType.includes('application/json') ? 'JSON' : 'FormData'})`);

    // Verwende Admin Client für Storage Upload (umgeht RLS)
    const supabaseAdmin = await createServerAdminClient();

    // Bestimme origin aus Request-URL
    const requestUrl = new URL(request.url);
    let origin = requestUrl.origin;

    if (!origin || origin === 'null') {
      const headersList = await request.headers;
      origin = headersList.get('origin') ||
               headersList.get('referer')?.split('/').slice(0, 3).join('/') ||
               'http://localhost:3000';
    }

    // Normalisiere localhost URLs
    if (origin.includes('localhost') && !origin.includes(':')) {
      origin = 'http://localhost:3000';
    } else if (origin.includes('localhost') && !origin.includes(':3000')) {
      origin = origin.replace(/:\d+/, ':3000');
    }

    console.log('[API/resources/client/create-batch] Detected origin:', origin);

    const createdResources: any[] = [];
    const errors: Array<{ resourceName: string; error: string }> = [];

    // Verarbeite alle Ressourcen
    for (const resource of resources) {
      try {
        // Sanitize Resource Name (wird für beide Pfade benötigt)
        const sanitizedResourceName = resource.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        let publicUrl: string;
        let fileName: string | null = null; // Für Cleanup bei Fehlern

        // Neue Methode: URL ist bereits vorhanden (direkter Upload vom Client)
        if (resource.audioUrl) {
          publicUrl = resource.audioUrl;
          console.log(`[API/resources/client/create-batch] Using provided URL for ${resource.name}`);
        } 
        // Alte Methode: Datei hochladen
        else if (resource.audioFile) {
          // Validierung
          const allowedTypes = ['.webm', '.mp3', '.mp4', '.ogg', '.m4a'];
          const fileExtension = resource.audioFile.name.toLowerCase().substring(resource.audioFile.name.lastIndexOf('.'));
          
          if (!allowedTypes.some(type => resource.audioFile!.name.toLowerCase().endsWith(type))) {
            errors.push({
              resourceName: resource.name,
              error: 'Nur Audio-Dateien (WebM, MP3, MP4, OGG, M4A) sind erlaubt'
            });
            continue;
          }

          // Generiere eindeutigen Dateinamen
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substr(2, 9);
          fileName = `client_${sanitizedResourceName}_${timestamp}_${randomId}${fileExtension}`;

          // Konvertiere File zu ArrayBuffer
          const arrayBuffer = await resource.audioFile.arrayBuffer();

          // Bestimme Content-Type
          let contentType = 'audio/webm';
          if (fileExtension === '.mp3') contentType = 'audio/mpeg';
          else if (fileExtension === '.mp4' || fileExtension === '.m4a') contentType = 'audio/mp4';
          else if (fileExtension === '.ogg') contentType = 'audio/ogg';

          // Upload zu Supabase Storage
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('audio-files')
            .upload(fileName, arrayBuffer, {
              contentType,
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error(`[API/resources/client/create-batch] Storage upload error for ${resource.name}:`, uploadError);
            errors.push({
              resourceName: resource.name,
              error: 'Fehler beim Hochladen der Audio-Datei'
            });
            continue;
          }

          // Hole öffentliche URL
          const { data: { publicUrl: uploadedUrl } } = supabaseAdmin.storage
            .from('audio-files')
            .getPublicUrl(fileName);
          
          publicUrl = uploadedUrl;
        } else {
          errors.push({
            resourceName: resource.name,
            error: 'Keine Audio-Datei oder URL angegeben'
          });
          continue;
        }

        // Speichere in Datenbank
        const { data: dbData, error: dbError } = await (supabaseAdmin as any)
          .from('saved_stories')
          .insert({
            user_id: null, // Pending - wird dem Klienten zugeordnet
            title: resource.name.trim(),
            content: null,
            resource_figure: {
              id: `custom_${sanitizedResourceName}`,
              name: resource.name.trim(),
              category: 'custom'
            },
            question_answers: [],
            audio_url: publicUrl,
            voice_id: null,
            is_audio_only: true,
            client_email: normalizedClientEmail
          })
          .select()
          .single();

        if (dbError) {
          console.error(`[API/resources/client/create-batch] Database insert error for ${resource.name}:`, dbError);
          // Versuche Datei aus Storage zu löschen (nur wenn Datei hochgeladen wurde, nicht bei direkter URL)
          if (fileName) {
            try {
              await supabaseAdmin.storage.from('audio-files').remove([fileName]);
            } catch (cleanupError) {
              console.error('Failed to cleanup uploaded file:', cleanupError);
            }
          }
          errors.push({
            resourceName: resource.name,
            error: 'Fehler beim Speichern der Ressource'
          });
          continue;
        }

        createdResources.push(dbData);
        console.log(`[API/resources/client/create-batch] ✅ Created resource: ${resource.name}`);
      } catch (error: any) {
        console.error(`[API/resources/client/create-batch] Error processing resource ${resource.name}:`, error);
        errors.push({
          resourceName: resource.name,
          error: error.message || 'Unbekannter Fehler'
        });
      }
    }

    // Wenn Ressourcen erstellt wurden, sende Email mit Magic Link
    if (createdResources.length > 0) {
      try {
        // Prüfe ob User bereits existiert
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers?.users.find(u => u.email?.toLowerCase() === normalizedClientEmail);

        // All links redirect to dashboard - middleware will handle password check
        const redirectUrl = `${origin}/dashboard?resource=${createdResources[0].id}`;

        console.log('[API/resources/client/create-batch] Redirect URL:', {
          redirectUrl,
          origin
        });

        let magicLink: string | null = null;

        if (userExists) {
          // User existiert bereits
          // Prüfe ob User schon ein Passwort gesetzt hat
          const hasPasswordSet = userExists.user_metadata?.password_set === true;

          // Update User Metadata
          await supabaseAdmin.auth.admin.updateUserById(
            userExists.id,
            {
              user_metadata: {
                ...userExists.user_metadata,
                resource_id: createdResources[0].id,
                resource_name: `${createdResources.length} Ressourcen`,
                message: `Du hast ${createdResources.length} neue Ressourcen!`
              }
            }
          );

          if (hasPasswordSet) {
            // User hat bereits ein Passwort - normale Magic Link für Login
            const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: normalizedClientEmail,
              options: {
                redirectTo: redirectUrl,
              }
            });

            if (!magicLinkError && magicLinkData?.properties?.action_link) {
              magicLink = magicLinkData.properties.action_link;
              console.log('[API/resources/client/create-batch] Magic link generated for existing user with password');
            } else {
              console.error('[API/resources/client/create-batch] Error generating magic link:', magicLinkError);
            }
          } else {
            // User existiert aber hat kein Passwort - sende Recovery Link
            // Recovery link geht zu dashboard, middleware fängt ab und redirected zu set-password
            const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: normalizedClientEmail,
              options: {
                redirectTo: redirectUrl,
              }
            });

            if (!recoveryError && recoveryData?.properties?.action_link) {
              magicLink = recoveryData.properties.action_link;

              // Fix: Replace production URL with correct origin in the redirect_to parameter
              const linkUrl = new URL(magicLink);
              const currentRedirectTo = linkUrl.searchParams.get('redirect_to');
              if (currentRedirectTo) {
                // Replace any production URL with the current origin
                const newRedirectTo = currentRedirectTo.replace(/https:\/\/[^\/]+/, origin);
                linkUrl.searchParams.set('redirect_to', newRedirectTo);
                magicLink = linkUrl.toString();
              }

              console.log('[API/resources/client/create-batch] Recovery link generated for existing user without password');
              console.log('[API/resources/client/create-batch] Modified redirect_to:', linkUrl.searchParams.get('redirect_to'));
            } else {
              console.error('[API/resources/client/create-batch] Error generating recovery link:', recoveryError);
            }
          }
        } else {
          // User existiert nicht - erstelle neuen User ohne Passwort
          const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedClientEmail,
            email_confirm: true,
            user_metadata: {
              resource_id: createdResources[0].id,
              resource_name: `${createdResources.length} Ressourcen`,
              message: `Du hast ${createdResources.length} neue Ressourcen!`,
              password_set: false, // Markiere dass Passwort noch nicht gesetzt wurde
            }
          });

          if (!createUserError && newUser.user) {
            // Generiere Recovery Link - geht zu dashboard, middleware redirected zu set-password
            const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: normalizedClientEmail,
              options: {
                redirectTo: redirectUrl,
              }
            });

            if (!recoveryError && recoveryData?.properties?.action_link) {
              magicLink = recoveryData.properties.action_link;

              // Fix: Replace production URL with correct origin in the redirect_to parameter
              const linkUrl = new URL(magicLink);
              const currentRedirectTo = linkUrl.searchParams.get('redirect_to');
              if (currentRedirectTo) {
                // Replace any production URL with the current origin
                const newRedirectTo = currentRedirectTo.replace(/https:\/\/[^\/]+/, origin);
                linkUrl.searchParams.set('redirect_to', newRedirectTo);
                magicLink = linkUrl.toString();
              }

              console.log('[API/resources/client/create-batch] Recovery link generated for new user');
              console.log('[API/resources/client/create-batch] Modified redirect_to:', linkUrl.searchParams.get('redirect_to'));
            } else {
              console.error('[API/resources/client/create-batch] Error generating recovery link:', recoveryError);
            }
          } else {
            console.error('[API/resources/client/create-batch] Error creating new user:', createUserError);
          }
        }

        // Sende Email mit Magic Link
        if (magicLink) {
          try {
            const { sendResourceReadyEmail } = await import('@/lib/email');
            // Sammle alle Ressourcennamen
            const resourceNames = createdResources.map((r: any) => r.title || r.resource_figure?.name || 'Unbenannte Ressource');

            // Bestimme ob User neu ist (kein Passwort gesetzt hat)
            const isNewUser = !userExists || userExists.user_metadata?.password_set !== true;

            // Log magic link for testing (especially useful on localhost)
            console.log('\n========================================');
            console.log('🔗 MAGIC LINK FOR TESTING:');
            console.log('========================================');
            console.log('Email:', normalizedClientEmail);
            console.log('Is New User:', isNewUser);
            console.log('Link:', magicLink);
            console.log('========================================\n');

            const emailResult = await sendResourceReadyEmail({
              to: normalizedClientEmail,
              resourceNames: resourceNames,
              magicLink: magicLink,
              isNewUser: isNewUser,
            });

            if (emailResult.success) {
              console.log(`[API/resources/client/create-batch] ✅ Email sent successfully to: ${normalizedClientEmail}`);
              
              // Sende Bestätigungs-Email an Admin
              try {
                const { sendAdminConfirmationEmail } = await import('@/lib/email');
                
                // Verwende feste Admin-E-Mail-Adresse aus Umgebungsvariable oder Session-E-Mail als Fallback
                const adminEmailsList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
                const primaryAdminEmail = adminEmailsList[0] || 'safe@ressourcen.app'; // Fallback zu safe@ressourcen.app
                const sessionAdminEmail = user.email; // Session-E-Mail als zusätzliche Info
                
                console.log(`[API/resources/client/create-batch] 📧 Sending admin confirmation to: ${primaryAdminEmail} (session: ${sessionAdminEmail})`);
                
                // Sende an primäre Admin-E-Mail
                const adminConfirmationResult = await sendAdminConfirmationEmail({
                  to: primaryAdminEmail,
                  clientEmail: normalizedClientEmail,
                  resourceNames: resourceNames,
                  success: true,
                });
                
                if (adminConfirmationResult.success) {
                  console.log(`[API/resources/client/create-batch] ✅ Admin confirmation email sent successfully to: ${primaryAdminEmail}`);
                } else {
                  console.error(`[API/resources/client/create-batch] ❌ Failed to send admin confirmation to ${primaryAdminEmail}:`, adminConfirmationResult.error);
                  
                  // Fallback: Versuche Session-E-Mail, wenn primäre E-Mail fehlschlägt
                  if (sessionAdminEmail && sessionAdminEmail !== primaryAdminEmail) {
                    console.log(`[API/resources/client/create-batch] 🔄 Trying fallback admin email: ${sessionAdminEmail}`);
                    const fallbackResult = await sendAdminConfirmationEmail({
                      to: sessionAdminEmail,
                      clientEmail: normalizedClientEmail,
                      resourceNames: resourceNames,
                      success: true,
                    });
                    if (fallbackResult.success) {
                      console.log(`[API/resources/client/create-batch] ✅ Admin confirmation email sent to fallback: ${sessionAdminEmail}`);
                    } else {
                      console.error(`[API/resources/client/create-batch] ❌ Fallback admin email also failed:`, fallbackResult.error);
                    }
                  }
                }
              } catch (adminEmailError: any) {
                console.error('[API/resources/client/create-batch] ❌ Error sending admin confirmation email:', adminEmailError);
                // Fehler ist nicht kritisch für den Hauptprozess, aber sollte geloggt werden
              }
            } else {
              console.error(`[API/resources/client/create-batch] ❌ Failed to send email:`, emailResult.error);
              
              // Sende Fehler-Bestätigung an Admin
              try {
                const { sendAdminConfirmationEmail } = await import('@/lib/email');
                
                // Verwende feste Admin-E-Mail-Adresse aus Umgebungsvariable
                const adminEmailsList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
                const primaryAdminEmail = adminEmailsList[0] || 'safe@ressourcen.app';
                
                await sendAdminConfirmationEmail({
                  to: primaryAdminEmail,
                  clientEmail: normalizedClientEmail,
                  resourceNames: resourceNames,
                  success: false,
                  error: emailResult.error,
                });
              } catch (adminEmailError: any) {
                console.error('[API/resources/client/create-batch] Error sending admin error notification:', adminEmailError);
              }
            }
          } catch (emailError: any) {
            console.error('[API/resources/client/create-batch] Error sending email:', emailError);
          }
        }
      } catch (emailError: any) {
        console.error('[API/resources/client/create-batch] Error processing email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      created: createdResources.length,
      total: resources.length,
      errors: errors.length > 0 ? errors : undefined,
      resources: createdResources,
      emailSent: createdResources.length > 0 && !!normalizedClientEmail,
    });
  } catch (error: any) {
    console.error('Client resource batch creation API error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}

