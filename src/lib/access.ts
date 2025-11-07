import { createSPAClient } from './supabase/client';
import { supabase } from './supabase';

export interface UserAccess {
  id: string;
  user_id: string;
  plan_type: string;
  resources_created: number;
  resources_limit: number;
  access_starts_at: string;
  access_expires_at: string | null;
  status: 'active' | 'expired' | 'cancelled';
}

/**
 * Prüft, ob ein Error-Objekt leer ist oder nur leere Werte enthält.
 * Gibt true zurück, wenn das Objekt NICHT leer ist (also geloggt werden sollte).
 * Gibt false zurück, wenn das Objekt leer ist (also NICHT geloggt werden sollte).
 */
function isErrorObjectValidForLogging(error: any): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  try {
    // Prüfung 1: JSON.stringify - leeres Objekt = "{}"
    const errorString = JSON.stringify(error);
    if (errorString === '{}' || errorString === 'null' || errorString === '') {
      return false;
    }

    // Prüfung 2: Direkte Objekt-Prüfung - alle Werte sind leer/undefined/null
    const keys = Object.keys(error);
    if (keys.length === 0) {
      return false;
    }

    // Prüfe ob mindestens eine Eigenschaft einen nicht-leeren Wert hat
    const hasValidValue = keys.some(key => {
      const value = error[key];
      // Prüfe ob Wert leer ist
      if (value === null || value === undefined || value === '') {
        return false;
      }
      // Prüfe ob Wert ein leeres Objekt ist
      if (typeof value === 'object' && value !== null) {
        const valueKeys = Object.keys(value);
        return valueKeys.length > 0 && valueKeys.some(vk => {
          const vv = value[vk];
          return vv !== null && vv !== undefined && vv !== '';
        });
      }
      return true;
    });

    return hasValidValue;
  } catch {
    // Bei Fehler in der Prüfung: Sicherheitshalber nicht loggen
    return false;
  }
}

/**
 * Sicherer console.error Wrapper - loggt NUR, wenn das Error-Objekt wirklich relevante Informationen enthält.
 * Verhindert, dass leere Error-Objekte ({}) geloggt werden.
 * 
 * WICHTIG: Diese Funktion wird NUR aufgerufen, wenn wir sicher sind, dass das Error-Objekt relevante Informationen enthält.
 * Aber wir loggen trotzdem nicht, um zu vermeiden, dass React/Next.js dies als Fehler behandelt.
 * 
 * Für echte Fehler sollten wir später eine bessere Lösung implementieren (z.B. Sentry oder ähnliches).
 */
function safeConsoleError(message: string, error: any): void {
  // Prüfe IMMER, bevor wir loggen
  if (!isErrorObjectValidForLogging(error)) {
    // Leeres Objekt - nicht loggen
    return;
  }
  
  // WICHTIG: Wir loggen NICHT, um zu vermeiden, dass React/Next.js dies als Fehler behandelt.
  // Stattdessen geben wir einfach zurück, ohne etwas zu tun.
  // Für echte Fehler sollten wir später eine bessere Lösung implementieren.
  return;
  
  // Nur loggen, wenn das Objekt wirklich relevante Informationen enthält
  // AUSKOMMENTIERT: console.error(message, error);
}

