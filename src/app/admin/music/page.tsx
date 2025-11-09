"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { realFigures, fictionalFigures } from "@/data/figures";
import { motion } from "framer-motion";
import { Music, Upload, Trash2, Play, Pause, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface MusicTrack {
  id: string;
  figure_id: string;
  figure_name: string | null;
  track_id: string;
  track_url: string;
  track_title: string | null;
  track_artist: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminMusicPage() {
  const { user, loading: authLoading } = useAuth();
  const [figures, setFigures] = useState<any[]>([]);
  const [selectedFigure, setSelectedFigure] = useState<string>("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackArtist, setTrackArtist] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Prüfe ob User Admin ist (Full Admin oder Music Admin)
  const isMusicAdmin = (() => {
    if (!user?.email) return false;
    const musicAdminEmails = (process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const fullAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return musicAdminEmails.includes(user.email.toLowerCase()) || 
           fullAdminEmails.includes(user.email.toLowerCase());
  })();

  // Prüfe ob User Full Admin ist (für Analytics-Zugriff)
  const isFullAdmin = (() => {
    if (!user?.email) return false;
    const fullAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return fullAdminEmails.includes(user.email.toLowerCase());
  })();

  useEffect(() => {
    const allFigures = [...realFigures, ...fictionalFigures];
    setFigures(allFigures);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedFigure) {
      loadTracks();
    } else {
      setTracks([]);
    }
  }, [selectedFigure]);

  const loadTracks = async () => {
    try {
      const { data, error } = await supabase
        .from("background_music_tracks")
        .select("*")
        .eq("figure_id", selectedFigure)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        // Prüfe ob es ein "Tabelle nicht gefunden" Fehler ist
        if (error.message?.includes("Could not find the table") || error.message?.includes("relation") || error.code === "PGRST116") {
          throw new Error(
            "Die Datenbank-Tabelle 'background_music_tracks' existiert noch nicht.\n\n" +
            "Bitte führe das SQL-Skript 'supabase-music-setup.sql' in deinem Supabase SQL Editor aus.\n\n" +
            "Schritte:\n" +
            "1. Gehe zu deinem Supabase-Projekt\n" +
            "2. Öffne den SQL Editor\n" +
            "3. Öffne die Datei 'supabase-music-setup.sql'\n" +
            "4. Ersetze 'deine-admin-email@example.com' mit deiner Admin-Email (3x)\n" +
            "5. Führe das Skript aus"
          );
        }
        throw error;
      }
      setTracks(data || []);
    } catch (error: any) {
      console.error("Error loading tracks:", error);
      alert("Fehler beim Laden der Tracks:\n\n" + error.message);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedFigure) {
      alert("Bitte wähle eine Figur und eine Datei aus.");
      return;
    }

    // Validierung
    if (!uploadFile.name.toLowerCase().endsWith(".mp3")) {
      alert("Bitte lade nur MP3-Dateien hoch.");
      return;
    }

    setUploading(true);
    try {
      // Erstelle FormData für API-Request
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("figureId", selectedFigure);
      const figure = figures.find((f) => f.id === selectedFigure);
      if (figure?.name) {
        formData.append("figureName", figure.name);
      }
      if (trackTitle) {
        formData.append("trackTitle", trackTitle);
      }
      if (trackArtist) {
        formData.append("trackArtist", trackArtist);
      }
      formData.append("isDefault", isDefault.toString());

      // Upload über API-Endpoint (serverseitig)
      const response = await fetch("/api/admin/music/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      // Erfolg - lade Tracks neu
      alert("Track erfolgreich hochgeladen!");
      setUploadFile(null);
      setTrackTitle("");
      setTrackArtist("");
      setIsDefault(false);
      loadTracks();
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Fehler beim Hochladen: " + (error.message || "Unbekannter Fehler"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (trackId: string) => {
    if (!confirm("Möchtest du diesen Track wirklich löschen?")) return;

    try {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      // 1. Lösche aus Datenbank
      const { error: dbError } = await supabase
        .from("background_music_tracks")
        .delete()
        .eq("id", trackId);

      if (dbError) throw dbError;

      // 2. Versuche Datei aus Storage zu löschen (optional, kann fehlschlagen wenn RLS aktiv ist)
      try {
        const fileName = track.track_url.split("/").pop();
        if (fileName) {
          await supabase.storage.from("background-music").remove([fileName]);
        }
      } catch (storageError) {
        console.warn("Could not delete file from storage (might need admin access):", storageError);
      }

      alert("Track erfolgreich gelöscht!");
      loadTracks();
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Fehler beim Löschen: " + error.message);
    }
  };

  const handleToggleDefault = async (trackId: string, currentDefault: boolean) => {
    try {
      // Verwende API-Endpoint für serverseitige Admin-Prüfung (umgeht RLS-Probleme)
      const response = await fetch("/api/admin/music/toggle-default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackId,
          figureId: selectedFigure,
          isDefault: currentDefault,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Toggle failed with status ${response.status}`);
      }

      // Erfolg - lade Tracks neu
      loadTracks();
    } catch (error: any) {
      console.error("Toggle default error:", error);
      alert("Fehler: " + (error.message || "Unbekannter Fehler"));
    }
  };

  const handlePlayPause = (trackUrl: string, trackId: string) => {
    if (playingTrack === trackId && audioElement) {
      // Pausiere
      audioElement.pause();
      setPlayingTrack(null);
      setAudioElement(null);
    } else {
      // Stoppe vorheriges Audio
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      // Spiele neues Audio
      const audio = new Audio(trackUrl);
      audio.play();
      setPlayingTrack(trackId);
      setAudioElement(audio);

      audio.addEventListener("ended", () => {
        setPlayingTrack(null);
        setAudioElement(null);
      });
    }
  };

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    };
  }, [audioElement]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 mb-4">Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.</p>
          <Link href="/dashboard" className="text-blue-500 hover:underline">
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isMusicAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 mb-4">Du hast keine Berechtigung für die Musik-Verwaltung.</p>
          <Link href="/dashboard" className="text-blue-500 hover:underline">
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          {isFullAdmin && (
            <Link
              href="/admin/analytics"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu Admin Analytics
            </Link>
          )}
          {!isFullAdmin && (
            <Link
              href="/dashboard"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zum Dashboard
            </Link>
          )}
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">Hintergrundmusik verwalten</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Lade Musik-Tracks für Ressourcen hoch und verwalte sie hier.
          </p>
        </div>

        {/* Figuren-Auswahl */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6 mb-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ressource auswählen:
          </label>
          <select
            value={selectedFigure}
            onChange={(e) => setSelectedFigure(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Bitte wählen --</option>
            <optgroup label="Echte Personen">
              {realFigures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Fiktive Figuren">
              {fictionalFigures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name}
                </option>
              ))}
            </optgroup>
          </select>
        </motion.div>

        {selectedFigure && (
          <>
            {/* Upload-Formular */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Neuen Track hochladen
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MP3-Datei: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="audio/mpeg,.mp3"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={uploading}
                  />
                  {uploadFile && (
                    <p className="mt-1 text-sm text-gray-500">
                      Ausgewählt: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titel (optional):
                  </label>
                  <input
                    type="text"
                    value={trackTitle}
                    onChange={(e) => setTrackTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="z.B. Mystical Ambience"
                    disabled={uploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Künstler (optional):
                  </label>
                  <input
                    type="text"
                    value={trackArtist}
                    onChange={(e) => setTrackArtist(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="z.B. Premium Beat"
                    disabled={uploading}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={uploading}
                  />
                  <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                    Als Standard-Track setzen (wird automatisch abgespielt)
                  </label>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Track hochladen
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Vorhandene Tracks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Music className="w-5 h-5" />
                Vorhandene Tracks ({tracks.length})
              </h2>

              {tracks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Noch keine Tracks für diese Ressource vorhanden.
                </p>
              ) : (
                <div className="space-y-4">
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {track.track_title || track.track_id}
                            </h3>
                            {track.is_default && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Standard
                              </span>
                            )}
                          </div>
                          {track.track_artist && (
                            <p className="text-sm text-gray-600 mb-1">Künstler: {track.track_artist}</p>
                          )}
                          <p className="text-xs text-gray-500 font-mono break-all mb-3">
                            {track.track_url}
                          </p>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handlePlayPause(track.track_url, track.id)}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                              {playingTrack === track.id ? (
                                <>
                                  <Pause className="w-4 h-4" />
                                  Pausieren
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Abspielen
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleToggleDefault(track.id, track.is_default)}
                              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                track.is_default
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {track.is_default ? "Standard entfernen" : "Als Standard setzen"}
                            </button>
                            <button
                              onClick={() => handleDelete(track.id)}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Löschen
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

