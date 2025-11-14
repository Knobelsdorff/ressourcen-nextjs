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
    const audioFile = formData.get('audioFile') as File;
    const resourceName = formData.get('resourceName') as string;
    const clientEmail = formData.get('clientEmail') as string | null;

    // Validierung
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Keine Audio-Datei bereitgestellt' },
        { status: 400 }
      );
    }

    // Akzeptiere WebM, MP3, MP4, OGG
    const allowedTypes = ['.webm', '.mp3', '.mp4', '.ogg', '.m4a'];
    const fileExtension = audioFile.name.toLowerCase().substring(audioFile.name.lastIndexOf('.'));
    
    if (!allowedTypes.some(type => audioFile.name.toLowerCase().endsWith(type))) {
      return NextResponse.json(
        { error: 'Nur Audio-Dateien (WebM, MP3, MP4, OGG, M4A) sind erlaubt' },
        { status: 400 }
      );
    }

    if (!resourceName || !resourceName.trim()) {
      return NextResponse.json(
        { error: 'Bitte gib einen Namen für die Ressource ein' },
        { status: 400 }
      );
    }

    // Verwende Admin Client für Storage Upload (umgeht RLS)
    const supabaseAdmin = await createServerAdminClient();

    // Generiere eindeutigen Dateinamen
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const sanitizedResourceName = resourceName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `client_${sanitizedResourceName}_${timestamp}_${randomId}${fileExtension}`;

    // Konvertiere File zu ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();

    // Bestimme Content-Type
    let contentType = 'audio/webm';
    if (fileExtension === '.mp3') contentType = 'audio/mpeg';
    else if (fileExtension === '.mp4' || fileExtension === '.m4a') contentType = 'audio/mp4';
    else if (fileExtension === '.ogg') contentType = 'audio/ogg';

    // Upload zu Supabase Storage (audio-files Bucket)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('audio-files')
      .upload(fileName, arrayBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Fehler beim Hochladen der Audio-Datei', details: uploadError.message },
        { status: 500 }
      );
    }

    // Hole öffentliche URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('audio-files')
      .getPublicUrl(fileName);

    // Bestimme user_id: Wenn clientEmail vorhanden, dann null (pending), sonst Admin-ID
    const userIdForResource = clientEmail?.trim() ? null : user.id;
    const normalizedClientEmail = clientEmail?.trim().toLowerCase() || null;

    // Speichere in Datenbank (saved_stories)
    // Verwende Admin Client um RLS zu umgehen
    const { data: dbData, error: dbError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .insert({
        user_id: userIdForResource, // null wenn clientEmail vorhanden, sonst Admin-ID
        title: resourceName.trim(),
        content: null, // Audio-only, kein Text
        resource_figure: {
          id: `custom_${sanitizedResourceName}`,
          name: resourceName.trim(),
          category: 'custom' // Custom Ressource
        },
        question_answers: [], // Keine Fragen für manuelle Ressourcen
        audio_url: publicUrl,
        voice_id: null, // Keine generierte Stimme
        is_audio_only: true,
        client_email: normalizedClientEmail
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Versuche Datei aus Storage zu löschen, wenn DB-Insert fehlschlägt
      try {
        await supabaseAdmin.storage.from('audio-files').remove([fileName]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Ressource', details: dbError.message },
        { status: 500 }
      );
    }

    // Track Resource Creation Event (auch für Audio-only Ressourcen)
    // WICHTIG: Tracke mit der User-ID des Klienten (falls vorhanden) oder Admin-User
    if (dbData && dbData.id) {
      try {
        // Bestimme user_id für Tracking:
        // - Wenn clientEmail vorhanden und User existiert: verwende Klienten-User-ID
        // - Sonst: verwende Admin-User-ID
        let trackingUserId = user.id; // Standard: Admin-User
        
        if (normalizedClientEmail) {
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const clientUser = existingUsers?.users.find(u => u.email?.toLowerCase() === normalizedClientEmail);
          if (clientUser) {
            trackingUserId = clientUser.id;
          }
        }
        
        // Tracke direkt in der Datenbank (umgeht RLS mit Service Role)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PRIVATE_SUPABASE_SERVICE_KEY;
        if (serviceRoleKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const trackingSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          );
          
          const { error: trackError } = await (trackingSupabase as any)
            .from('user_analytics')
            .insert({
              user_id: trackingUserId,
              event_type: 'resource_created',
              story_id: dbData.id,
              resource_figure_name: resourceName.trim(),
              voice_id: null, // Audio-only, keine generierte Stimme
            });
          
          if (trackError) {
            console.error('Failed to track resource_created event:', trackError);
          } else {
            console.log('Resource creation event tracked successfully for:', resourceName.trim());
          }
        }
      } catch (trackError) {
        console.error('Error tracking resource creation:', trackError);
        // Nicht kritisch - Ressource wurde bereits gespeichert
      }
    }

    // Wenn clientEmail vorhanden, sende benutzerdefinierte Email mit Magic-Link
    if (normalizedClientEmail) {
      try {
        // Prüfe ob User bereits existiert
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers?.users.find(u => u.email?.toLowerCase() === normalizedClientEmail);

        // Bestimme origin aus Request-URL (zuverlässiger als Header)
        const requestUrl = new URL(request.url);
        let origin = requestUrl.origin;
        
        // Fallback: Prüfe Header falls origin nicht aus URL bestimmbar
        if (!origin || origin === 'null') {
          const headersList = await request.headers;
          origin = headersList.get('origin') || 
                   headersList.get('referer')?.split('/').slice(0, 3).join('/') || 
                   'http://localhost:3000';
        }
        
        // Für localhost: Stelle sicher, dass Port 3000 verwendet wird
        if (origin.includes('localhost') && !origin.includes(':')) {
          origin = 'http://localhost:3000';
        } else if (origin.includes('localhost') && !origin.includes(':3000')) {
          // Ersetze Port falls vorhanden
          origin = origin.replace(/:\d+/, ':3000');
        }
        
        console.log('[API/resources/client/create] Determined origin:', origin);
        const redirectUrl = `${origin}/dashboard?resource=${dbData.id}`;
        console.log('[API/resources/client/create] Redirect URL:', redirectUrl);
        
        let magicLink: string | null = null;
        
        if (userExists) {
          // User existiert bereits - generiere Magic Link für Login
          // Füge resource_id zu user_metadata hinzu, damit es im JWT Token verfügbar ist
          await supabaseAdmin.auth.admin.updateUserById(
            userExists.id,
            {
              user_metadata: {
                ...userExists.user_metadata,
                resource_id: dbData.id,
                resource_name: resourceName.trim(),
                message: 'Deine Ressource ist bereit!'
              }
            }
          );
          
          const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedClientEmail,
            options: {
              redirectTo: redirectUrl,
              // Stelle sicher, dass redirectTo verwendet wird, auch wenn Site URL anders ist
            }
          });
          
          console.log('[API/resources/client/create] Magic link generated:', {
            hasLink: !!magicLinkData?.properties?.action_link,
            linkPreview: magicLinkData?.properties?.action_link?.substring(0, 100) + '...',
            redirectTo: redirectUrl
          });

          if (magicLinkError) {
            console.error('Error generating magic link:', magicLinkError);
            // Fehler ist nicht kritisch - Ressource wurde gespeichert
          } else if (magicLinkData?.properties?.action_link) {
            magicLink = magicLinkData.properties.action_link;
            console.log('Magic link generated for existing user:', normalizedClientEmail);
          }
        } else {
          // User existiert nicht - erstelle User ohne Email-Bestätigung
          const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedClientEmail,
            email_confirm: true, // Email sofort bestätigt
            user_metadata: {
              resource_id: dbData.id,
              resource_name: resourceName.trim(),
              message: 'Deine Ressource ist bereit!'
            }
          });

          if (createUserError) {
            console.error('Error creating user:', createUserError);
            // Fehler ist nicht kritisch - Ressource wurde gespeichert
          } else if (newUser.user) {
            // Generiere Magic Link für neuen User
            const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: normalizedClientEmail,
              options: {
                redirectTo: redirectUrl,
              }
            });
            
            console.log('[API/resources/client/create] Magic link generated for new user:', {
              hasLink: !!magicLinkData?.properties?.action_link,
              linkPreview: magicLinkData?.properties?.action_link?.substring(0, 100) + '...',
              redirectTo: redirectUrl
            });

            if (magicLinkError) {
              console.error('Error generating magic link for new user:', magicLinkError);
            } else if (magicLinkData?.properties?.action_link) {
              magicLink = magicLinkData.properties.action_link;
              console.log('Magic link generated for new user:', normalizedClientEmail);
            }
          }
        }

        // Sende benutzerdefinierte Email mit Magic Link (falls vorhanden)
        if (magicLink) {
          try {
            console.log('[API/resources/client/create] Attempting to send email to:', normalizedClientEmail);
            console.log('[API/resources/client/create] Magic link available:', !!magicLink);
            console.log('[API/resources/client/create] Resource name:', resourceName.trim());
            
            const { sendResourceReadyEmail } = await import('@/lib/email');
            const emailResult = await sendResourceReadyEmail({
              to: normalizedClientEmail,
              resourceNames: [resourceName.trim()],
              magicLink: magicLink,
            });

            if (emailResult.success) {
              console.log('[API/resources/client/create] ✅ Resource ready email sent successfully to:', normalizedClientEmail);
            } else {
              console.error('[API/resources/client/create] ❌ Failed to send resource ready email:', emailResult.error);
              // Fehler ist nicht kritisch - Magic Link wurde generiert
            }
          } catch (emailError: any) {
            console.error('[API/resources/client/create] ❌ Error sending custom email:', emailError);
            console.error('[API/resources/client/create] Error details:', {
              message: emailError?.message,
              stack: emailError?.stack,
            });
            // Fehler ist nicht kritisch - Magic Link wurde generiert
          }
        } else {
          console.warn('[API/resources/client/create] ⚠️ No magic link generated, cannot send email to:', normalizedClientEmail);
        }
      } catch (emailError: any) {
        console.error('Error processing email for client:', emailError);
        // Fehler ist nicht kritisch - Ressource wurde gespeichert
        // Admin kann später manuell eine Email senden
      }
    }

    return NextResponse.json({
      success: true,
      resource: dbData,
      audioUrl: publicUrl,
      emailSent: !!normalizedClientEmail,
    });
  } catch (error: any) {
    console.error('Client resource creation API error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}