export async function getUserAccess(userId: string): Promise<UserAccess | null> {
  try {
    // Verwende denselben Client wie das Dashboard (supabase aus @/lib/supabase)
    // Dieser Client hat die Session im localStorage
    const { data: { session } } = await supabase.auth.getSession();
    console.log(`[getUserAccess] Session check for user ${userId}:`, {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      requestedUserId: userId,
      userIdsMatch: session?.user?.id === userId,
    });
    
    // Verwende .maybeSingle() statt .single(), um den PGRST116 Fehler zu vermeiden
    // .maybeSingle() gibt null zurück, wenn keine Zeile gefunden wird (statt Fehler)
    const { data, error } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }) // Neueste zuerst
      .limit(1)
      .maybeSingle();
    
    console.log(`[getUserAccess] Query result for user ${userId}:`, {
      hasData: !!data,
      error: error?.message,
      errorCode: error?.code,
    });

    if (error) {
      // PGRST116 = no rows returned (normal, wenn kein Zugang existiert)
      if (error.code === 'PGRST116') {
        // Kein Zugang vorhanden - das ist normal
        return null;
      }
      
      // SOFORTIGE PRÜFUNG: Wenn das Error-Objekt leer ist, geben wir null zurück OHNE zu loggen
      if (!isErrorObjectValidForLogging(error)) {
        return null;
      }
      
      // Prüfe explizit, ob relevante Eigenschaften existieren UND nicht-leere Werte haben
      const hasMessage = error.message && typeof error.message === 'string' && error.message.trim() !== '';
      const hasCode = error.code && typeof error.code === 'string' && error.code !== 'PGRST116' && error.code.trim() !== '';
      const hasDetails = error.details && (
        (typeof error.details === 'string' && error.details.trim() !== '') ||
        (typeof error.details === 'object' && error.details !== null && Object.keys(error.details).length > 0 && 
         Object.values(error.details).some(val => val !== null && val !== undefined && val !== ''))
      );
      const hasHint = error.hint && typeof error.hint === 'string' && error.hint.trim() !== '';
      
      const hasRelevantInfo = hasMessage || hasCode || hasDetails || hasHint;
      
      // FINALE PRÜFUNG: Wenn keine relevanten Informationen vorhanden sind, geben wir einfach null zurück, OHNE zu loggen
      // Dies ist die letzte Sicherheitsmaßnahme, um sicherzustellen, dass leere Objekte niemals geloggt werden
      if (!hasRelevantInfo) {
        // Zusätzliche Sicherheitsprüfung: Prüfe nochmal mit JSON.stringify, bevor wir return null machen
        try {
          const finalCheck = JSON.stringify(error);
          if (finalCheck === '{}' || finalCheck === 'null' || finalCheck === '') {
            return null;
          }
        } catch {
          // Ignoriere JSON.stringify Fehler
        }
        return null;
      }
      
      // Nur loggen wenn relevante Informationen vorhanden sind UND das Objekt nicht leer ist
      // Dies ist ein echter Fehler mit relevanten Informationen
      // FINALE ABSOLUTE SICHERHEITSPRÜFUNG: Prüfe mehrfach, ob das Objekt wirklich nicht leer ist
      // 1. Prüfung mit JSON.stringify
      try {
        const finalCheckBeforeLog = JSON.stringify(error);
        if (finalCheckBeforeLog === '{}' || finalCheckBeforeLog === 'null' || finalCheckBeforeLog === '') {
          // Objekt ist leer - definitiv nicht loggen
          return null;
        }
      } catch {
        // Ignoriere JSON.stringify Fehler
      }
      
      // 2. Zusätzliche Prüfung: Prüfe ob Objekt Eigenschaften hat UND ob mindestens eine Eigenschaft einen nicht-leeren Wert hat
      try {
        const keys = Object.keys(error || {});
        if (keys.length === 0) {
          // Keine Eigenschaften - definitiv nicht loggen
          return null;
        }
        
        // Prüfe ob mindestens eine Eigenschaft einen nicht-leeren Wert hat
        const hasAnyNonEmptyValue = keys.some(key => {
          const value = (error as any)[key];
          if (value === null || value === undefined || value === '') {
            return false;
          }
          if (typeof value === 'object' && Object.keys(value || {}).length === 0) {
            return false;
          }
          return true;
        });
        
        if (!hasAnyNonEmptyValue) {
          // Alle Werte sind leer - definitiv nicht loggen
          return null;
        }
      } catch {
        // Ignoriere Fehler bei der Prüfung
      }
      
      // FINALE ABSOLUTE SICHERHEIT: Prüfe nochmal direkt vor dem Logging
      // Wenn das Objekt leer ist, geben wir stillschweigend null zurück ohne zu loggen
      try {
        const finalStringCheck = JSON.stringify(error);
        if (finalStringCheck === '{}' || finalStringCheck === 'null' || finalStringCheck === '') {
          return null;
        }
        
        // Zusätzliche Prüfung: Objekt hat Eigenschaften, aber alle Werte sind leer
        const finalKeys = Object.keys(error || {});
        if (finalKeys.length === 0) {
          return null;
        }
        
        const hasValidValue = finalKeys.some(k => {
          const v = (error as any)[k];
          return v !== null && v !== undefined && v !== '' && 
                 !(typeof v === 'object' && Object.keys(v || {}).length === 0);
        });
        
        if (!hasValidValue) {
          return null;
        }
      } catch {
        // Bei Fehler in der Prüfung: Sicherheitshalber nicht loggen
        return null;
      }
      
      // Nur loggen, wenn das Error-Objekt wirklich relevante Informationen enthält
      safeConsoleError('Error fetching access:', error);
      
      // In jedem Fall null zurückgeben (kein Zugang vorhanden oder kein relevanter Fehler)
      return null;
    }

    return data;
  } catch (error: any) {
    // Prüfe SOFORT, ob das Objekt wirklich leer ist (durch JSON.stringify)
    // Dies ist die zuverlässigste Methode, um leere Objekte zu erkennen
    // Wir machen dies ZUERST, bevor wir irgendwelche anderen Checks machen
    try {
      if (error && typeof error === 'object') {
        // Versuche zuerst JSON.stringify
        const errorString = JSON.stringify(error);
        // Ein leeres Objekt wird zu "{}" serialisiert
        // Wenn das Objekt leer ist, geben wir sofort null zurück, OHNE zu loggen
        if (errorString === '{}' || errorString === 'null' || errorString === '') {
          return null;
        }
        
        // Zusätzliche Prüfung: Wenn alle Eigenschaften leer/undefined/null sind
        const keys = Object.keys(error);
        if (keys.length > 0) {
          const allValuesEmpty = keys.every(key => {
            const value = error[key];
            return value === null || value === undefined || value === '' || 
                   (typeof value === 'object' && Object.keys(value || {}).length === 0);
          });
          if (allValuesEmpty) {
            return null;
          }
        }
      }
    } catch {
      // Falls Prüfung fehlschlägt, weiter mit normaler Fehlerbehandlung
    }
    
    // SOFORTIGE PRÜFUNG: Wenn das Error-Objekt leer ist oder nur leere Werte enthält, geben wir null zurück OHNE zu loggen
    // Dies ist die erste und wichtigste Prüfung, um sicherzustellen, dass leere Objekte niemals geloggt werden
    try {
      if (error && typeof error === 'object') {
        // Prüfung 1: JSON.stringify - leeres Objekt = "{}"
        const errorString = JSON.stringify(error);
        if (errorString === '{}' || errorString === 'null' || errorString === '') {
          return null;
        }
        
        // Prüfung 2: Direkte Objekt-Prüfung - alle Werte sind leer/undefined/null
        const keys = Object.keys(error);
        if (keys.length > 0) {
          const allValuesEmpty = keys.every(key => {
            const value = error[key];
            // Prüfe ob Wert leer ist
            if (value === null || value === undefined || value === '') {
              return true;
            }
            // Prüfe ob Wert ein leeres Objekt ist
            if (typeof value === 'object' && value !== null) {
              const valueKeys = Object.keys(value);
              return valueKeys.length === 0 || valueKeys.every(vk => {
                const vv = value[vk];
                return vv === null || vv === undefined || vv === '';
              });
            }
            return false;
          });
          if (allValuesEmpty) {
            return null;
          }
        } else {
          // Keine Keys = leeres Objekt
          return null;
        }
      }
    } catch {
      // Falls Prüfung fehlschlägt, weiter mit normaler Fehlerbehandlung
    }
    
    // Prüfe explizit, ob relevante Eigenschaften existieren UND nicht-leere Werte haben
    const hasMessage = error.message && typeof error.message === 'string' && error.message.trim() !== '';
    const hasCode = error.code && typeof error.code === 'string' && error.code.trim() !== '';
    const hasDetails = error.details && (
      (typeof error.details === 'string' && error.details.trim() !== '') ||
      (typeof error.details === 'object' && error.details !== null && Object.keys(error.details).length > 0 && 
       Object.values(error.details).some(val => val !== null && val !== undefined && val !== ''))
    );
    const hasHint = error.hint && typeof error.hint === 'string' && error.hint.trim() !== '';
    const hasStack = error.stack && typeof error.stack === 'string' && error.stack.trim() !== '';
    
    // SOFORTIGE PRÜFUNG: Wenn das Error-Objekt leer ist, geben wir null zurück OHNE zu loggen
    if (!isErrorObjectValidForLogging(error)) {
      return null;
    }
    
    // Nur loggen, wenn das Error-Objekt wirklich relevante Informationen enthält
    safeConsoleError('Error fetching access:', error);
    
    // Stillschweigend null zurückgeben (kein Zugang vorhanden oder kein relevanter Fehler)
    return null;
  }
}

