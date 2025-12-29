"use server";

import { createSSRClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";

export interface AnalyticsEvent {
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

export interface AnalyticsStats {
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

export interface AnalyticsData {
  events: AnalyticsEvent[];
  stats: AnalyticsStats;
  isAdmin: boolean;
  error?: string;
}

export async function getAnalyticsData(
  startDate?: string,
  endDate?: string,
  eventType?: string
): Promise<AnalyticsData> {
  try {
    // First, check authentication with SSR client (reads cookies)
    const supabaseAuth = await createSSRClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return {
        events: [],
        stats: {
          totalEvents: 0,
          totalUsers: 0,
          audioCompletions: 0,
          resourcesCreated: 0,
          userLogins: 0,
          eventsByType: {},
          topResourceFigures: [],
          topVoices: [],
          eventsByDay: [],
        },
        isAdmin: false,
        error: "Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.",
      };
    }

    // Check admin status
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = adminEmails.includes(user.email?.toLowerCase() || "");

    if (!isAdmin) {
      return {
        events: [],
        stats: {
          totalEvents: 0,
          totalUsers: 0,
          audioCompletions: 0,
          resourcesCreated: 0,
          userLogins: 0,
          eventsByType: {},
          topResourceFigures: [],
          topVoices: [],
          eventsByDay: [],
        },
        isAdmin: false,
        error: "Du hast keine Berechtigung für das Admin-Dashboard.",
      };
    }

    // Now use admin client with service role to bypass RLS
    const supabaseAdmin = await createServerAdminClient();

    // Build query with admin client (bypasses RLS)
    // Query user_analytics table and join with user_profiles view to get user email
    let query = supabaseAdmin
      .from("user_analytics")
      .select(`
        *,
        user_profiles!user_analytics_user_id_fkey (
          email
        )
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    // Fetch events
    const { data: events, error: eventsError } = await query;

    console.log({events , eventsError})
    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return {
        events: [],
        stats: {
          totalEvents: 0,
          totalUsers: 0,
          audioCompletions: 0,
          resourcesCreated: 0,
          userLogins: 0,
          eventsByType: {},
          topResourceFigures: [],
          topVoices: [],
          eventsByDay: [],
        },
        isAdmin: true,
        error: "Fehler beim Laden der Analytics-Daten.",
      };
    }

    // Transform events to match AnalyticsEvent interface and extract email from joined profile
    const transformedEvents: AnalyticsEvent[] = events.map((event: any) => ({
      id: event.id,
      user_id: event.user_id,
      user_email: event.user_profiles?.email || null,
      event_type: event.event_type,
      story_id: event.story_id || undefined,
      resource_figure_name: event.resource_figure_name || undefined,
      voice_id: event.voice_id || undefined,
      metadata: event.metadata,
      created_at: event.created_at,
    }));

    // Filter relevant events
    const relevantEvents = transformedEvents.filter(
      (event: AnalyticsEvent) =>
        event.event_type === "user_login" ||
        event.event_type === "resource_created" ||
        event.event_type === "audio_play_complete"
    );

    // Calculate statistics
    const stats: AnalyticsStats = {
      totalEvents: relevantEvents.length,
      totalUsers: new Set(relevantEvents.map((e: AnalyticsEvent) => e.user_id)).size,
      audioCompletions: relevantEvents.filter(
        (e: AnalyticsEvent) => e.event_type === "audio_play_complete"
      ).length,
      resourcesCreated: relevantEvents.filter(
        (e: AnalyticsEvent) => e.event_type === "resource_created"
      ).length,
      userLogins: relevantEvents.filter((e: AnalyticsEvent) => e.event_type === "user_login")
        .length,
      eventsByType: {},
      topResourceFigures: [],
      topVoices: [],
      eventsByDay: [],
    };

    // Events by type
    relevantEvents.forEach((event: AnalyticsEvent) => {
      stats.eventsByType[event.event_type] =
        (stats.eventsByType[event.event_type] || 0) + 1;
    });

    // Top resource figures
    const figureCounts: Record<string, number> = {};
    relevantEvents.forEach((event: AnalyticsEvent) => {
      if (event.resource_figure_name) {
        figureCounts[event.resource_figure_name] =
          (figureCounts[event.resource_figure_name] || 0) + 1;
      }
    });
    stats.topResourceFigures = Object.entries(figureCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top voices
    const voiceCounts: Record<string, number> = {};
    relevantEvents.forEach((event: AnalyticsEvent) => {
      if (event.voice_id) {
        voiceCounts[event.voice_id] = (voiceCounts[event.voice_id] || 0) + 1;
      }
    });
    stats.topVoices = Object.entries(voiceCounts)
      .map(([voiceId, count]) => ({ voiceId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Events by day
    const dayCounts: Record<string, number> = {};
    relevantEvents.forEach((event: AnalyticsEvent) => {
      const day = event.created_at.split("T")[0];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    stats.eventsByDay = Object.entries(dayCounts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return {
      events: relevantEvents,
      stats,
      isAdmin: true,
    };
  } catch (error) {
    console.error("Error in getAnalyticsData:", error);
    return {
      events: [],
      stats: {
        totalEvents: 0,
        totalUsers: 0,
        audioCompletions: 0,
        resourcesCreated: 0,
        userLogins: 0,
        eventsByType: {},
        topResourceFigures: [],
        topVoices: [],
        eventsByDay: [],
      },
      isAdmin: false,
      error: "Ein unerwarteter Fehler ist aufgetreten.",
    };
  }
}
