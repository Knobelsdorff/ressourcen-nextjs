import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';

export async function POST(request: NextRequest) {
  // WICHTIG: Log immer am Anfang um zu sehen ob Track-Endpoint aufgerufen wird
  console.log('=== Analytics Track API called ===');
  
  // Debug: Prüfe Umgebungsvariablen
  console.log('Analytics Track API: Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasPrivateServiceKey: !!process.env.PRIVATE_SUPABASE_SERVICE_KEY,
    serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    privateServiceKeyLength: process.env.PRIVATE_SUPABASE_SERVICE_KEY?.length || 0,
  });
  
  try {
    const body = await request.json();
    const { eventType, storyId, resourceFigureName, voiceId, metadata } = body;
    
    console.log('Analytics Track API: Received event:', {
      eventType,
      storyId,
      resourceFigureName,
      voiceId,
      hasMetadata: !!metadata,
    });

    // Validierung
    if (!eventType) {
      return NextResponse.json(
        { error: 'eventType is required' },
        { status: 400 }
      );
    }

    // Verwende request.cookies statt cookies() aus next/headers
    // Das ist konsistent mit der Middleware und funktioniert besser mit Supabase SSR
    const allCookies = request.cookies.getAll();
    const cookieHeader = request.headers.get('cookie');
    
    // Debug: Log Cookies (immer loggen)
    console.log('Analytics Track API: Received cookies:', allCookies.length, 'cookies');
    console.log('Analytics Track API: Cookie names:', allCookies.map(c => c.name).join(', '));
    console.log('Analytics Track API: Cookie header present:', !!cookieHeader);
    
    // Sammle Cookies, die gesetzt werden müssen
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSetArray) {
            try {
              cookiesToSetArray.forEach(({ name, value, options }) => {
                request.cookies.set(name, value);
                cookiesToSet.push({ name, value, options });
              });
            } catch {
              // Ignoriere Fehler beim Setzen von Cookies in API Routes
            }
          },
        },
      }
    );

    // Prüfe ob Authorization-Header vorhanden ist (Fallback, falls Cookies nicht funktionieren)
    const authHeader = request.headers.get('authorization');
    console.log('Analytics Track API: Authorization header present:', !!authHeader);
    
    let user = null;
    let authError = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Verwende Token aus Header für Authentifizierung
      const token = authHeader.substring(7);
      try {
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser(token);
        user = userData;
        authError = userError;
        console.log('Analytics Track API: Auth via Bearer token - success:', !!user);
      } catch (err: any) {
        authError = err;
        console.log('Analytics Track API: Auth via Bearer token - error:', err.message);
      }
    } else {
      // WICHTIG: Verwende getUser() direkt, wie in der Middleware
      // Do not run code between createServerClient and supabase.auth.getUser()
      const result = await supabase.auth.getUser();
      user = result.data.user;
      authError = result.error;
      console.log('Analytics Track API: Auth via cookies - success:', !!user);
    }

    // Debug: Log Auth-Status (immer loggen)
    console.log('Analytics Track API: Auth check', {
      hasError: !!authError,
      errorMessage: authError?.message,
      hasUser: !!user,
      userEmail: user?.email,
      cookieCount: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
    });

    if (authError || !user) {
      const errorResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      // Setze Cookies in der Response
      cookiesToSet.forEach(({ name, value, options }) => {
        errorResponse.cookies.set(name, value, options);
      });
      return errorResponse;
    }

    // Debug: Log erfolgreiche Auth (immer loggen)
    console.log('Analytics Track API: User authenticated:', user.id, 'Event:', eventType);

    // WICHTIG: Verwende IMMER Service Role Key für das INSERT, da User bereits authentifiziert ist
    // Das umgeht RLS-Probleme komplett
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PRIVATE_SUPABASE_SERVICE_KEY;
    const serviceRoleKeyLength = serviceRoleKey ? serviceRoleKey.length : 0;
    console.log('Analytics Track API: Service Role Key check:', {
      hasServiceRoleKey: !!serviceRoleKey,
      serviceRoleKeyLength: serviceRoleKeyLength,
      hasAuthHeader: !!authHeader,
      authHeaderStartsBearer: authHeader?.startsWith('Bearer '),
      envKeys: Object.keys(process.env).filter(k => k.includes('SERVICE') || k.includes('SUPABASE')).join(', '),
    });
    
    if (serviceRoleKey && serviceRoleKey.length > 0) {
      // Verwende IMMER Service Role Client für INSERT (umgeht RLS)
      // Das ist sicher, da User bereits authentifiziert wurde
      const adminSupabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      );
      
      console.log('Analytics Track API: Inserting event with service role client (bypassing RLS)...');
      // user_analytics ist nicht in den generierten Typen, existiert aber in der DB
      const { data, error } = await (adminSupabase as any)
          .from('user_analytics')
          .insert({
            user_id: user.id,
            event_type: eventType,
            story_id: storyId || null,
            resource_figure_name: resourceFigureName || null,
            voice_id: voiceId || null,
            metadata: metadata || {},
          })
          .select()
          .single();
        
        if (error) {
          console.error('Analytics Track API: Error inserting event:', {
            error: (error as any)?.message,
            code: (error as any)?.code,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
          });
          return NextResponse.json(
            { error: 'Failed to track event', details: (error as any)?.message },
            { status: 500 }
          );
        }

        console.log('Analytics Track API: Event successfully saved:', {
          id: data?.id,
          eventType: data?.event_type,
          userId: data?.user_id,
        });

        const successResponse = NextResponse.json(
          { success: true, data }
        );
        
        // Setze Cookies in der Response
        cookiesToSet.forEach(({ name, value, options }) => {
          successResponse.cookies.set(name, value, options);
        });
        
        return successResponse;
    } else {
      // Service Role Key nicht verfügbar - Fehler zurückgeben
      console.error('Analytics Track API: Service Role Key not configured!');
      console.error('Analytics Track API: SUPABASE_SERVICE_ROLE_KEY or PRIVATE_SUPABASE_SERVICE_KEY must be set');
      return NextResponse.json(
        { 
          error: 'Service Role Key not configured',
          details: 'SUPABASE_SERVICE_ROLE_KEY environment variable is required for tracking events'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in analytics track:', error);
    return NextResponse.json(
      { error: (error as any)?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

