import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * Prüft ob der aktuelle User ein Admin ist
 */
function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
  // WICHTIG: Log immer am Anfang (auch ohne NODE_ENV check) um zu sehen ob API aufgerufen wird
  console.log('=== Admin Analytics API called ===');
  console.log('Request URL:', request.url);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  try {
    // Verwende request.cookies statt cookies() aus next/headers
    // Das ist konsistent mit der Middleware und funktioniert besser mit Supabase SSR
    const allCookies = request.cookies.getAll();
    
    // Prüfe auch Request-Header für Cookies
    const cookieHeader = request.headers.get('cookie');
    
    // Debug: Log alle Cookie-Namen (immer loggen für Debugging)
    console.log('Admin Analytics API: Cookie store count:', allCookies.length);
    console.log('Admin Analytics API: Cookie store names:', allCookies.map(c => c.name).join(', '));
    console.log('Admin Analytics API: Cookie header present:', !!cookieHeader);
    
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
              // Ignoriere Fehler beim Setzen von Cookies
            }
          },
        },
      }
    );

    // Prüfe ob Authorization-Header vorhanden ist (Fallback, falls Cookies nicht funktionieren)
    const authHeader = request.headers.get('authorization');
    
    // Debug: Log Authorization-Header (nur in Development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Admin Analytics API: Authorization header present:', !!authHeader);
      if (authHeader) {
        console.log('Admin Analytics API: Authorization header (first 50 chars):', authHeader.substring(0, 50) + '...');
      }
    }
    
    let user = null;
    let authError = null;
    
    // Versuche zuerst mit Bearer Token, dann mit Cookies
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Verwende Token aus Header für Authentifizierung
      const token = authHeader.substring(7);
      try {
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser(token);
        user = userData;
        authError = userError;
        console.log('Admin Analytics API: Auth via Bearer token', {
          success: !!user,
          userEmail: user?.email,
          error: authError?.message,
        });
      } catch (err: any) {
        authError = err;
        console.log('Admin Analytics API: Auth via Bearer token - exception:', err.message);
      }
    }
    
    // Fallback: Versuche mit Cookies, wenn Bearer Token nicht funktioniert hat
    if (!user || authError) {
      console.log('Admin Analytics API: Trying auth via cookies (fallback)');
      // WICHTIG: Verwende getUser() direkt, wie in der Middleware
      // Do not run code between createServerClient and supabase.auth.getUser()
      // A simple mistake could make it very hard to debug issues with users being randomly logged out.
      const result = await supabase.auth.getUser();
      if (result.data.user) {
        user = result.data.user;
        authError = null; // Reset error if cookies work
        console.log('Admin Analytics API: Auth via cookies - success:', {
          userEmail: user?.email,
        });
      } else {
        authError = result.error;
        console.log('Admin Analytics API: Auth via cookies - error:', {
          error: authError?.message,
          cookieCount: allCookies.length,
          cookieNames: allCookies.map(c => c.name),
        });
      }
    }

    // Debug-Logging (immer loggen für Debugging)
    console.log('Admin Analytics API: Auth check final', {
      hasUser: !!user,
      userEmail: user?.email,
      authError: authError?.message,
      authErrorCode: authError?.code,
      cookieCount: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      hasAuthHeader: !!authHeader,
    });

    if (authError || !user) {
      console.error('Admin Analytics API: Authentication failed', {
        hasUser: !!user,
        authError: authError?.message,
        authErrorCode: authError?.code,
        cookieCount: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
      });
      const errorResponse = NextResponse.json(
        { error: 'Unauthorized', details: process.env.NODE_ENV === 'development' ? authError?.message : undefined },
        { status: 401 }
      );
      // Setze Cookies in der Response
      cookiesToSet.forEach(({ name, value, options }) => {
        errorResponse.cookies.set(name, value, options);
      });
      return errorResponse;
    }

    // Prüfe ob User Admin ist
    if (!isAdminUser(user.email)) {
      console.log('Admin Analytics API: User is not admin', {
        userEmail: user.email,
        adminEmails: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
      });
      const forbiddenResponse = NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
      // Setze Cookies in der Response
      cookiesToSet.forEach(({ name, value, options }) => {
        forbiddenResponse.cookies.set(name, value, options);
      });
      return forbiddenResponse;
    }

    // WICHTIG: Verwende Admin Client (Service Role) um RLS zu umgehen
    // Der Admin Client kann alle Events lesen, unabhängig von RLS Policies
    let adminSupabase;
    try {
      adminSupabase = await createServerAdminClient();
      
      // Debug: Teste ob Admin Client funktioniert (immer loggen)
      // Teste eine einfache Query um zu sehen ob die Tabelle existiert
      // @ts-ignore - user_analytics ist nicht in den generierten Typen, existiert aber in der DB
      const { count, error: countError } = await adminSupabase
        .from('user_analytics')
        .select('*', { count: 'exact', head: true });
      
      console.log('Admin Analytics API: Admin client test', {
        hasAdminClient: !!adminSupabase,
        tableExists: !countError,
        totalEventsInDB: count,
        countError: countError?.message,
        countErrorCode: countError?.code,
        countErrorDetails: countError?.details,
      });
    } catch (adminClientError: any) {
      console.error('Error creating admin client:', adminClientError);
      return NextResponse.json(
        { 
          error: 'Failed to create admin client',
          details: process.env.NODE_ENV === 'development' ? adminClientError.message : undefined,
        },
        { status: 500 }
      );
    }

    // Parse Query-Parameter für Filter
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');

    console.log('Admin Analytics API: Filter parameters:', {
      startDate,
      endDate,
      eventType,
      startDateType: typeof startDate,
      startDateLength: startDate?.length,
      endDateType: typeof endDate,
      endDateLength: endDate?.length,
    });
    
    // Debug: Prüfe ob Datum korrekt formatiert ist
    if (startDate) {
      const testDate = new Date(startDate);
      console.log('Admin Analytics API: startDate parsing test:', {
        input: startDate,
        parsed: testDate.toISOString(),
        isValid: !isNaN(testDate.getTime()),
        year: testDate.getFullYear(),
        month: testDate.getMonth() + 1,
        day: testDate.getDate(),
      });
    }

    // Baue Query auf - Verwende Admin Client für alle Events
    // WICHTIG: Filter müssen VOR dem Select angewendet werden, damit Supabase sie korrekt verarbeitet
    
    // Filter nach Datum
    // WICHTIG: HTML date inputs liefern Format "YYYY-MM-DD" (z.B. "2025-10-01")
    // Konvertiere zu ISO-String mit Zeit für Supabase
    // Deklariere Variablen außerhalb der if-Blöcke, damit sie später verwendet werden können
    let startDateISO: string | null = null;
    let endDateISO: string | null = null;
    
    // WICHTIG: Wenn kein Startdatum gesetzt ist, zeige automatisch die letzten 30 Tage
    // Dies ermöglicht es dem Admin, sofort die Aktivitäten der letzten Wochen zu sehen
    if (!startDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDateISO = new Date(Date.UTC(
        thirtyDaysAgo.getFullYear(),
        thirtyDaysAgo.getMonth(),
        thirtyDaysAgo.getDate(),
        0, 0, 0, 0
      )).toISOString();
      console.log('Admin Analytics API: No startDate provided, using default: last 30 days', {
        defaultStartDate: startDateISO,
        defaultStartDateReadable: thirtyDaysAgo.toISOString().split('T')[0],
      });
    }
    
    if (startDate) {
      if (startDate.includes('T')) {
        // Bereits vollständiges ISO-Format
        startDateISO = startDate;
      } else {
        // Parse "YYYY-MM-DD" Format
        // WICHTIG: new Date("YYYY-MM-DD") interpretiert als UTC 00:00:00
        // Das ist genau was wir wollen!
        const [year, month, day] = startDate.split('-').map(Number);
        if (year && month && day) {
          // Erstelle UTC Date für Beginn des Tages
          startDateISO = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
        } else {
          // Fallback: Versuche mit new Date
          startDateISO = new Date(startDate + 'T00:00:00.000Z').toISOString();
        }
      }
      console.log('Admin Analytics API: Applied startDate filter:', {
        original: startDate,
        converted: startDateISO,
        parsed: new Date(startDateISO).toISOString(),
        queryFilter: `gte('created_at', '${startDateISO}')`,
      });
    }
    if (endDate) {
      if (endDate.includes('T')) {
        // Bereits vollständiges ISO-Format
        endDateISO = endDate;
      } else {
        // Parse "YYYY-MM-DD" Format
        const [year, month, day] = endDate.split('-').map(Number);
        if (year && month && day) {
          // Erstelle UTC Date für Ende des Tages (23:59:59.999)
          endDateISO = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();
        } else {
          // Fallback: Versuche mit new Date
          endDateISO = new Date(endDate + 'T23:59:59.999Z').toISOString();
        }
      }
      console.log('Admin Analytics API: Applied endDate filter:', {
        original: endDate,
        converted: endDateISO,
        parsed: new Date(endDateISO).toISOString(),
        queryFilter: `lte('created_at', '${endDateISO}')`,
      });
    }
    
    // WICHTIG: Lade ALLE Events mit Pagination - KEINE Filterung in der Query
    // Supabase hat ein Standard-Limit, daher müssen wir alle Seiten laden
    // Wir filtern KOMPLETT client-seitig, um sicherzustellen, dass es funktioniert
    console.log('Admin Analytics API: Starting to load ALL events (with pagination, NO filters)...');
    
    let allEvents: any[] = [];
    let page = 0;
    const pageSize = 1000; // Supabase Maximum
    let hasMore = true;
    
    while (hasMore) {
      // WICHTIG: Keine Filter in der Query - lade ALLES
      // range() ist inklusiv: range(0, 999) lädt Events 0-999
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      console.log(`Admin Analytics API: Loading page ${page + 1}, range ${from} to ${to}...`);
      
      // @ts-ignore - user_analytics ist nicht in den generierten Typen, existiert aber in der DB
      const { data: pageEvents, error: pageError } = await adminSupabase
        .from('user_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (pageError) {
        console.error('Admin Analytics API: Error loading events page', page + 1, ':', pageError);
        console.error('Admin Analytics API: Error details:', {
          message: pageError.message,
          code: pageError.code,
          details: pageError.details,
          hint: pageError.hint,
        });
        break;
      }
      
      if (pageEvents && pageEvents.length > 0) {
        allEvents = allEvents.concat(pageEvents);
        console.log(`Admin Analytics API: Loaded page ${page + 1}, ${pageEvents.length} events (total so far: ${allEvents.length})`);
        
        // Zeige Datumsbereich der aktuellen Seite
        if (pageEvents.length > 0) {
          const pageDates = pageEvents.map(e => new Date(e.created_at).toISOString().split('T')[0]);
          const uniquePageDates = Array.from(new Set(pageDates));
          console.log(`Admin Analytics API: Page ${page + 1} date range:`, {
            oldest: pageDates[pageDates.length - 1],
            newest: pageDates[0],
            uniqueDates: uniquePageDates.slice(0, 5),
          });
        }
        
        // Wenn weniger Events als pageSize zurückkommen, haben wir alle
        hasMore = pageEvents.length === pageSize;
        page++;
      } else {
        console.log(`Admin Analytics API: Page ${page + 1} returned no events, stopping pagination`);
        hasMore = false;
      }
      
      // Sicherheit: Maximal 100 Seiten (100.000 Events)
      if (page >= 100) {
        console.warn('Admin Analytics API: Reached maximum page limit (100), stopping pagination');
        hasMore = false;
      }
    }
    
    const events = allEvents;
    const error = null;
    
    // Debug: Zeige Datumsbereich ALLER geladenen Events
    if (events.length > 0) {
      const dates = events.map(e => new Date(e.created_at).getTime());
      const oldestTimestamp = Math.min(...dates);
      const newestTimestamp = Math.max(...dates);
      const oldestDate = new Date(oldestTimestamp);
      const newestDate = new Date(newestTimestamp);
      
      console.log('Admin Analytics API: Finished loading ALL events:', {
        totalEvents: events.length,
        pagesLoaded: page,
        dateRange: {
          oldest: oldestDate.toISOString(),
          newest: newestDate.toISOString(),
          oldestReadable: oldestDate.toISOString().split('T')[0],
          newestReadable: newestDate.toISOString().split('T')[0],
          daysDiff: Math.round((newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24)),
        },
        sampleEvents: events.slice(0, 5).map(e => ({
          id: e.id.substring(0, 8),
          type: e.event_type,
          date: new Date(e.created_at).toISOString().split('T')[0],
          time: new Date(e.created_at).toISOString().split('T')[1],
        })),
      });
    } else {
      console.log('Admin Analytics API: No events found in database');
    }
    
    // WICHTIG: Filtere Events KOMPLETT client-seitig
    // Dies garantiert, dass die Filterung funktioniert, unabhängig von Supabase-Filtern
    let filteredEvents = events || [];
    const beforeAllFilters = filteredEvents.length;
    
    console.log('Admin Analytics API: Starting client-side filtering:', {
      totalEventsBeforeFilter: filteredEvents.length,
      startDateISO: startDateISO || 'none (using default: last 30 days)',
      endDateISO: endDateISO || 'none',
      eventType: eventType || 'none',
    });
    
    // Filter nach Startdatum
    if (startDateISO && filteredEvents.length > 0) {
      const startDateObj = new Date(startDateISO);
      const startTimestamp = startDateObj.getTime();
      const beforeFilter = filteredEvents.length;
      
      filteredEvents = filteredEvents.filter(e => {
        const eventTimestamp = new Date(e.created_at).getTime();
        return eventTimestamp >= startTimestamp;
      });
      
      const afterFilter = filteredEvents.length;
      
      console.log('Admin Analytics API: Applied startDate filter:', {
        beforeFilter,
        afterFilter,
        filteredOut: beforeFilter - afterFilter,
        startDateISO,
        startTimestamp,
        sampleEventsAfterFilter: filteredEvents.slice(0, 3).map(e => ({
          date: new Date(e.created_at).toISOString().split('T')[0],
          timestamp: new Date(e.created_at).getTime(),
          isAfterStart: new Date(e.created_at).getTime() >= startTimestamp,
        })),
      });
    }
    
    // Filter nach Enddatum
    if (endDateISO && filteredEvents.length > 0) {
      const endDateObj = new Date(endDateISO);
      const endTimestamp = endDateObj.getTime();
      const beforeFilter = filteredEvents.length;
      
      filteredEvents = filteredEvents.filter(e => {
        const eventTimestamp = new Date(e.created_at).getTime();
        return eventTimestamp <= endTimestamp;
      });
      
      const afterFilter = filteredEvents.length;
      
      console.log('Admin Analytics API: Applied endDate filter:', {
        beforeFilter,
        afterFilter,
        filteredOut: beforeFilter - afterFilter,
        endDateISO,
        endTimestamp,
      });
    }
    
    // Filter nach EventType
    if (eventType && filteredEvents.length > 0) {
      const beforeFilter = filteredEvents.length;
      filteredEvents = filteredEvents.filter(e => e.event_type === eventType);
      const afterFilter = filteredEvents.length;
      
      console.log('Admin Analytics API: Applied eventType filter:', {
        beforeFilter,
        afterFilter,
        filteredOut: beforeFilter - afterFilter,
        eventType,
      });
    }
    
    console.log('Admin Analytics API: Client-side filtering complete:', {
      totalEventsBeforeAllFilters: beforeAllFilters,
      totalEventsAfterAllFilters: filteredEvents.length,
      filteredOut: beforeAllFilters - filteredEvents.length,
      dateRangeAfterFilter: filteredEvents.length > 0 ? {
        oldest: new Date(Math.min(...filteredEvents.map(e => new Date(e.created_at).getTime()))).toISOString().split('T')[0],
        newest: new Date(Math.max(...filteredEvents.map(e => new Date(e.created_at).getTime()))).toISOString().split('T')[0],
      } : null,
    });
    
    // Verwende gefilterte Events statt ursprüngliche Events
    const eventsToUse = filteredEvents;
    
    const rawEventTypes = eventsToUse ? Array.from(new Set(eventsToUse.map(e => e.event_type))) : [];
    
    // Debug: Zeige Datumsbereich der Events
    let dateRange: { min?: string; max?: string } = {};
    if (eventsToUse && eventsToUse.length > 0) {
      const dates = eventsToUse.map(e => new Date(e.created_at).toISOString()).sort();
      dateRange = {
        min: dates[0],
        max: dates[dates.length - 1],
      };
    }
    
    console.log('Admin Analytics API: Raw query results:', {
      totalEventsFromDB: events?.length || 0,
      totalEventsAfterClientFilter: eventsToUse?.length || 0,
      hasError: !!error,
      errorMessage: error?.message,
      eventTypes: rawEventTypes,
      eventTypeCounts: eventsToUse ? rawEventTypes.map(type => ({
        type,
        count: eventsToUse.filter(e => e.event_type === type).length
      })) : [],
      dateRange,
      filterApplied: {
        startDate: startDate || null,
        startDateISO: startDateISO || null,
        endDate: endDate || null,
        endDateISO: endDateISO || null,
        eventType: eventType || null,
      },
      sampleDates: eventsToUse && eventsToUse.length > 0 ? eventsToUse.slice(0, 5).map(e => ({
        id: e.id,
        event_type: e.event_type,
        created_at: e.created_at,
        dateISO: new Date(e.created_at).toISOString(),
        dateUTC: new Date(e.created_at).toUTCString(),
        dateLocal: new Date(e.created_at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
      })) : [],
    });

    // Filtere dashboard_visit Events heraus (nicht relevant)
    const dashboardVisitCount = eventsToUse?.filter(e => e.event_type === 'dashboard_visit').length || 0;
    
    // Filtere dashboard_visit Events heraus (Admin-Filterung erfolgt später nach dem Laden der Email-Adressen)
    const relevantEvents = eventsToUse?.filter(e => e.event_type !== 'dashboard_visit') || [];
    
    if (dashboardVisitCount > 0) {
      console.log(`Admin Analytics API: Filtered out ${dashboardVisitCount} dashboard_visit events (not relevant)`);
    }

    // Hole alle unique User-IDs (nur von relevanten Events, VOR Admin-Filterung)
    const uniqueUserIds = relevantEvents ? Array.from(new Set(relevantEvents.map(e => e.user_id).filter(Boolean))) : [];

    // Debug: Log Query-Ergebnisse (immer loggen)
    console.log('Admin Analytics API: Query results', {
      eventCount: events?.length || 0,
      relevantEventCount: relevantEvents.length,
      uniqueUserCount: uniqueUserIds.length,
      uniqueUserIds: uniqueUserIds.slice(0, 5), // Erste 5 User-IDs
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
    });
    if (relevantEvents && relevantEvents.length > 0) {
      console.log('Admin Analytics API: Event samples (first 3):');
      relevantEvents.slice(0, 3).forEach((event, idx) => {
        console.log(`  [${idx + 1}] user_id: ${event.user_id?.substring(0, 8)}..., event_type: ${event.event_type}, created_at: ${event.created_at}`);
      });
    } else {
      console.log('Admin Analytics API: No events found in database');
    }

    // Hole Email-Adressen für alle User (mit Service Role Key)
    const userEmailsMap: Record<string, string> = {};
    if (uniqueUserIds.length > 0) {
      try {
        // Verwende Admin Client um Email-Adressen aus auth.users zu holen
        // listUsers() ist paginiert, daher müssen wir alle Seiten laden
        let page = 1;
        let hasMore = true;
        let allUsers: any[] = [];
        
        while (hasMore) {
          const { data: usersData, error: usersError } = await adminSupabase.auth.admin.listUsers({
            page,
            perPage: 1000, // Maximal 1000 User pro Seite
          });
          
          if (usersError) {
            console.error('Error fetching users page', page, ':', usersError);
            break;
          }
          
          if (usersData?.users && usersData.users.length > 0) {
            allUsers = allUsers.concat(usersData.users);
            // Prüfe ob es weitere Seiten gibt
            hasMore = usersData.users.length === 1000;
            page++;
          } else {
            hasMore = false;
          }
        }
        
        // Erstelle Map von User-ID zu Email
        allUsers.forEach(user => {
          if (user.email && uniqueUserIds.includes(user.id)) {
            userEmailsMap[user.id] = user.email;
          }
        });
        
        // Debug: Zeige welche User-IDs gefunden wurden und welche nicht
        const foundUserIds = Object.keys(userEmailsMap);
        const missingUserIds = uniqueUserIds.filter(id => !foundUserIds.includes(id));
        
        console.log('Admin Analytics API: Fetched user emails:', {
          totalUsersInDB: allUsers.length,
          uniqueUserIdsInEvents: uniqueUserIds.length,
          emailsFound: foundUserIds.length,
          missingUserIds: missingUserIds.length,
          missingUserIdsSample: missingUserIds.slice(0, 5),
        });
        
        if (missingUserIds.length > 0) {
          console.log('Admin Analytics API: Missing user IDs (first 10):', 
            missingUserIds.slice(0, 10).map(id => id.substring(0, 8) + '...')
          );
        }
      } catch (err: any) {
        console.error('Error fetching user emails:', err);
      }
    }

    // Erweitere Events um Email-Adressen
    const eventsWithEmails = relevantEvents.map(event => ({
      ...event,
      user_email: userEmailsMap[event.user_id] || null,
    }));
    
    // Filtere Admin-Events heraus (nur für interne Analytics relevant)
    // MUSS NACH dem Laden der Email-Adressen erfolgen
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    
    const adminEventCount = eventsWithEmails.filter(e => {
      return e.user_email && adminEmails.includes(e.user_email.toLowerCase());
    }).length;
    
    // Filtere Admin-Events heraus
    const finalEvents = eventsWithEmails.filter(e => {
      // Filtere Admin-Events (vergleiche mit user_email)
      if (e.user_email && adminEmails.includes(e.user_email.toLowerCase())) {
        return false;
      }
      return true;
    });
    
    if (adminEventCount > 0) {
      console.log(`Admin Analytics API: Filtered out ${adminEventCount} admin user events (not relevant for analytics)`);
    }

    if (error) {
      console.error('Error fetching analytics:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { 
          error: 'Failed to fetch analytics',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    // Aggregierte Statistiken berechnen (nur relevante Events, NACH Admin-Filterung)
    const stats = {
      totalEvents: finalEvents.length,
      eventsByType: {} as Record<string, number>,
      eventsByDay: {} as Record<string, number>,
      topResourceFigures: {} as Record<string, number>,
      topVoices: {} as Record<string, number>,
      totalUsers: new Set<string>(),
      audioPlays: 0,
      audioCompletions: 0,
      resourcesCreated: 0,
      userLogins: 0,
    };

    finalEvents.forEach((event) => {
      // Events nach Typ zählen
      stats.eventsByType[event.event_type] = (stats.eventsByType[event.event_type] || 0) + 1;

      // Events nach Tag zählen
      const day = new Date(event.created_at).toISOString().split('T')[0];
      stats.eventsByDay[day] = (stats.eventsByDay[day] || 0) + 1;

      // User zählen
      if (event.user_id) {
        stats.totalUsers.add(event.user_id);
      }

      // Spezifische Event-Typen zählen
      if (event.event_type === 'audio_play') {
        stats.audioPlays++;
      } else if (event.event_type === 'audio_play_complete') {
        stats.audioCompletions++;
      } else if (event.event_type === 'resource_created') {
        stats.resourcesCreated++;
      } else if (event.event_type === 'user_login') {
        stats.userLogins++;
      }

      // Top Ressourcenfiguren
      if (event.resource_figure_name) {
        stats.topResourceFigures[event.resource_figure_name] =
          (stats.topResourceFigures[event.resource_figure_name] || 0) + 1;
      }

      // Top Stimmen
      if (event.voice_id) {
        stats.topVoices[event.voice_id] = (stats.topVoices[event.voice_id] || 0) + 1;
      }
    });

    // Top Ressourcenfiguren sortieren
    const topResourceFigures = Object.entries(stats.topResourceFigures)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Top Stimmen sortieren
    const topVoices = Object.entries(stats.topVoices)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([voiceId, count]) => ({ voiceId, count }));

    // Events nach Tag sortieren
    const eventsByDay = Object.entries(stats.eventsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));

    // Debug: Log final stats
    console.log('Admin Analytics API: Final stats:', {
      totalEvents: stats.totalEvents,
      totalUsers: stats.totalUsers.size,
      audioPlays: stats.audioPlays,
      audioCompletions: stats.audioCompletions,
      resourcesCreated: stats.resourcesCreated,
      userLogins: stats.userLogins,
      eventsByTypeCount: Object.keys(stats.eventsByType).length,
      topResourceFiguresCount: topResourceFigures.length,
    });

    // Debug: Log final response
    console.log('Admin Analytics API: Final response:', {
      totalEventsInResponse: finalEvents.length,
      eventTypesInResponse: Array.from(new Set(finalEvents.map(e => e.event_type))),
      statsTotalEvents: stats.totalEvents,
      statsUserLogins: stats.userLogins,
      statsResourcesCreated: stats.resourcesCreated,
      statsAudioPlays: stats.audioPlays,
    });

    const successResponse = NextResponse.json({
      events: finalEvents || [],
      stats: {
        ...stats,
        totalUsers: stats.totalUsers.size,
        topResourceFigures,
        topVoices,
        eventsByDay,
      },
      // Debug-Info: Zeige was in der DB ist (vor dem Filtern)
      _debug: {
        totalEventsInDB: events?.length || 0,
        dashboardVisitCount,
        relevantEventsCount: relevantEvents.length,
        rawEventTypes: rawEventTypes,
        eventTypeCounts: events ? rawEventTypes.map(type => ({
          type,
          count: events.filter(e => e.event_type === type).length
        })) : [],
        dateRange,
        filterParams: {
          startDate: startDate || null,
          endDate: endDate || null,
          eventType: eventType || null,
          startDateISO: startDateISO,
          endDateISO: endDateISO,
        },
      },
    });
    
    // Setze Cookies in der Response
    cookiesToSet.forEach(({ name, value, options }) => {
      successResponse.cookies.set(name, value, options);
    });
    
    return successResponse;
  } catch (error: any) {
    console.error('Error in admin analytics:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

