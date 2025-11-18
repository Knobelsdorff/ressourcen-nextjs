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

    // Parse FormData
    const formData = await request.formData();
    const clientEmail = formData.get('clientEmail') as string | null;
    
    if (!clientEmail || !clientEmail.trim()) {
      return NextResponse.json(
        { error: 'Klienten-Email ist erforderlich' },
        { status: 400 }
      );
    }

    const normalizedClientEmail = clientEmail.trim().toLowerCase();

    // Parse alle Ressourcen aus FormData
    const resources: Array<{ name: string; audioFile: File }> = [];
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

    if (resources.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens eine Ressource ist erforderlich' },
        { status: 400 }
      );
    }

    console.log(`[API/resources/client/create-batch] Processing ${resources.length} resources for ${normalizedClientEmail}`);

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
    
    if (origin.includes('localhost') && !origin.includes(':')) {
      origin = 'http://localhost:3000';
    } else if (origin.includes('localhost') && !origin.includes(':3000')) {
      origin = origin.replace(/:\d+/, ':3000');
    }

    const createdResources: any[] = [];
    const errors: Array<{ resourceName: string; error: string }> = [];

    // Verarbeite alle Ressourcen
    for (const resource of resources) {
      try {
        // Validierung
        const allowedTypes = ['.webm', '.mp3', '.mp4', '.ogg', '.m4a'];
        const fileExtension = resource.audioFile.name.toLowerCase().substring(resource.audioFile.name.lastIndexOf('.'));
        
        if (!allowedTypes.some(type => resource.audioFile.name.toLowerCase().endsWith(type))) {
          errors.push({
            resourceName: resource.name,
            error: 'Nur Audio-Dateien (WebM, MP3, MP4, OGG, M4A) sind erlaubt'
          });
          continue;
        }

        // Generiere eindeutigen Dateinamen
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const sanitizedResourceName = resource.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const fileName = `client_${sanitizedResourceName}_${timestamp}_${randomId}${fileExtension}`;

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
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('audio-files')
          .getPublicUrl(fileName);

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
          // Versuche Datei aus Storage zu löschen
          try {
            await supabaseAdmin.storage.from('audio-files').remove([fileName]);
          } catch (cleanupError) {
            console.error('Failed to cleanup uploaded file:', cleanupError);
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

        const redirectUrl = `${origin}/dashboard?resource=${createdResources[0].id}`;
        
        let magicLink: string | null = null;
        
        if (userExists) {
          // User existiert bereits - generiere Magic Link für Login
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
          
          const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedClientEmail,
            options: {
              redirectTo: redirectUrl,
            }
          });

          if (!magicLinkError && magicLinkData?.properties?.action_link) {
            magicLink = magicLinkData.properties.action_link;
          }
        } else {
          // User existiert nicht - erstelle User
          const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedClientEmail,
            email_confirm: true,
            user_metadata: {
              resource_id: createdResources[0].id,
              resource_name: `${createdResources.length} Ressourcen`,
              message: `Du hast ${createdResources.length} neue Ressourcen!`
            }
          });

          if (!createUserError && newUser.user) {
            const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: normalizedClientEmail,
              options: {
                redirectTo: redirectUrl,
              }
            });

            if (!magicLinkError && magicLinkData?.properties?.action_link) {
              magicLink = magicLinkData.properties.action_link;
            }
          }
        }

        // Sende Email mit Magic Link
        if (magicLink) {
          try {
            const { sendResourceReadyEmail } = await import('@/lib/email');
            // Sammle alle Ressourcennamen
            const resourceNames = createdResources.map((r: any) => r.title || r.resource_figure?.name || 'Unbenannte Ressource');
            const emailResult = await sendResourceReadyEmail({
              to: normalizedClientEmail,
              resourceNames: resourceNames,
              magicLink: magicLink,
            });

            if (emailResult.success) {
              console.log(`[API/resources/client/create-batch] ✅ Email sent successfully to: ${normalizedClientEmail}`);
              
              // Sende Bestätigungs-Email an Admin
              try {
                const { sendAdminConfirmationEmail } = await import('@/lib/email');
                const adminEmail = user.email; // Admin-Email aus Session
                if (adminEmail) {
                  const adminConfirmationResult = await sendAdminConfirmationEmail({
                    to: adminEmail,
                    clientEmail: normalizedClientEmail,
                    resourceNames: resourceNames,
                    success: true,
                  });
                  
                  if (adminConfirmationResult.success) {
                    console.log(`[API/resources/client/create-batch] ✅ Admin confirmation email sent to: ${adminEmail}`);
                  } else {
                    console.error(`[API/resources/client/create-batch] ❌ Failed to send admin confirmation:`, adminConfirmationResult.error);
                  }
                }
              } catch (adminEmailError: any) {
                console.error('[API/resources/client/create-batch] Error sending admin confirmation email:', adminEmailError);
                // Fehler ist nicht kritisch
              }
            } else {
              console.error(`[API/resources/client/create-batch] ❌ Failed to send email:`, emailResult.error);
              
              // Sende Fehler-Bestätigung an Admin
              try {
                const { sendAdminConfirmationEmail } = await import('@/lib/email');
                const adminEmail = user.email;
                if (adminEmail) {
                  await sendAdminConfirmationEmail({
                    to: adminEmail,
                    clientEmail: normalizedClientEmail,
                    resourceNames: resourceNames,
                    success: false,
                    error: emailResult.error,
                  });
                }
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

