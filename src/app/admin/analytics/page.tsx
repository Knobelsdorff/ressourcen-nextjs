"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  PlayCircle,
  CheckCircle,
  FileText,
  TrendingUp,
  Calendar,
  Volume2,
  BookOpen,
  ArrowLeft,
  RefreshCw,
  Download,
  Music,
} from "lucide-react";
import Link from "next/link";

interface AnalyticsEvent {
  id: string;
  user_id: string;
  user_email?: string | null;
  event_type: string;
  story_id?: string;
  resource_figure_name?: string;
  voice_id?: string;
  metadata?: any;
  created_at: string;
}

interface AnalyticsStats {
  totalEvents: number;
  totalUsers: number;
  audioCompletions: number;
  resourcesCreated: number;
  userLogins: number;
  eventsByType: Record<string, number>;
  topResourceFigures: Array<{ name: string; count: number }>;
  topVoices: Array<{ voiceId: string; count: number }>;
  eventsByDay: Array<{ day: string; count: number }>;
}

export default function AdminAnalytics() {
  const { user, loading: authLoading, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(50); // Events pro Seite

  // Prüfe ob User Admin ist
  const isAdmin = (() => {
    if (!user?.email) return false;
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return adminEmails.includes(user.email.toLowerCase());
  })();

  const fetchAnalytics = async () => {
    console.log('=== fetchAnalytics called ===');
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (eventType) params.append("eventType", eventType);
      
      const apiUrl = `/api/admin/analytics?${params.toString()}`;
      console.log('Admin Analytics Frontend: Calling API:', apiUrl);

      // Verwende Session direkt aus dem Auth-Hook (ist bereits vorhanden)
      // Fallback: Hole Session-Token direkt aus Supabase, falls Hook-Session nicht verfügbar ist
      let accessToken: string | null = null;
      
      if (session?.access_token) {
        // Verwende Session aus dem Hook
        accessToken = session.access_token;
      } else {
        // Fallback: Hole Session direkt aus Supabase
        const { createSPAClient } = await import('@/lib/supabase/client');
        const supabase = createSPAClient();
        const { data: { session: fetchedSession } } = await supabase.auth.getSession();
        accessToken = fetchedSession?.access_token || null;
      }
      
      // Debug: Log Session-Status (nur in Development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Admin Analytics Frontend: Session check', {
          hasSessionFromHook: !!session,
          hasAccessTokenFromHook: !!session?.access_token,
          hasAccessToken: !!accessToken,
          userFromHook: user?.email,
        });
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Füge Session-Token als Header hinzu, falls vorhanden (Fallback, falls Cookies nicht funktionieren)
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('Admin Analytics Frontend: Authorization header set (first 50 chars):', `Bearer ${accessToken.substring(0, 50)}...`);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('Admin Analytics Frontend: No access token available for Authorization header');
      }

      console.log('Admin Analytics Frontend: Making fetch request...');
      const response = await fetch(apiUrl, {
        credentials: 'include', // Wichtig: Cookies mitsenden
        headers,
      });
      console.log('Admin Analytics Frontend: Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });

      // Prüfe ob Response gültig ist
      if (!response.ok) {
        let errorMessage = "Fehler beim Laden der Analytics";
        let errorDetails: string | undefined;
        try {
          const errorData = await response.json();
          console.log('Admin Analytics Frontend: Error response:', errorData);
          if (response.status === 401) {
            errorMessage = "Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.";
          } else if (response.status === 403) {
            errorMessage = "Du hast keine Berechtigung für das Admin-Dashboard.";
          } else if (response.status === 500) {
            errorMessage = errorData.error || "Interner Serverfehler";
            errorDetails = errorData.details;
          } else {
            errorMessage = errorData.error || errorMessage;
          }
        } catch {
          // Wenn JSON-Parse fehlschlägt, verwende Status-Text
          if (response.status === 401) {
            errorMessage = "Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.";
          } else if (response.status === 403) {
            errorMessage = "Du hast keine Berechtigung für das Admin-Dashboard.";
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        }
        const error = new Error(errorMessage) as Error & { details?: string };
        if (errorDetails) {
          error.details = errorDetails;
        }
        throw error;
      }

      // Parse JSON
      let data;
      try {
        data = await response.json();
        const eventsCount = data.events?.length || 0;
        const eventTypes = data.events ? Array.from(new Set(data.events.map((e: any) => e.event_type))) : [];
        
        console.log('Admin Analytics Frontend: Response data:', {
          eventsCount,
          hasStats: !!data.stats,
          statsTotalEvents: data.stats?.totalEvents || 0,
          totalUsers: data.stats?.totalUsers || 0,
          uniqueUserIds: data.events ? Array.from(new Set(data.events.map((e: any) => e.user_id).filter(Boolean))).slice(0, 5).map((id: unknown) => String(id)) : [],
          eventTypes,
          firstEvent: data.events?.[0] ? {
            id: data.events[0].id,
            event_type: data.events[0].event_type,
            user_email: data.events[0].user_email,
            created_at: data.events[0].created_at,
          } : null,
        });
        
        // Detailliertes Logging für Debugging
        console.log(`Admin Analytics Frontend: Loaded ${eventsCount} events`);
        if (eventsCount > 0) {
          console.log('Admin Analytics Frontend: Event types found:', eventTypes);
          console.log('Admin Analytics Frontend: First 3 events:', data.events.slice(0, 3));
        } else {
          console.warn('Admin Analytics Frontend: NO EVENTS LOADED! Check API response.');
        }
        
        // Debug-Info aus API anzeigen (falls vorhanden)
        if (data._debug) {
          console.log('Admin Analytics Frontend: API Debug Info:', {
            totalEventsInDB: data._debug.totalEventsInDB,
            dashboardVisitCount: data._debug.dashboardVisitCount,
            audioPlayCount: data._debug.audioPlayCount,
            filteredUserLoginCount: data._debug.filteredUserLoginCount,
            relevantEventsCount: data._debug.relevantEventsCount,
            rawEventTypes: data._debug.rawEventTypes,
            eventTypeCounts: data._debug.eventTypeCounts,
          });
          
          // Detailliertes Logging für Event-Typen
          console.log('Admin Analytics Frontend: All event types in DB:', data._debug.rawEventTypes);
          console.log('Admin Analytics Frontend: Event type counts:', data._debug.eventTypeCounts);
          
          if (data._debug.totalEventsInDB > data._debug.relevantEventsCount) {
            const filteredCount = data._debug.totalEventsInDB - data._debug.relevantEventsCount;
            console.warn(`Admin Analytics Frontend: ${filteredCount} events were filtered out`);
            console.log('Admin Analytics Frontend: Breakdown:', {
              totalInDB: data._debug.totalEventsInDB,
              dashboardVisits: data._debug.dashboardVisitCount || 0,
              audioPlays: data._debug.audioPlayCount || 0,
              userLoginsDeduplicated: data._debug.filteredUserLoginCount || 0,
              relevant: data._debug.relevantEventsCount,
              filtered: filteredCount,
            });
          }
        }
        
        // Debug: Zeige alle User-IDs in den Events
        if (data.events && data.events.length > 0) {
          const allUserIds = new Set(data.events.map((e: any) => e.user_id).filter(Boolean));
          console.log('Admin Analytics Frontend: Unique users in events:', {
            count: allUserIds.size,
            userIds: Array.from(allUserIds).map((id: unknown) => String(id).substring(0, 8) + '...'),
          });
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Ungültige Antwort vom Server");
      }

      setEvents(data.events || []);
      setStats(data.stats || null);
      setCurrentPage(1); // Zurück zur ersten Seite, wenn neue Daten geladen werden
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der Analytics");
      console.error("Error fetching analytics:", err);
      if (err.details) {
        console.error("Error details:", err.details);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('=== Admin Analytics useEffect triggered ===', {
      authLoading,
      isAdmin,
      hasUser: !!user,
      hasSession: !!session,
      userEmail: user?.email,
    });
    
    // Warte, bis Auth vollständig geladen ist
    if (authLoading) {
      console.log('Admin Analytics: Waiting for auth to load...');
      return; // Warte noch...
    }

    // Nur laden, wenn User eingeloggt ist UND Admin ist UND Session vorhanden ist
    if (isAdmin && user && session) {
      console.log('Admin Analytics: Conditions met, calling fetchAnalytics...');
      fetchAnalytics();
    } else if (!user) {
      // User ist nicht eingeloggt
      console.log('Admin Analytics: No user - setting error');
      setLoading(false);
      setError("Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.");
    } else if (user && !isAdmin) {
      // User ist eingeloggt, aber nicht Admin
      console.log('Admin Analytics: User is not admin - setting error');
      setLoading(false);
      setError("Du hast keine Berechtigung für das Admin-Dashboard.");
    } else if (user && !session) {
      // User existiert, aber keine Session (Cookies fehlen)
      console.log('Admin Analytics: User exists but no session - setting error');
      setLoading(false);
      setError("Session-Cookies fehlen. Bitte melde dich erneut an.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, user, session, startDate, endDate, eventType]);

  // Completion-Rate: Da audio_play Events nicht mehr getrackt werden, zeigen wir N/A
  const completionRate = 'N/A';

  // Formatierung für Datum
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Formatierung für Event-Typ
  const formatEventType = (type: string) => {
    const translations: Record<string, string> = {
      audio_play_complete: "Audio vollständig",
      resource_created: "Ressource erstellt",
      user_login: "User eingeloggt",
    };
    return translations[type] || type;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-gray-700 mb-4">Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.</p>
          <Link
            href="/dashboard"
            className="inline-block bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-semibold mb-4">Zugriff verweigert</p>
          <p className="text-gray-700 mb-4">Du hast keine Berechtigung für das Admin-Dashboard.</p>
          <Link
            href="/dashboard"
            className="inline-block bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-2">
                Admin Analytics
              </h1>
              <p className="text-amber-700">Nutzerverhalten und Statistiken</p>
            </div>
            <Link
              href="/admin/music"
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Music className="w-4 h-4" />
              Musik verwalten
            </Link>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startdatum
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enddatum
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event-Typ
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Alle</option>
                <option value="user_login">User eingeloggt</option>
                <option value="resource_created">Ressource erstellt</option>
                <option value="audio_play_complete">Audio vollständig</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Aktualisieren
              </button>
            </div>
          </div>
        </div>

        {(loading || authLoading) && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-4" />
            <p className="text-gray-600">
              {authLoading ? "Lade Authentifizierung..." : "Lade Analytics..."}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <p className="text-red-700 mb-4 font-semibold">{error}</p>
            {process.env.NODE_ENV === 'development' && (
              <>
                <div className="mb-4 p-3 bg-red-100 rounded-lg text-sm text-red-600">
                  <p><strong>Debug-Info:</strong></p>
                  <p>User eingeloggt: {user ? 'Ja' : 'Nein'}</p>
                  <p>Session vorhanden: {session ? 'Ja' : 'Nein'}</p>
                  <p>Admin-Status: {isAdmin ? 'Ja' : 'Nein'}</p>
                  {user && <p>E-Mail: {user.email}</p>}
                </div>
                {/* Zeige Error-Details, wenn verfügbar (z.B. Stack-Trace bei 500-Fehler) */}
                {error.includes('Interner Serverfehler') && (
                  <div className="mb-4 p-3 bg-red-100 rounded-lg text-xs text-red-600 font-mono overflow-auto max-h-64">
                    <p><strong>Bitte prüfe die Terminal-Logs für Details.</strong></p>
                  </div>
                )}
              </>
            )}
            {!user && (
              <Link
                href="/dashboard"
                className="inline-block bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Zum Dashboard / Login
              </Link>
            )}
          </div>
        )}

        {!loading && !error && stats && (
          <>
            {/* Statistik-Karten */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
                <p className="text-sm text-gray-600">Gesamt Events</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-sm text-gray-600">Aktive Nutzer</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.resourcesCreated}</p>
                <p className="text-sm text-gray-600">Ressourcen erstellt</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <PlayCircle className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">-</p>
                <p className="text-sm text-gray-600">Audio-Plays (nicht mehr getrackt)</p>
              </motion.div>
            </div>

            {/* Detaillierte Statistiken */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Audio-Statistiken */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Volume2 className="w-6 h-6 text-amber-600" />
                  Audio-Statistiken
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Audio vollständig:</span>
                    <span className="font-semibold text-gray-900">{stats.audioCompletions}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-700">Completion-Rate:</span>
                    <span className="font-semibold text-green-600">{completionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Top Ressourcenfiguren */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-amber-600" />
                  Top Ressourcenfiguren
                </h2>
                <div className="space-y-2">
                  {stats.topResourceFigures.length > 0 ? (
                    stats.topResourceFigures.map((figure, index) => (
                      <div key={figure.name} className="flex justify-between items-center">
                        <span className="text-gray-700">
                          {index + 1}. {figure.name}
                        </span>
                        <span className="font-semibold text-gray-900">{figure.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Keine Daten verfügbar</p>
                  )}
                </div>
              </div>
            </div>

            {/* Events nach Typ */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-amber-600" />
                Events nach Typ
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.eventsByType).map(([type, count]) => (
                  <div key={type} className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600 mt-1">{formatEventType(type)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Events nach Tag */}
            {stats.eventsByDay.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-amber-600" />
                  Events nach Tag
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stats.eventsByDay.map((day) => (
                    <div key={day.day} className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-700">
                        {new Date(day.day).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-semibold text-gray-900">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User-Statistiken */}
            {(() => {
              // Berechne Statistiken pro User
              const statsByUser: Record<string, {
                resourcesCreated: number;
                audioCompletions: number;
                userLogins: number;
                totalEvents: number;
              }> = {};
              
              events.forEach((event) => {
                const email = event.user_email || 'Unbekannt';
                if (!statsByUser[email]) {
                  statsByUser[email] = {
                    resourcesCreated: 0,
                    audioCompletions: 0,
                    userLogins: 0,
                    totalEvents: 0,
                  };
                }
                
                statsByUser[email].totalEvents++;
                
                if (event.event_type === 'resource_created') {
                  statsByUser[email].resourcesCreated++;
                } else if (event.event_type === 'audio_play_complete') {
                  statsByUser[email].audioCompletions++;
                } else if (event.event_type === 'user_login') {
                  statsByUser[email].userLogins++;
                }
                // audio_play Events werden nicht mehr getrackt
              });
              
              const sortedUsers = Object.entries(statsByUser)
                .sort(([, a], [, b]) => b.totalEvents - a.totalEvents);
              
              return (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-amber-600" />
                    User-Statistiken
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Email</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Logins</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Ressourcen erstellt</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Audio vollständig</th>
                          <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Gesamt Events</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedUsers.map(([userEmail, userStats]) => (
                          <tr key={userEmail} className="border-b hover:bg-amber-50">
                            <td className="py-2 px-4 text-sm text-gray-900 font-medium">{userEmail}</td>
                            <td className="py-2 px-4 text-sm text-gray-600">{userStats.userLogins}</td>
                            <td className="py-2 px-4 text-sm text-gray-600">{userStats.resourcesCreated}</td>
                            <td className="py-2 px-4 text-sm text-gray-600">{userStats.audioCompletions}</td>
                            <td className="py-2 px-4 text-sm text-gray-900 font-semibold">{userStats.totalEvents}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Event-Liste */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-amber-600" />
                Event-Details ({events.length} insgesamt)
              </h2>
              
              {/* Pagination Info */}
              {events.length > 0 && (() => {
                const totalPages = Math.ceil(events.length / pageSize);
                const startIndex = (currentPage - 1) * pageSize;
                const endIndex = Math.min(startIndex + pageSize, events.length);
                const paginatedEvents = events.slice(startIndex, endIndex);
                
                return (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Zeige {startIndex + 1} - {endIndex} von {events.length} Events
                      </p>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            ← Vorherige
                          </button>
                          <span className="text-sm text-gray-700">
                            Seite {currentPage} von {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Nächste →
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Seitenzahlen (wenn mehr als 5 Seiten) */}
                    {totalPages > 5 && (
                      <div className="mb-4 flex items-center justify-center gap-1 flex-wrap">
                        {/* Erste Seite */}
                        {currentPage > 3 && (
                          <>
                            <button
                              onClick={() => setCurrentPage(1)}
                              className="px-2 py-1 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                            >
                              1
                            </button>
                            {currentPage > 4 && <span className="text-gray-400">...</span>}
                          </>
                        )}
                        
                        {/* Seiten um aktuelle Seite */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          if (pageNum < 1 || pageNum > totalPages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-2 py-1 text-sm rounded transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        {/* Letzte Seite */}
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && <span className="text-gray-400">...</span>}
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              className="px-2 py-1 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Zeitpunkt</th>
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Event</th>
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Ressourcenfigur</th>
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">User Email</th>
                            <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">User ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedEvents.map((event) => (
                            <tr key={event.id} className="border-b hover:bg-amber-50">
                              <td className="py-2 px-4 text-sm text-gray-600">
                                {formatDate(event.created_at)}
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-900">
                                {formatEventType(event.event_type)}
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-600">
                                {event.resource_figure_name || "-"}
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-900 font-medium">
                                {event.user_email || "-"}
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-600">
                                {event.user_id ? event.user_id.substring(0, 8) + "..." : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination Controls am Ende */}
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Erste Seite
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            ← Vorherige
                          </button>
                          <span className="text-sm text-gray-700 px-3">
                            Seite {currentPage} von {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Nächste →
                          </button>
                        </div>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Letzte Seite
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
              
              {events.length === 0 && (
                <p className="text-center py-8 text-gray-500">Keine Events gefunden</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