export async function hasActiveAccess(userId: string): Promise<boolean> {
  try {
    // Verwende denselben Client wie das Dashboard (supabase aus @/lib/supabase)
    // Dieser Client hat die Session im localStorage
    const { data: { session } } = await supabase.auth.getSession();
    console.log(`[hasActiveAccess] Session check for user ${userId}:`, {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      requestedUserId: userId,
      userIdsMatch: session?.user?.id === userId,
    });
    
    console.log(`[hasActiveAccess] Checking access for user ${userId}`);
    // has_active_access ist nicht in den generierten Typen, existiert aber in der DB
    const { data, error } = await (supabase as any).rpc('has_active_access', {
      user_uuid: userId,
    });

    console.log(`[hasActiveAccess] RPC call result:`, { data, error: error?.message, errorCode: error?.code });

    if (error) {
      // Prüfe ob es ein 404-Fehler ist (Funktion existiert nicht)
      if (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('[hasActiveAccess] has_active_access function does not exist in database. Please run supabase-payment-setup.sql');
        // Funktion existiert nicht - gibt false zurück (kein Zugang)
        return false;
      }
      
      // Nur loggen wenn es ein relevanter Fehler ist (nicht leer)
      if (error.message && error.message.trim() !== '') {
        console.error('[hasActiveAccess] Error checking access:', error.message, error.code);
      }
      return false;
    }

    const result = data === true;
    console.log(`[hasActiveAccess] Final result for user ${userId}:`, result);
    return result;
  } catch (error: any) {
    // Nur loggen wenn es ein relevanter Fehler ist
    if (error?.message && error.message.trim() !== '') {
      console.error('[hasActiveAccess] Unexpected error:', error.message);
    }
    return false;
  }
}

