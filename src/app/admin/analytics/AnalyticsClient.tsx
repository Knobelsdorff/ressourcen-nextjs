"use client";

import { useState, useTransition, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  PlayCircle,
  FileText,
  Volume2,
  BookOpen,
  ArrowLeft,
  RefreshCw,
  Music,
  X,
  Pause,
  Calendar,
  TrendingUp,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { questions } from "@/data/questions";
import { DataTable } from "@/components/DataTable";
import type { AnalyticsEvent, AnalyticsStats } from "./actions";
import { T, useTextFn } from "@/components/site-text/T";
import { admin } from "@/content/texts/admin";

interface SentResource {
  id: string;
  title: string | null;
  client_email: string | null;
  created_at: string;
  audio_url: string | null;
  resource_figure?: { name?: string } | string | null;
}

interface AnalyticsClientProps {
  initialEvents: AnalyticsEvent[];
  initialStats: AnalyticsStats;
  initialStartDate?: string;
  initialEndDate?: string;
  initialEventType?: string;
}

export function AnalyticsClient({
  initialEvents,
  initialStats,
  initialStartDate = "",
  initialEndDate = "",
  initialEventType = "",
}: AnalyticsClientProps) {
  const tx = useTextFn();
  const [events, setEvents] = useState(initialEvents);
  const [stats, setStats] = useState(initialStats);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [eventType, setEventType] = useState(initialEventType);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [showResourceDetails, setShowResourceDetails] = useState(false);
  const [isPlayingResource, setIsPlayingResource] = useState(false);
  const [resourceAudioElement, setResourceAudioElement] =
    useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resendingResourceId, setResendingResourceId] = useState<string | null>(null);
  const [sentResources, setSentResources] = useState<SentResource[]>([]);
  const [sentResourcesLoading, setSentResourcesLoading] = useState(true);
  const [sentResourcesError, setSentResourcesError] = useState<string | null>(null);
  const [sentListSearch, setSentListSearch] = useState("");

  const loadSentResources = useCallback(async () => {
    setSentResourcesLoading(true);
    setSentResourcesError(null);
    try {
      const response = await fetch("/api/admin/resources/list-sent", {
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || tx(admin["analytics.sent.loadError"]));
      }
      setSentResources(Array.isArray(data.resources) ? data.resources : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : tx(admin["common.unknownError"]);
      setSentResourcesError(msg);
      setSentResources([]);
    } finally {
      setSentResourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSentResources();
  }, [loadSentResources]);

  const filteredSentResources = useMemo(() => {
    const q = sentListSearch.trim().toLowerCase();
    if (!q) return sentResources;
    return sentResources.filter((r) => {
      const email = (r.client_email || "").toLowerCase();
      const title = (r.title || "").toLowerCase();
      const fig =
        typeof r.resource_figure === "object" && r.resource_figure?.name
          ? String(r.resource_figure.name).toLowerCase()
          : "";
      return email.includes(q) || title.includes(q) || fig.includes(q);
    });
  }, [sentResources, sentListSearch]);

  // Cleanup audio element
  useEffect(() => {
    return () => {
      if (resourceAudioElement) {
        resourceAudioElement.pause();
        resourceAudioElement.currentTime = 0;
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    };
  }, [resourceAudioElement]);

  const handleRefresh = () => {
    startTransition(async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (eventType) params.set("eventType", eventType);

      const url = `/admin/analytics${params.toString() ? `?${params.toString()}` : ""}`;
      window.location.href = url;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatEventType = (type: string) => {
    const translations: Record<string, string> = {
      audio_play_complete: tx(admin["analytics.event.completed"]),
      resource_created: tx(admin["analytics.event.created"]),
      user_login: tx(admin["analytics.event.login"]),
    };
    return translations[type] || type;
  };

  const handlePlayResource = async (storyId: string, userEmail?: string | null) => {
    // Open modal immediately with loading state
    setSelectedResource({ loading: true });
    setShowResourceDetails(true);

    try {
      const response = await fetch(`/api/admin/resources/search?storyId=${storyId}`);

      if (!response.ok) {
        throw new Error(tx(admin["analytics.error.notFound"]));
      }

      const data = await response.json();
      const resource = data.resource;

      if (resource) {
        console.log("Loaded resource:", resource);
        setSelectedResource(resource);
      } else {
        setShowResourceDetails(false);
        alert(tx(admin["analytics.error.notFound"]));
      }
    } catch (error: any) {
      console.error("Error loading resource:", error);
      setShowResourceDetails(false);
      alert(tx(admin["analytics.error.load"], { message: error.message || tx(admin["common.unknownError"]) }));
    }
  };

  const handlePlayResourceByName = async (
    resourceName: string,
    userEmail?: string | null
  ) => {
    // Open modal immediately with loading state
    setSelectedResource({ loading: true });
    setShowResourceDetails(true);

    try {
      const params = new URLSearchParams();
      params.append("q", resourceName);
      if (userEmail) {
        params.append("email", userEmail);
      }

      const searchUrl = `/api/admin/resources/search?${params.toString()}`;
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(tx(admin["analytics.error.notFoundStatus"], { status: response.status }));
      }

      const data = await response.json();
      const resources = data.resources || [];

      const resource = resources.find((r: any) => {
        const titleMatch = r.title?.toLowerCase() === resourceName.toLowerCase();
        const figureStringMatch =
          typeof r.resource_figure === "string" &&
          r.resource_figure.toLowerCase() === resourceName.toLowerCase();
        const figureObjectMatch =
          typeof r.resource_figure === "object" &&
          r.resource_figure?.name?.toLowerCase() === resourceName.toLowerCase();
        const titleContains = r.title?.toLowerCase().includes(resourceName.toLowerCase());

        return titleMatch || figureStringMatch || figureObjectMatch || titleContains;
      });

      if (resource) {
        console.log("Loaded resource:", resource);
        setSelectedResource(resource);
      } else {
        setShowResourceDetails(false);
        let errorMessage = tx(admin["analytics.error.notFoundByName"], {
          name: resourceName,
          forUser: userEmail ? tx(admin["analytics.error.forUser"], { email: userEmail }) : "",
        });
        if (resources.length > 0) {
          errorMessage += `\n\n${tx(admin["analytics.error.foundOthers"], { count: resources.length })}`;
        }
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error("Error loading resource by name:", error);
      setShowResourceDetails(false);
      alert(tx(admin["analytics.error.load"], { message: error.message || tx(admin["common.unknownError"]) }));
    }
  };


  const handleResendClientEmail = async (resourceId: string | undefined) => {
    if (!resourceId) {
      alert(tx(admin["analytics.error.noStoryId"]));
      return;
    }
    setResendingResourceId(resourceId);
    try {
      const response = await fetch("/api/admin/resources/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ resourceId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.error || data.details || tx(admin["analytics.error.sendFailed"]));
        return;
      }
      alert(tx(admin["analytics.sent.success"], { email: data.clientEmail || tx(admin["analytics.sent.clientFallback"]) }));
      void loadSentResources();
    } catch (e: any) {
      console.error("Resend error:", e);
      alert(e?.message || tx(admin["analytics.error.network"]));
    } finally {
      setResendingResourceId(null);
    }
  };

  const closeResourceModal = () => {
    if (resourceAudioElement) {
      resourceAudioElement.pause();
      resourceAudioElement.currentTime = 0;
      setIsPlayingResource(false);
    }
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    setShowResourceDetails(false);
    setSelectedResource(null);
    setResourceAudioElement(null);
    setCurrentTime(0);
    setDuration(0);
  };

  const handlePlayAudio = () => {
    if (!selectedResource?.audio_url) return;

    let audio = resourceAudioElement;
    if (!audio) {
      audio = new Audio(selectedResource.audio_url);
      audio.addEventListener("ended", () => {
        setIsPlayingResource(false);
        setCurrentTime(0);
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
          timeUpdateIntervalRef.current = null;
        }
      });
      audio.addEventListener("loadedmetadata", () => {
        if (audio) {
          setDuration(audio.duration || 0);
        }
      });
      audio.addEventListener("timeupdate", () => {
        if (audio) {
          setCurrentTime(audio.currentTime || 0);
        }
      });
      setResourceAudioElement(audio);
    }

    audio
      .play()
      .then(() => {
        setIsPlayingResource(true);
        setDuration(audio.duration || 0);
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
        }
        timeUpdateIntervalRef.current = setInterval(() => {
          if (audio) {
            setCurrentTime(audio.currentTime || 0);
          }
        }, 100);
      })
      .catch((error) => {
        console.error("Error playing audio:", error);
        alert(tx(admin["analytics.error.play"]));
      });
  };

  const handlePauseAudio = () => {
    if (resourceAudioElement) {
      resourceAudioElement.pause();
      setIsPlayingResource(false);
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    }
  };

  // Calculate user statistics
  const userData = (() => {
    const statsByUser: Record<
      string,
      {
        email: string;
        resourcesCreated: number;
        audioCompletions: number;
        userLogins: number;
        totalEvents: number;
      }
    > = {};

    events.forEach((event) => {
      const email = event.user_email || tx(admin["common.unknown"]);
      if (!statsByUser[email]) {
        statsByUser[email] = {
          email,
          resourcesCreated: 0,
          audioCompletions: 0,
          userLogins: 0,
          totalEvents: 0,
        };
      }

      statsByUser[email].totalEvents++;

      if (event.event_type === "resource_created") {
        statsByUser[email].resourcesCreated++;
      } else if (event.event_type === "audio_play_complete") {
        statsByUser[email].audioCompletions++;
      } else if (event.event_type === "user_login") {
        statsByUser[email].userLogins++;
      }
    });

    return Object.values(statsByUser);
  })();

  // Calculate recent logins - get most recent login for each user
  const recentLogins = (() => {
    const loginsByUser: Record<string, AnalyticsEvent> = {};

    events
      .filter((event) => event.event_type === "user_login")
      .forEach((event) => {
        const email = event.user_email || tx(admin["common.unknown"]);
        // Keep only the most recent login (events are already sorted by created_at desc)
        if (!loginsByUser[email]) {
          loginsByUser[email] = event;
        }
      });

    return Object.values(loginsByUser);
  })();

  return (
    <div className="min-h-screen wellness-page-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="wellness-admin-heading sm:mb-8 mb-4">
          <Link
            href="/dashboard"
            className="inline-flex max-sm:text-sm items-center gap-2 text-primary-700 hover:text-primary-800 sm:mb-4 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <T t={admin["common.backToDashboard"]} />
          </Link>
          <div className="flex max-sm:flex-col max-sm:gap-2 sm:items-center justify-between">
            <div>
              <h1 className="sm:text-3xl text-xl md:text-4xl font-bold text-primary-900 sm:mb-2 mb-1">
                <T t={admin["analytics.title"]} />
              </h1>
              <p className="text-primary-700 max-sm:text-sm"><T t={admin["analytics.subtitle"]} /></p>
            </div>
            <Link
              href="/admin/music"
              className="inline-flex max-sm:justify-center items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors max-sm:text-sm"
            >
              <Music className="w-4 h-4" />
              <T t={admin["analytics.music"]} />
            </Link>
          </div>
        </div>

        {/* Filter */}
        <div className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3 sm:mb-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 sm:gap-4 gap-2">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                <T t={admin["analytics.startDate"]} />
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-base text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                <T t={admin["analytics.endDate"]} />
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-base text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                <T t={admin["analytics.eventType"]} />
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-base text-sm"
              >
                <option value="">{tx(admin["analytics.all"])}</option>
                <option value="user_login">{tx(admin["analytics.event.login"])}</option>
                <option value="resource_created">{tx(admin["analytics.event.created"])}</option>
                <option value="audio_play_complete">{tx(admin["analytics.event.completed"])}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRefresh}
                disabled={isPending}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 max-sm:text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                <T t={admin["analytics.refresh"]} />
              </button>
            </div>
          </div>
        </div>

        {/* Statistik-Karten */}
        <div className="wellness-metrics grid grid-cols-2 lg:grid-cols-4 sm:gap-4 gap-2 sm:mb-6 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-primary-600" />
            </div>
            <p className="sm:text-2xl text-xl font-bold text-secondary-900">{stats.totalEvents}</p>
            <p className="text-sm text-secondary-600"><T t={admin["analytics.totalEvents"]} /></p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <p className="sm:text-2xl text-xl font-bold text-secondary-900">{stats.totalUsers}</p>
            <p className="text-sm text-secondary-600"><T t={admin["analytics.activeUsers"]} /></p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <p className="sm:text-2xl text-xl font-bold text-secondary-900">
              {stats.resourcesCreated}
            </p>
            <p className="text-sm text-secondary-600"><T t={admin["analytics.resourcesCreated"]} /></p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <PlayCircle className="w-8 h-8 text-purple-600" />
            </div>
            <p className="sm:text-2xl text-xl font-bold text-secondary-900">
              {stats.audioCompletions}
            </p>
            <p className="text-sm text-secondary-600"><T t={admin["analytics.event.completed"]} /></p>
          </motion.div>
        </div>

        {/* Detaillierte Statistiken */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Audio-Statistiken */}
          <div className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3">
            <h2 className="sm:text-xl text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
              <Volume2 className="w-6 h-6 text-primary-600" />
              <T t={admin["analytics.audioStats"]} />
            </h2>
            <div className="sm:space-y-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-secondary-700 max-sm:text-sm"><T t={admin["analytics.audioCompleted"]} /></span>
                <span className="font-semibold text-secondary-900">{stats.audioCompletions}</span>
              </div>
            </div>
          </div>

          {/* Top Ressourcenfiguren */}
          <div className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3">
            <h2 className="sm:text-xl text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary-600" />
              <T t={admin["analytics.topFigures"]} />
            </h2>
            <div className="space-y-2">
              {stats.topResourceFigures.length > 0 ? (
                stats.topResourceFigures.map((figure, index) => (
                  <div key={figure.name} className="flex justify-between items-center">
                    <span className="text-secondary-700 max-sm:text-sm">
                      {index + 1}. {figure.name}
                    </span>
                    <span className="font-semibold text-secondary-900 max-sm:text-sm">
                      {figure.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-secondary-500 text-sm"><T t={admin["table.empty"]} /></p>
              )}
            </div>
          </div>
        </div>

        {/* Events nach Typ */}
        <div className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3 mb-6">
          <h2 className="sm:text-xl text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <T t={admin["analytics.eventsByType"]} />
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.eventsByType).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-primary-50 rounded-lg">
                <p className="sm:text-2xl text-xl font-bold text-secondary-900">{count}</p>
                <p className="text-sm text-secondary-600 mt-1">{formatEventType(type)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Events nach Tag */}
        {stats.eventsByDay.length > 0 && (
          <div className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3 mb-6">
            <h2 className="sm:text-xl text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary-600" />
              <T t={admin["analytics.eventsByDay"]} />
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.eventsByDay.map((day) => (
                <div key={day.day} className="flex justify-between items-center py-2 border-b">
                  <span className="text-secondary-700 max-sm:text-sm">
                    {new Date(day.day).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-semibold text-secondary-900">{day.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Versendete Power Storys (Klient:innen) – aus saved_stories, unabhängig von Analytics-Events */}
        <div className="wellness-panel bg-white rounded-xl shadow-lg sm:p-6 p-3 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="sm:text-xl text-lg font-bold text-secondary-900 flex items-center gap-2">
              <Mail className="w-6 h-6 text-green-600" />
              <span><T t={admin["analytics.sent.title"]} /></span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <input
                type="search"
                placeholder={tx(admin["analytics.sent.filter"])}
                value={sentListSearch}
                onChange={(e) => setSentListSearch(e.target.value)}
                className="px-3 py-2 border border-secondary-300 rounded-lg text-sm w-full sm:w-64"
              />
              <button
                type="button"
                onClick={() => void loadSentResources()}
                disabled={sentResourcesLoading}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-primary-300 text-primary-900 hover:bg-primary-50 text-sm disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${sentResourcesLoading ? "animate-spin" : ""}`} />
                <T t={admin["analytics.sent.reload"]} />
              </button>
            </div>
          </div>
          <p className="text-sm text-secondary-600 mb-3">
            <T t={admin["analytics.sent.note"]} />
          </p>
          {sentResourcesError ? (
            <p className="text-red-600 text-sm">{sentResourcesError}</p>
          ) : null}
          {sentResourcesLoading && sentResources.length === 0 ? (
            <div className="flex items-center gap-2 text-secondary-600 py-8 justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-primary-600" />
              <span><T t={admin["analytics.sent.loading"]} /></span>
            </div>
          ) : (
            <DataTable<SentResource>
              data={filteredSentResources}
              columns={[
                {
                  key: "created_at",
                  label: tx(admin["analytics.col.time"]),
                  sortable: true,
                  render: (value) => formatDate(value),
                  width: "180px",
                },
                {
                  key: "client_email",
                  label: tx(admin["analytics.col.clientEmail"]),
                  sortable: true,
                  render: (value) => (
                    <span className="font-medium text-secondary-900">{value || "—"}</span>
                  ),
                },
                {
                  key: "title",
                  label: tx(admin["analytics.col.titleFigure"]),
                  sortable: true,
                  render: (_value, row) => (
                    <span className="text-secondary-800">
                      {row.title ||
                        (typeof row.resource_figure === "object" &&
                        row.resource_figure &&
                        "name" in row.resource_figure
                          ? (row.resource_figure as { name: string }).name
                          : null) ||
                        "—"}
                    </span>
                  ),
                },
                {
                  key: "id",
                  label: tx(admin["analytics.col.storyIdShort"]),
                  sortable: true,
                  render: (value: string) => (
                    <span title={value} className="font-mono text-xs text-secondary-500 cursor-help">
                      {value ? `${value.substring(0, 8)}…` : "—"}
                    </span>
                  ),
                  width: "110px",
                },
                {
                  key: "_resendSent",
                  label: tx(admin["analytics.col.email"]),
                  sortable: false,
                  align: "center" as const,
                  width: "140px",
                  render: (_v, row) =>
                    row.id && row.client_email ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleResendClientEmail(row.id);
                        }}
                        disabled={resendingResourceId === row.id}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={tx(admin["analytics.resendTitle"])}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {resendingResourceId === row.id ? "…" : tx(admin["analytics.resend"])}
                      </button>
                    ) : (
                      <span className="text-secondary-400 text-xs">—</span>
                    ),
                },
              ]}
              pageSize={15}
              searchable={false}
              exportable={true}
              emptyMessage={
                sentListSearch.trim()
                  ? tx(admin["analytics.sent.noMatch"])
                  : tx(admin["analytics.sent.empty"])
              }
            />
          )}
        </div>

        {/* User-Statistiken */}
        <DataTable
          data={userData}
          columns={[
            {
              key: "email",
              label: tx(admin["analytics.col.userEmailShort"]),
              sortable: true,
              render: (value) => <span className="font-medium text-secondary-900">{value}</span>,
            },
            {
              key: "userLogins",
              label: tx(admin["analytics.col.logins"]),
              sortable: true,
              align: "center" as const,
              width: "100px",
              render: (value) => <span className="text-secondary-600">{value}</span>,
            },
            {
              key: "resourcesCreated",
              label: tx(admin["analytics.resourcesCreated"]),
              sortable: true,
              align: "center" as const,
              width: "150px",
              render: (value) => <span className="text-secondary-600">{value}</span>,
            },
            {
              key: "audioCompletions",
              label: tx(admin["analytics.event.completed"]),
              sortable: true,
              align: "center" as const,
              width: "150px",
              render: (value) => <span className="text-secondary-600">{value}</span>,
            },
            {
              key: "totalEvents",
              label: tx(admin["analytics.totalEvents"]),
              sortable: true,
              align: "center" as const,
              width: "120px",
              render: (value) => <span className="font-semibold text-secondary-900">{value}</span>,
            },
          ]}
          pageSize={10}
          searchable={true}
          exportable={true}
          title={
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-600" />
              <span><T t={admin["analytics.userStats"]} /></span>
            </div>
          }
          emptyMessage={tx(admin["analytics.userStatsEmpty"])}
          className="mb-6"
        />

        {/* Ressourcen-Erstellung Tabelle */}
        <DataTable
          data={events.filter((e) => e.event_type === "resource_created")}
          columns={[
            {
              key: "created_at",
              label: tx(admin["analytics.col.time"]),
              sortable: true,
              render: (value) => formatDate(value),
              width: "180px",
            },
            {
              key: "user_email",
              label: tx(admin["analytics.col.userEmail"]),
              sortable: true,
              render: (value) => (
                <span className="font-medium text-secondary-900">{value || "-"}</span>
              ),
            },
            {
              key: "resource_figure_name",
              label: tx(admin["analytics.col.figure"]),
              sortable: true,
              render: (value, row: AnalyticsEvent) => {
                if (!value) return "-";
                return row.story_id ? (
                  <button
                    onClick={() => handlePlayResource(row.story_id!, row.user_email)}
                    className="text-primary-600 hover:text-primary-800 hover:underline cursor-pointer transition-colors"
                    title={tx(admin["analytics.listen"])}
                  >
                    {value}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlayResourceByName(value, row.user_email)}
                    className="text-primary-600 hover:text-primary-800 hover:underline cursor-pointer transition-colors"
                    title={tx(admin["analytics.listenByName"])}
                  >
                    {value}
                  </button>
                );
              },
            },
            {
              key: "story_id",
              label: tx(admin["analytics.col.storyId"]),
              sortable: true,
              render: (value) =>
                value ? (
                  <span title={value} className="cursor-help font-mono text-xs text-secondary-500">
                    {value.substring(0, 8)}...
                  </span>
                ) : (
                  <span className="text-secondary-400">-</span>
                ),
              width: "120px",
            },
            {
              key: "_resend",
              label: tx(admin["analytics.col.email"]),
              sortable: false,
              align: "center" as const,
              width: "140px",
              render: (_value, row: AnalyticsEvent) =>
                row.story_id ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResendClientEmail(row.story_id);
                    }}
                    disabled={resendingResourceId === row.story_id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={tx(admin["analytics.resendTitleClient"])}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {resendingResourceId === row.story_id ? "…" : tx(admin["analytics.resend"])}
                  </button>
                ) : (
                  <span className="text-secondary-400 text-xs">—</span>
                ),
            },
            {
              key: "voice_id",
              label: tx(admin["analytics.col.voice"]),
              sortable: true,
              render: (value) => (
                <span className="text-sm text-secondary-600">{value || "-"}</span>
              ),
              width: "150px",
            },
          ]}
          pageSize={20}
          searchable={true}
          exportable={true}
          title={
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-green-600" />
              <span><T t={admin["analytics.created.title"]} vars={{ count: events.filter((e) => e.event_type === "resource_created").length }} /></span>
            </div>
          }
          emptyMessage={tx(admin["analytics.created.empty"])}
          className="mb-6"
        />

        {/* Recent Logins Table */}
        <DataTable
          data={recentLogins}
          columns={[
            {
              key: "user_email",
              label: tx(admin["analytics.col.userEmail"]),
              sortable: true,
              render: (value) => (
                <span className="font-medium text-secondary-900">{value || "-"}</span>
              ),
            },
            {
              key: "created_at",
              label: tx(admin["analytics.col.lastLogin"]),
              sortable: true,
              render: (value) => formatDate(value),
              width: "180px",
            },
            {
              key: "user_id",
              label: tx(admin["analytics.col.userId"]),
              sortable: true,
              render: (value) => (
                <span className="font-mono text-xs text-secondary-600">
                  {value ? value.substring(0, 8) + "..." : "-"}
                </span>
              ),
              width: "120px",
            },
          ]}
          pageSize={20}
          searchable={true}
          exportable={true}
          title={
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-600" />
              <span><T t={admin["analytics.logins.title"]} vars={{ count: recentLogins.length }} /></span>
            </div>
          }
          emptyMessage={tx(admin["analytics.logins.empty"])}
          className="mb-6"
        />
      </div>

      {/* Resource Details Modal */}
      {showResourceDetails && selectedResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeResourceModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                {selectedResource.resource_figure && (
                  <h2 className="sm:text-2xl text-xl font-bold text-secondary-900">
                    <T t={admin["analytics.modal.figure"]} />{" "}
                    {typeof selectedResource.resource_figure === "string"
                      ? selectedResource.resource_figure
                      : selectedResource.resource_figure?.name || tx(admin["common.unknown"])}
                  </h2>
                )}
                {!selectedResource.loading && selectedResource.client_email && (
                  <p className="text-sm text-secondary-600 mt-1">
                    <T t={admin["analytics.modal.clientEmail"]} />{" "}
                    <span className="font-medium">{selectedResource.client_email}</span>
                  </p>
                )}
              </div>
              <button
                onClick={closeResourceModal}
                className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedResource.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
                    <p className="text-secondary-500"><T t={admin["analytics.modal.loading"]} /></p>
                  </div>
                </div>
              ) : selectedResource.question_answers &&
                Array.isArray(selectedResource.question_answers) &&
                selectedResource.question_answers.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold mb-4"><T t={admin["analytics.modal.qa"]} /></h3>
                  {selectedResource.question_answers.map((qa: any, qaIndex: number) => {
                    const question = questions.find((q) => q.id === qa.questionId);

                    return (
                      <div
                        key={`qa-${qaIndex}`}
                        className="border border-secondary-200 rounded-lg p-4"
                      >
                        <h4 className="font-semibold text-secondary-900 mb-2">
                          <T t={admin["analytics.modal.question"]} vars={{ number: qa.questionId, title: question?.title || tx(admin["analytics.modal.questionFallback"], { number: qa.questionId }) }} />
                        </h4>
                        <p className="text-sm text-secondary-600 mb-3">{question?.question}</p>

                        {qa.selectedBlocks && qa.selectedBlocks.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-secondary-700 mb-2">
                              <T t={admin["analytics.modal.selected"]} />
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {qa.selectedBlocks.map((block: string, blockIndex: number) => (
                                <li
                                  key={`qa-${qaIndex}-block-${blockIndex}`}
                                  className="text-sm text-secondary-600"
                                >
                                  {block}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {qa.answer && qa.answer.trim() && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-secondary-700 mb-1">
                              <T t={admin["analytics.modal.ownText"]} />
                            </p>
                            <p className="text-sm text-secondary-600 bg-secondary-50 p-2 rounded">
                              {qa.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500 mb-2"><T t={admin["analytics.modal.noQa"]} /></p>
                  <p className="text-xs text-secondary-400">
                    <T t={admin["analytics.modal.noQaNote"]} />
                  </p>
                </div>
              )}
            </div>

            {/* Footer: E-Mail erneut senden / Abspielen */}
            {!selectedResource.loading &&
              (selectedResource.audio_url ||
                (selectedResource.id && selectedResource.client_email)) && (
              <div className="p-6 border-t flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  {selectedResource.audio_url &&
                    isPlayingResource &&
                    resourceAudioElement && (
                    <div className="flex items-center gap-2 text-sm text-secondary-600">
                      <span>
                        {Math.floor(currentTime)}s / {Math.floor(duration)}s
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedResource.id && selectedResource.client_email ? (
                    <button
                      type="button"
                      onClick={() => handleResendClientEmail(selectedResource.id)}
                      disabled={resendingResourceId === selectedResource.id}
                      className="px-4 py-3 bg-primary-100 hover:bg-primary-200 text-primary-900 rounded-lg font-medium transition-colors flex items-center gap-2 border border-primary-300 disabled:opacity-50"
                    >
                      <Mail className="w-5 h-5" />
                      <T t={resendingResourceId === selectedResource.id ? admin["analytics.modal.sending"] : admin["analytics.modal.resend"]} />
                    </button>
                  ) : null}
                  {selectedResource.audio_url ? (
                    isPlayingResource ? (
                      <button
                        onClick={handlePauseAudio}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Pause className="w-5 h-5" />
                        <T t={admin["analytics.modal.pause"]} />
                      </button>
                    ) : (
                      <button
                        onClick={handlePlayAudio}
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <PlayCircle className="w-5 h-5" />
                        <T t={admin["analytics.modal.play"]} />
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
