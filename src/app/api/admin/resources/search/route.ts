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
 * API-Endpoint für Admin-Ressourcen-Suche
 * Erlaubt Admins, alle Ressourcen zu durchsuchen (auch von anderen Usern)
 */
export async function GET(request: NextRequest) {
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

    // Hole Suchparameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const email = searchParams.get('email') || '';
    const storyId = searchParams.get('storyId') || '';

    if (!query && !email && !storyId) {
      return NextResponse.json(
        { error: 'Query parameter "q" (Titel), "email", or "storyId" is required' },
        { status: 400 }
      );
    }

    // Verwende Admin Client um RLS zu umgehen
    const supabaseAdmin = await createServerAdminClient();

    // Wenn storyId vorhanden, suche direkt nach dieser ID
    if (storyId) {
      const { data: resource, error: resourceError } = await (supabaseAdmin as any)
        .from('saved_stories')
        .select('id, title, content, audio_url, resource_figure, created_at, user_id, client_email, is_audio_only, question_answers')
        .eq('id', storyId)
        .single();

      if (resourceError) {
        console.error('Database search error:', resourceError);
        return NextResponse.json(
          { error: 'Fehler beim Suchen', details: resourceError.message },
          { status: 500 }
        );
      }

      // Debug: Logge die question_answers aus der Datenbank
      if (resource && resource.question_answers) {
        console.log('[API/admin/resources/search] Raw question_answers from DB:', JSON.stringify(resource.question_answers, null, 2));
        resource.question_answers.forEach((qa: any, index: number) => {
          console.log(`[API/admin/resources/search] Question ${qa.questionId || index}:`, {
            questionId: qa.questionId,
            selectedBlocks: qa.selectedBlocks,
            selectedBlocksCount: qa.selectedBlocks?.length || 0,
            customBlocks: qa.customBlocks,
            customBlocksCount: qa.customBlocks?.length || 0,
            answer: qa.answer,
            fullQA: qa
          });
        });
      }

      return NextResponse.json({
        success: true,
        resource: resource,
      });
    }

    // Suche nach Email (über auth.users) - bereite Filter vor
    let emailFilter: { user_id?: string; client_email?: string } | null = null;
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('[API/admin/resources/search] Looking up user for email:', normalizedEmail);
      
      // Hole User-ID für diese Email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (userError) {
        console.error('Error fetching users:', userError);
      } else {
        const matchingUser = userData?.users.find(u => u.email?.toLowerCase() === normalizedEmail);
        console.log('[API/admin/resources/search] User lookup result:', {
          found: !!matchingUser,
          userId: matchingUser?.id,
          email: normalizedEmail
        });
        
        if (matchingUser) {
          emailFilter = { user_id: matchingUser.id, client_email: normalizedEmail };
        } else {
          emailFilter = { client_email: normalizedEmail };
        }
      }
    }

    // Suche nach Titel oder resource_figure
    // Da OR-Syntax mit Leerzeichen Probleme macht, machen wir zwei separate Queries
    let resources: any[] = [];
    const allResourceIds = new Set<string>();

    if (query) {
      const searchPattern = `%${query}%`;
      
      // Query 1: Suche nach title
      let titleQuery = (supabaseAdmin as any)
        .from('saved_stories')
        .select('id, title, content, audio_url, resource_figure, created_at, user_id, client_email, is_audio_only')
        .ilike('title', searchPattern);
      
      // Email-Filter anwenden
      if (emailFilter) {
        if (emailFilter.user_id && emailFilter.client_email) {
          titleQuery = titleQuery.or(`user_id.eq.${emailFilter.user_id},client_email.eq.${emailFilter.client_email}`);
        } else if (emailFilter.client_email) {
          titleQuery = titleQuery.eq('client_email', emailFilter.client_email);
        }
      }
      
      const { data: titleResults, error: titleError } = await titleQuery
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('[API/admin/resources/search] Title search results:', {
        query,
        emailFilter,
        titleResultsCount: titleResults?.length || 0,
        titleError: titleError?.message
      });
      
      if (titleError) {
        console.error('Error searching by title:', titleError);
      } else if (titleResults) {
        titleResults.forEach((r: any) => {
          if (!allResourceIds.has(r.id)) {
            resources.push(r);
            allResourceIds.add(r.id);
          }
        });
      }

      // Query 2: Suche nach resource_figure (JSONB)
      // Da JSONB-Suche mit OR-Syntax problematisch ist, hole alle Ressourcen für diese Email
      // und filtere dann client-seitig nach resource_figure
      let figureQuery = (supabaseAdmin as any)
        .from('saved_stories')
        .select('id, title, content, audio_url, resource_figure, created_at, user_id, client_email, is_audio_only');
      
      // Email-Filter anwenden
      if (emailFilter) {
        if (emailFilter.user_id && emailFilter.client_email) {
          figureQuery = figureQuery.or(`user_id.eq.${emailFilter.user_id},client_email.eq.${emailFilter.client_email}`);
        } else if (emailFilter.client_email) {
          figureQuery = figureQuery.eq('client_email', emailFilter.client_email);
        }
      } else {
        // Wenn keine Email-Filter, hole alle Ressourcen (limit auf 100 für Performance)
        figureQuery = figureQuery.limit(100);
      }
      
      const { data: figureResults, error: figureError } = await figureQuery
        .order('created_at', { ascending: false })
        .limit(100);
      
      console.log('[API/admin/resources/search] Figure search results:', {
        query,
        emailFilter,
        figureResultsCount: figureResults?.length || 0,
        figureError: figureError?.message
      });
      
      if (figureError) {
        console.error('Error searching by resource_figure:', figureError);
      } else if (figureResults) {
        // Client-seitige Filterung nach resource_figure
        const queryLower = query.toLowerCase();
        console.log('[API/admin/resources/search] Filtering figureResults by query:', queryLower);
        
        figureResults.forEach((r: any) => {
          if (!allResourceIds.has(r.id)) {
            // Prüfe ob resource_figure den Query enthält
            let figureStr = '';
            if (typeof r.resource_figure === 'string') {
              figureStr = r.resource_figure;
            } else if (typeof r.resource_figure === 'object' && r.resource_figure !== null) {
              // Extrahiere name aus dem Objekt
              figureStr = r.resource_figure.name || JSON.stringify(r.resource_figure);
            }
            
            console.log('[API/admin/resources/search] Checking resource:', {
              id: r.id,
              title: r.title,
              resource_figure: r.resource_figure,
              figureStr,
              matches: figureStr.toLowerCase().includes(queryLower)
            });
            
            if (figureStr.toLowerCase().includes(queryLower)) {
              resources.push(r);
              allResourceIds.add(r.id);
            }
          }
        });
      }
    } else {
      // Kein Query-String: Suche nur nach Email
      let queryBuilder = (supabaseAdmin as any)
        .from('saved_stories')
        .select('id, title, content, audio_url, resource_figure, created_at, user_id, client_email, is_audio_only');
      
      if (emailFilter) {
        if (emailFilter.user_id && emailFilter.client_email) {
          queryBuilder = queryBuilder.or(`user_id.eq.${emailFilter.user_id},client_email.eq.${emailFilter.client_email}`);
        } else if (emailFilter.client_email) {
          queryBuilder = queryBuilder.eq('client_email', emailFilter.client_email);
        }
      }
      
      const { data: emailResults, error: emailError } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (emailError) {
        console.error('Error searching by email:', emailError);
      } else if (emailResults) {
        resources = emailResults;
      }
    }

    // Wenn keine Ressourcen gefunden wurden und Email-Filter aktiv war,
    // versuche auch ohne Email-Filter zu suchen (als Fallback)
    if (resources.length === 0 && emailFilter && query) {
      console.log('[API/admin/resources/search] No resources found with email filter, trying without email filter...');
      
      const searchPattern = `%${query}%`;
      
      // Suche ohne Email-Filter nach title
      const fallbackTitleQuery = (supabaseAdmin as any)
        .from('saved_stories')
        .select('id, title, content, audio_url, resource_figure, created_at, user_id, client_email, is_audio_only')
        .ilike('title', searchPattern)
        .order('created_at', { ascending: false })
        .limit(50);
      
      const { data: fallbackTitleResults, error: fallbackTitleError } = await fallbackTitleQuery;
      
      if (fallbackTitleError) {
        console.error('[API/admin/resources/search] Fallback title search error:', fallbackTitleError);
      } else if (fallbackTitleResults && fallbackTitleResults.length > 0) {
        console.log('[API/admin/resources/search] Fallback title search found:', fallbackTitleResults.length, 'resources');
        fallbackTitleResults.forEach((r: any) => {
          if (!allResourceIds.has(r.id)) {
            console.log('[API/admin/resources/search] Adding fallback resource:', {
              id: r.id,
              title: r.title,
              resource_figure: r.resource_figure,
              user_id: r.user_id,
              client_email: r.client_email
            });
            resources.push(r);
            allResourceIds.add(r.id);
          }
        });
      } else {
        console.log('[API/admin/resources/search] Fallback title search found 0 resources');
      }
      
      // Suche ohne Email-Filter nach resource_figure (hole alle und filtere client-seitig)
      const fallbackFigureQuery = (supabaseAdmin as any)
        .from('saved_stories')
        .select('id, title, content, audio_url, resource_figure, created_at, user_id, client_email, is_audio_only')
        .order('created_at', { ascending: false })
        .limit(200); // Erhöht auf 200 für bessere Abdeckung
      
      const { data: fallbackFigureResults, error: fallbackFigureError } = await fallbackFigureQuery;
      
      if (fallbackFigureError) {
        console.error('[API/admin/resources/search] Fallback figure search error:', fallbackFigureError);
      } else if (fallbackFigureResults && fallbackFigureResults.length > 0) {
        console.log('[API/admin/resources/search] Fallback figure search found:', fallbackFigureResults.length, 'total resources, filtering...');
        const queryLower = query.toLowerCase();
        let matchCount = 0;
        
        fallbackFigureResults.forEach((r: any) => {
          if (!allResourceIds.has(r.id)) {
            let figureStr = '';
            if (typeof r.resource_figure === 'string') {
              figureStr = r.resource_figure;
            } else if (typeof r.resource_figure === 'object' && r.resource_figure !== null) {
              figureStr = r.resource_figure.name || JSON.stringify(r.resource_figure);
            }
            
            if (figureStr.toLowerCase().includes(queryLower)) {
              console.log('[API/admin/resources/search] Adding fallback resource (figure match):', {
                id: r.id,
                title: r.title,
                resource_figure: r.resource_figure,
                figureStr,
                user_id: r.user_id,
                client_email: r.client_email
              });
              resources.push(r);
              allResourceIds.add(r.id);
              matchCount++;
            }
          }
        });
        console.log('[API/admin/resources/search] Fallback figure search matched:', matchCount, 'resources');
      } else {
        console.log('[API/admin/resources/search] Fallback figure search found 0 resources');
      }
    }

    // Sortiere nach Erstellungsdatum (neueste zuerst)
    resources.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Limitiere auf 50 Ergebnisse
    resources = resources.slice(0, 50);
    
    // Debug: Logge die Suche
    console.log('[API/admin/resources/search] Search params:', { query, email, storyId });
    console.log('[API/admin/resources/search] Found resources:', resources?.length || 0);
    if (resources && resources.length > 0) {
      console.log('[API/admin/resources/search] First resource:', {
        id: resources[0].id,
        title: resources[0].title,
        resource_figure: resources[0].resource_figure,
        user_id: resources[0].user_id,
        client_email: resources[0].client_email
      });
    } else {
      console.log('[API/admin/resources/search] No resources found. Query:', query, 'Email:', email);
    }

    return NextResponse.json({
      success: true,
      resources: resources || [],
      count: resources?.length || 0
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