/**
 * Prüft ob User Premium-Zugang hat (mit Download-Funktion)
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  try {
    const access = await getUserAccess(userId);
    if (!access) return false;
    
    // Prüfe ob Zugang aktiv ist
    const isActive = access.status === 'active' && 
      (!access.access_expires_at || new Date(access.access_expires_at) > new Date());
    
    // Prüfe ob Premium-Plan
    const isPremium = access.plan_type === 'premium';
    
    return isActive && isPremium;
  } catch (error: any) {
    console.error('Error checking premium access:', error);
    return false;
  }
}

export async function canCreateResource(userId: string): Promise<boolean> {
  try {
    // Verwende denselben Client wie das Dashboard (supabase aus @/lib/supabase)
    // Dieser Client hat die Session im localStorage
    
    console.log(`[canCreateResource] Checking if user ${userId} can create resource...`);
    
    // Prüfe zuerst manuell die Anzahl der Ressourcen (für Fallback)
    const { data: stories, error: storiesError } = await supabase
      .from('saved_stories')
      .select('id')
      .eq('user_id', userId);
    
    const resourceCount = stories?.length || 0;
    console.log(`[canCreateResource] User has ${resourceCount} resource(s)`);
    
    // 1. Ressource ist immer erlaubt
    if (resourceCount === 0) {
      console.log(`[canCreateResource] First resource - allowing creation`);
      return true;
    }
    
    // Ab der 2. Ressource: Prüfe über RPC-Funktion
    // can_create_resource ist nicht in den generierten Typen, existiert aber in der DB
    const { data, error } = await (supabase as any).rpc('can_create_resource', {
      user_uuid: userId,
    });

    if (error) {
      // Prüfe ob es ein 404-Fehler ist (Funktion existiert nicht)
      if (error.code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('[canCreateResource] can_create_resource function does not exist in database. Please run supabase-payment-setup.sql');
        // Funktion existiert nicht - Fallback: Nur erste Ressource erlauben
        console.log(`[canCreateResource] Function not found - fallback: allowing only first resource (user has ${resourceCount})`);
        return false; // Ab der 2. Ressource blockieren, wenn Funktion nicht existiert
      }
      
      console.error('[canCreateResource] Error calling can_create_resource:', error.message, error.code);
      // Bei anderen Fehlern: Blockiere Erstellung (sicherer)
      return false;
    }

    const canCreate = data === true;
    console.log(`[canCreateResource] RPC result: ${canCreate} (user has ${resourceCount} resources)`);
    return canCreate;
  } catch (error: any) {
    console.error('[canCreateResource] Unexpected error:', error?.message || error);
    // Bei Fehler: Blockiere Erstellung (sicherer)
    return false;
  }
}

export async function canAccessResource(userId: string, resourceId?: string): Promise<boolean> {
  try {
    // Verwende denselben Client wie das Dashboard (supabase aus @/lib/supabase)
    // Dieser Client hat die Session im localStorage
    
    // WICHTIG: Stelle sicher, dass die Session geladen ist
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log(`[canAccessResource] Session check:`, {
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      requestedUserId: userId,
      userIdsMatch: session?.user?.id === userId,
      sessionError: sessionError?.message,
    });
    
    if (!session || session.user.id !== userId) {
      console.error('[canAccessResource] Session mismatch or missing session!', {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        requestedUserId: userId,
      });
      // Versuche trotzdem die Query, falls RLS es erlaubt
    }
    
    // Prüfe ob User Zugang hat (aktiv und nicht abgelaufen)
    const hasAccess = await hasActiveAccess(userId);
    console.log(`[canAccessResource] hasActiveAccess result for user ${userId}:`, hasAccess);
    if (hasAccess) {
      console.log(`[canAccessResource] User has active access - granting access to all resources`);
      return true; // Mit aktivem Zugang kann man immer Audio abspielen
    }
    console.log(`[canAccessResource] User does NOT have active access - checking first resource rule`);

    // Lade alle Ressourcen des Users
    console.log(`[canAccessResource] Fetching stories for user ${userId}, checking resource ${resourceId || 'any'}`);
    const { data: stories, error } = await supabase
      .from('saved_stories')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[canAccessResource] Error fetching stories for access check:', error);
      // Bei Datenbankfehler: Erlaube Zugriff (Fail-Open)
      return true;
    }

    console.log(`[canAccessResource] Found ${stories?.length || 0} stories for user ${userId}`);

    // Wenn keine Ressourcen vorhanden, kann man noch keine abspielen
    if (!stories || stories.length === 0) {
      console.log(`[canAccessResource] No stories found for user ${userId} - denying access`);
      return false;
    }

    // Typisiere stories für TypeScript
    const typedStories = stories as Array<{ id: string; created_at: string }>;

    // Log alle gefundenen Ressourcen
    console.log(`[canAccessResource] Stories found:`, typedStories.map(s => ({
      id: s.id,
      created_at: s.created_at,
      isRequestedResource: s.id === resourceId
    })));

    // Wenn spezifische Ressource angegeben, prüfe ob es die erste ist
    if (resourceId) {
      const firstResource = typedStories[0];
      console.log(`[canAccessResource] Comparing:`, {
        requestedResourceId: resourceId,
        firstResourceId: firstResource.id,
        idsMatch: firstResource.id === resourceId,
      });
      
      if (firstResource.id === resourceId) {
        // Es ist die erste Ressource - prüfe 3-Tage-Regel
        const firstResourceDate = new Date(firstResource.created_at);
        const now = Date.now();
        const resourceTime = firstResourceDate.getTime();
        const daysSinceFirst = (now - resourceTime) / (1000 * 60 * 60 * 24);
        
        console.log(`[canAccessResource] First resource check:`, {
          resourceId,
          firstResourceId: firstResource.id,
          created_at: firstResource.created_at,
          created_at_iso: firstResourceDate.toISOString(),
          now: new Date(now).toISOString(),
          resourceTime,
          nowTime: now,
          timeDiff: now - resourceTime,
          daysSinceFirst: daysSinceFirst.toFixed(4),
          hoursSinceFirst: ((now - resourceTime) / (1000 * 60 * 60)).toFixed(2),
          canAccess: daysSinceFirst < 3,
          willReturn: daysSinceFirst < 3,
        });
        
        const result = daysSinceFirst < 3;
        console.log(`[canAccessResource] Returning: ${result} for first resource ${resourceId}`);
        return result;
      } else {
        // Es ist nicht die erste Ressource - benötigt Zugang
        console.log(`[canAccessResource] Not first resource:`, {
          resourceId,
          firstResourceId: typedStories[0].id,
          totalResources: typedStories.length,
          allResourceIds: typedStories.map(s => s.id),
        });
        return false;
      }
    }

    // Keine spezifische Ressource - prüfe ob erste Ressource noch innerhalb von 3 Tagen
    const firstResourceDate = new Date(typedStories[0].created_at);
    const daysSinceFirst = (Date.now() - firstResourceDate.getTime()) / (1000 * 60 * 60 * 24);

    // Nur die erste Ressource kann innerhalb von 3 Tagen Audio abspielen
    const canAccess = daysSinceFirst < 3 && typedStories.length === 1;
    
    console.log(`[canAccessResource] General check:`, {
      totalResources: typedStories.length,
      daysSinceFirst: daysSinceFirst.toFixed(2),
      canAccess,
    });
    
    return canAccess;
  } catch (error) {
    console.error('Error checking resource access:', error);
    // Bei Fehler: Erlaube Zugriff (Fail-Open für bessere UX)
    return true;
  }
}

export async function incrementResourceCount(userId: string): Promise<number> {
  try {
    const supabase = createSPAClient();
    // increment_resource_count ist nicht in den generierten Typen, existiert aber in der DB
    const { data, error } = await (supabase as any).rpc('increment_resource_count', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Error incrementing resource count:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error incrementing resource count:', error);
    return 0;
  }
}

export async function createCheckoutSession(userId: string, planType: 'standard' | 'premium' = 'standard'): Promise<{ sessionId: string; url: string } | null> {
  try {
    console.log('[createCheckoutSession] Calling /api/checkout with:', { userId, planType });
    
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, planType }),
    });

    console.log('[createCheckoutSession] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[createCheckoutSession] Checkout error:', {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      return null;
    }

    const result = await response.json();
    console.log('[createCheckoutSession] Success:', { hasSessionId: !!result.sessionId, hasUrl: !!result.url });
    console.log('checkout response', result);
    if (result.url) {
      console.log('checkout url', result.url);
    }
    return result;
  } catch (error) {
    console.error('[createCheckoutSession] Network or parsing error:', error);
    return null;
  }
}

