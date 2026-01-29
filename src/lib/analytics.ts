// Analytics Helper Functions für Event-Tracking

export type AnalyticsEventType = 
  | 'audio_play' 
  | 'resource_created' 
  | 'dashboard_visit'
  | 'audio_play_complete'
  | 'user_login'
  | 'user_signup'
  | 'page_view'
  | 'audio_complete'
  | 'click_personalize';

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  storyId?: string;
  resourceFigureName?: string;
  voiceId?: string;
  metadata?: {
    playDuration?: number; // in Sekunden
    playPosition?: number; // in Sekunden
    audioDuration?: number; // in Sekunden
    completed?: boolean; // ob vollständig abgespielt
    page_path?: string; // für page_view Events
    story_id?: string; // alternative zu storyId für audio_complete
  };
}

export type TrackEventOptions = {
  accessToken?: string | null;
};

/**
 * Trackt ein Analytics-Event
 * Non-blocking - Fehler werden geloggt, blockieren aber nicht die App
 * 
 * WICHTIG: Diese Funktion sollte nur aufgerufen werden, wenn ein User eingeloggt ist.
 * Die API gibt 401 zurück, wenn kein User authentifiziert ist.
 */
export async function trackEvent(event: AnalyticsEvent, options: TrackEventOptions = {}): Promise<void> {
  console.log('trackEvent called:', event.eventType);
  try {
    // Hole Session-Token für Authorization Header (Fallback für Cookies)
    let accessToken: string | null = null;
    if (options.accessToken) {
      accessToken = options.accessToken;
    }
    try {
      if (!accessToken) {
        console.log('trackEvent: Trying to get session...');
        const { createSPAClient } = await import('@/lib/supabase/client');
        const supabase = createSPAClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('trackEvent: Session result:', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          sessionError: sessionError?.message,
        });
        accessToken = session?.access_token || null;
      }
    } catch (error) {
      console.error('trackEvent: Error getting session:', error);
      // Ignoriere Fehler beim Abrufen der Session
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Füge Session-Token als Header hinzu, falls vorhanden (Fallback, falls Cookies nicht funktionieren)
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      console.log('trackEvent: Authorization header set (first 50 chars):', `Bearer ${accessToken.substring(0, 50)}...`);
    } else {
      console.log('trackEvent: No access token available - will rely on cookies');
    }

    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers,
      credentials: 'include', // Wichtig: Cookies mitsenden
      body: JSON.stringify(event),
    }).catch((fetchError) => {
      // Netzwerk-Fehler (z.B. Server nicht erreichbar)
      console.warn('trackEvent: Network error (server might be starting):', fetchError.message);
      return null; // Return null statt Error zu werfen
    });

    // Wenn fetch fehlgeschlagen ist (z.B. Server startet noch), ignorieren
    if (!response) {
      console.log('trackEvent: Fetch failed, ignoring (server might be starting)');
      return;
    }

    console.log('trackEvent response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      // 401 = Unauthorized (normal, wenn kein User eingeloggt) - nicht loggen
      if (response.status === 401) {
        console.log('trackEvent: User not authenticated (401) - ignoring');
        // Stillschweigend ignorieren - User ist nicht eingeloggt
        return;
      }
      // Andere Fehler loggen (aber nicht werfen)
      const errorText = await response.text().catch(() => '');
      console.warn('trackEvent: Failed to track event:', response.status, response.statusText, errorText);
    } else {
      // Debug: Erfolgreiches Tracking loggen (kann später entfernt werden)
      const responseData = await response.json().catch(() => null);
      console.log('Analytics event tracked successfully:', event.eventType, responseData);
    }
  } catch (error: any) {
    // Alle anderen Fehler abfangen (z.B. JSON-Parsing, etc.)
    console.warn('trackEvent: Error tracking event (non-blocking):', error?.message || error);
    // Nicht blockieren - Tracking sollte non-blocking sein
  }
}

