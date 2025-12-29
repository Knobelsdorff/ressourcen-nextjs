"use client";

import { useState, useTransition, useRef, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { questions } from "@/data/questions";
import { DataTable } from "@/components/DataTable";
import type { AnalyticsEvent, AnalyticsStats } from "./actions";

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
      audio_play_complete: "Audio vollständig",
      resource_created: "Ressource erstellt",
      user_login: "User eingeloggt",
    };
    return translations[type] || type;
  };

  const handlePlayResource = async (storyId: string, userEmail?: string | null) => {
    try {
      const response = await fetch(`/api/admin/resources/search?storyId=${storyId}`);

      if (!response.ok) {
        throw new Error("Ressource nicht gefunden");
      }

      const data = await response.json();
      const resource = data.resource;

      if (resource) {
        setSelectedResource(resource);
        setShowResourceDetails(true);
      } else {
        alert("Ressource nicht gefunden");
      }
    } catch (error: any) {
      console.error("Error loading resource:", error);
      alert("Fehler beim Laden der Ressource: " + (error.message || "Unbekannter Fehler"));
    }
  };

  const handlePlayResourceByName = async (
    resourceName: string,
    userEmail?: string | null
  ) => {
    try {
      const params = new URLSearchParams();
      params.append("q", resourceName);
      if (userEmail) {
        params.append("email", userEmail);
      }

      const searchUrl = `/api/admin/resources/search?${params.toString()}`;
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`Ressource nicht gefunden (Status: ${response.status})`);
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
        setSelectedResource(resource);
        setShowResourceDetails(true);
      } else {
        let errorMessage = `Ressource "${resourceName}" nicht gefunden${
          userEmail ? ` für ${userEmail}` : ""
        }.`;
        if (resources.length > 0) {
          errorMessage += `\n\nGefunden: ${resources.length} Ressourcen, aber keine passende.`;
        }
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error("Error loading resource by name:", error);
      alert("Fehler beim Laden der Ressource: " + (error.message || "Unbekannter Fehler"));
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
        alert("Fehler beim Abspielen der Ressource");
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
      const email = event.user_email || "Unbekannt";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="sm:mb-8 mb-4">
          <Link
            href="/dashboard"
            className="inline-flex max-sm:text-sm items-center gap-2 text-amber-700 hover:text-amber-800 sm:mb-4 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Dashboard
          </Link>
          <div className="flex max-sm:flex-col max-sm:gap-2 sm:items-center justify-between">
            <div>
              <h1 className="sm:text-3xl text-xl md:text-4xl font-bold text-amber-900 sm:mb-2 mb-1">
                Admin Analytics
              </h1>
              <p className="text-amber-700 max-sm:text-sm">Nutzerverhalten und Statistiken</p>
            </div>
            <Link
              href="/admin/music"
              className="inline-flex max-sm:justify-center items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors max-sm:text-sm"
            >
              <Music className="w-4 h-4" />
              Musik verwalten
            </Link>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-lg sm:p-6 p-3 sm:mb-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 sm:gap-4 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startdatum
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent sm:text-base text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent sm:text-base text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event-Typ
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent sm:text-base text-sm"
              >
                <option value="">Alle</option>
                <option value="user_login">User eingeloggt</option>
                <option value="resource_created">Ressource erstellt</option>
                <option value="audio_play_complete">Audio vollständig</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRefresh}
                disabled={isPending}
                className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 max-sm:text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                Aktualisieren
              </button>
            </div>
          </div>
        </div>

        {/* Statistik-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 sm:gap-4 gap-2 sm:mb-6 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg sm:p-6 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-amber-600" />
            </div>
            <p className="sm:text-2xl text-xl font-bold text-gray-900">{stats.totalEvents}</p>
            <p className="text-sm text-gray-600">Gesamt Events</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg sm:p-6 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="sm:text-2xl text-xl font-bold text-gray-900">{stats.totalUsers}</p>
            <p className="text-sm text-gray-600">Aktive Nutzer</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg sm:p-6 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <p className="sm:text-2xl text-xl font-bold text-gray-900">
              {stats.resourcesCreated}
            </p>
            <p className="text-sm text-gray-600">Ressourcen erstellt</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg sm:p-6 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <PlayCircle className="w-8 h-8 text-purple-600" />
            </div>
            <p className="sm:text-2xl text-xl font-bold text-gray-900">
              {stats.audioCompletions}
            </p>
            <p className="text-sm text-gray-600">Audio vollständig</p>
          </motion.div>
        </div>

        {/* Detaillierte Statistiken */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Audio-Statistiken */}
          <div className="bg-white rounded-xl shadow-lg sm:p-6 p-3">
            <h2 className="sm:text-xl text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Volume2 className="w-6 h-6 text-amber-600" />
              Audio-Statistiken
            </h2>
            <div className="sm:space-y-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 max-sm:text-sm">Audio vollständig:</span>
                <span className="font-semibold text-gray-900">{stats.audioCompletions}</span>
              </div>
            </div>
          </div>

          {/* Top Ressourcenfiguren */}
          <div className="bg-white rounded-xl shadow-lg sm:p-6 p-3">
            <h2 className="sm:text-xl text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-600" />
              Top Ressourcenfiguren
            </h2>
            <div className="space-y-2">
              {stats.topResourceFigures.length > 0 ? (
                stats.topResourceFigures.map((figure, index) => (
                  <div key={figure.name} className="flex justify-between items-center">
                    <span className="text-gray-700 max-sm:text-sm">
                      {index + 1}. {figure.name}
                    </span>
                    <span className="font-semibold text-gray-900 max-sm:text-sm">
                      {figure.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Keine Daten verfügbar</p>
              )}
            </div>
          </div>
        </div>

        {/* Events nach Typ */}
        <div className="bg-white rounded-xl shadow-lg sm:p-6 p-3 mb-6">
          <h2 className="sm:text-xl text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-600" />
            Events nach Typ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.eventsByType).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="sm:text-2xl text-xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 mt-1">{formatEventType(type)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Events nach Tag */}
        {stats.eventsByDay.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg sm:p-6 p-3 mb-6">
            <h2 className="sm:text-xl text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-amber-600" />
              Events nach Tag
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.eventsByDay.map((day) => (
                <div key={day.day} className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-700 max-sm:text-sm">
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
        <DataTable
          data={userData}
          columns={[
            {
              key: "email",
              label: "Email",
              sortable: true,
              render: (value) => <span className="font-medium text-gray-900">{value}</span>,
            },
            {
              key: "userLogins",
              label: "Logins",
              sortable: true,
              align: "center" as const,
              width: "100px",
              render: (value) => <span className="text-gray-600">{value}</span>,
            },
            {
              key: "resourcesCreated",
              label: "Ressourcen erstellt",
              sortable: true,
              align: "center" as const,
              width: "150px",
              render: (value) => <span className="text-gray-600">{value}</span>,
            },
            {
              key: "audioCompletions",
              label: "Audio vollständig",
              sortable: true,
              align: "center" as const,
              width: "150px",
              render: (value) => <span className="text-gray-600">{value}</span>,
            },
            {
              key: "totalEvents",
              label: "Gesamt Events",
              sortable: true,
              align: "center" as const,
              width: "120px",
              render: (value) => <span className="font-semibold text-gray-900">{value}</span>,
            },
          ]}
          pageSize={10}
          searchable={true}
          exportable={true}
          title={
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-600" />
              <span>User-Statistiken</span>
            </div>
          }
          emptyMessage="Keine User-Daten verfügbar"
          className="mb-6"
        />

        {/* Event-Liste */}
        <DataTable
          data={events}
          columns={[
            {
              key: "created_at",
              label: "Zeitpunkt",
              sortable: true,
              render: (value) => formatDate(value),
              width: "180px",
            },
            {
              key: "event_type",
              label: "Event",
              sortable: true,
              render: (value) => (
                <span className="font-medium text-gray-900">{formatEventType(value)}</span>
              ),
              width: "150px",
            },
            {
              key: "resource_figure_name",
              label: "Ressourcenfigur",
              sortable: true,
              render: (value, row: AnalyticsEvent) => {
                if (!value) return "-";
                return row.story_id ? (
                  <button
                    onClick={() => handlePlayResource(row.story_id!, row.user_email)}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                    title="Ressource anhören"
                  >
                    {value}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlayResourceByName(value, row.user_email)}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                    title="Ressource anhören (Suche nach Name)"
                  >
                    {value}
                  </button>
                );
              },
            },
            {
              key: "story_id",
              label: "Story ID",
              sortable: true,
              render: (value) =>
                value ? (
                  <span title={value} className="cursor-help font-mono text-xs text-gray-500">
                    {value.substring(0, 8)}...
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                ),
              width: "120px",
            },
            {
              key: "user_email",
              label: "User Email",
              sortable: true,
              render: (value) => (
                <span className="font-medium text-gray-900">{value || "-"}</span>
              ),
            },
            {
              key: "user_id",
              label: "User ID",
              sortable: true,
              render: (value) => (
                <span className="font-mono text-xs text-gray-600">
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
              <BarChart3 className="w-6 h-6 text-amber-600" />
              <span>Event-Details ({events.length} insgesamt)</span>
            </div>
          }
          emptyMessage="Keine Events gefunden"
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
                  <h2 className="sm:text-2xl text-xl font-bold text-gray-900">
                    Ressourcen-Figur:{" "}
                    {typeof selectedResource.resource_figure === "string"
                      ? selectedResource.resource_figure
                      : selectedResource.resource_figure?.name || "Unbekannt"}
                  </h2>
                )}
              </div>
              <button
                onClick={closeResourceModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedResource.question_answers &&
              selectedResource.question_answers.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold mb-4">Fragen & Antworten:</h3>
                  {selectedResource.question_answers.map((qa: any, qaIndex: number) => {
                    const question = questions.find((q) => q.id === qa.questionId);

                    return (
                      <div
                        key={`qa-${qaIndex}`}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Frage {qa.questionId}: {question?.title || `Frage ${qa.questionId}`}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">{question?.question}</p>

                        {qa.selectedBlocks && qa.selectedBlocks.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Ausgewählte Antworten:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {qa.selectedBlocks.map((block: string, blockIndex: number) => (
                                <li
                                  key={`qa-${qaIndex}-block-${blockIndex}`}
                                  className="text-sm text-gray-600"
                                >
                                  {block}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {qa.answer && qa.answer.trim() && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Eigener Text:
                            </p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {qa.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">Keine Fragen-Antworten verfügbar</p>
              )}
            </div>

            {/* Footer mit Abspielen-Button */}
            {selectedResource.audio_url && (
              <div className="p-6 border-t flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {isPlayingResource && resourceAudioElement && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>
                        {Math.floor(currentTime)}s / {Math.floor(duration)}s
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isPlayingResource ? (
                    <button
                      onClick={handlePauseAudio}
                      className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Pause className="w-5 h-5" />
                      Pausieren
                    </button>
                  ) : (
                    <button
                      onClick={handlePlayAudio}
                      className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Ressource abspielen
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
