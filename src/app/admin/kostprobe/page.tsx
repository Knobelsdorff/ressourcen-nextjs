"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import AudioPlayer from "@/components/audio/AudioPlayer";

const DEFAULT_TITLE = "Wohlwollende Präsenz";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface SampleState {
  title: string;
  audio_url: string;
  path: string | null;
}

export default function AdminKostprobePage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sample, setSample] = useState<SampleState | null>(null);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFullAdmin = (() => {
    if (!user?.email) return false;
    const fullAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return fullAdminEmails.includes(user.email.toLowerCase());
  })();

  const loadSample = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/homepage-sample");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Laden");
      }
      if (data.sample) {
        setSample(data.sample);
        setTitle(data.sample.title || DEFAULT_TITLE);
      } else {
        setSample(null);
        setTitle(DEFAULT_TITLE);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Laden";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && isFullAdmin) {
      loadSample();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, isFullAdmin, loadSample]);

  const handleSave = async () => {
    if (!file && !sample) {
      setError("Bitte eine MP3-Datei auswählen.");
      return;
    }

    if (file) {
      if (!file.name.toLowerCase().endsWith(".mp3")) {
        setError("Nur MP3-Dateien sind erlaubt.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`Die Datei ist zu groß (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum: 50 MB.`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim() || DEFAULT_TITLE);
      if (file) formData.append("file", file);

      const response = await fetch("/api/admin/homepage-sample", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }

      setSample(data.sample);
      setTitle(data.sample.title || DEFAULT_TITLE);
      setFile(null);
      setMessage(file ? "Kostprobe gespeichert." : "Titel aktualisiert.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Speichern fehlgeschlagen";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sample) return;
    if (!confirm("Kostprobe wirklich löschen? Die Startseite fällt dann auf die bisherige Beispiel-Ressource zurück.")) {
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/homepage-sample", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }
      setSample(null);
      setTitle(DEFAULT_TITLE);
      setFile(null);
      setMessage("Kostprobe gelöscht.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Löschen fehlgeschlagen";
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="mt-4 text-secondary-600">Lade...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary-700 mb-4">Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.</p>
          <Link href="/dashboard" className="text-primary-500 hover:underline">
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isFullAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary-700 mb-4">Du hast keine Berechtigung für die Kostprobe-Verwaltung.</p>
          <Link href="/dashboard" className="text-primary-500 hover:underline">
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen wellness-page-background py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="wellness-admin-heading sm:mb-8 mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-secondary-600 hover:text-secondary-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Link>
          <div className="flex max-sm:flex-col max-sm:gap-2 sm:items-center gap-3">
            <Headphones className="w-8 h-8 text-primary-500" />
            <h1 className="sm:text-3xl text-xl font-bold text-secondary-900">Startseiten-Kostprobe</h1>
          </div>
          <p className="mt-2 text-secondary-600 max-sm:text-sm">
            MP3 für die Hörprobe auf der Startseite hochladen, ersetzen oder löschen. Die Datei enthält bereits Stimme und Musik – keine zusätzliche Hintergrundmusik.
          </p>
        </div>

        <div className="wellness-panel bg-white rounded-lg shadow sm:p-6 p-4 space-y-6">
          <div>
            <label htmlFor="kostprobe-title" className="block text-sm font-medium text-secondary-700 mb-2">
              Titel
            </label>
            <input
              id="kostprobe-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DEFAULT_TITLE}
              className="w-full border border-secondary-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="kostprobe-file" className="block text-sm font-medium text-secondary-700 mb-2">
              MP3-Datei {sample ? "(zum Ersetzen)" : ""}
            </label>
            <input
              id="kostprobe-file"
              type="file"
              accept="audio/mpeg,.mp3"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-secondary-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="mt-2 text-xs text-secondary-500">Nur MP3, maximal 50 MB. Speicherort: audio-files/homepage-sample/</p>
            {file && (
              <p className="mt-1 text-sm text-secondary-600">
                Ausgewählt: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting || (!file && !sample)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {saving ? "Speichern…" : sample && !file ? "Titel speichern" : sample ? "Ersetzen & speichern" : "Hochladen & speichern"}
            </button>
            {sample && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Löschen…" : "Löschen"}
              </button>
            )}
          </div>
        </div>

        {sample?.audio_url && (
          <div className="wellness-panel bg-white rounded-lg shadow sm:p-6 p-4 mt-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-1">Vorschau</h2>
            <p className="text-sm text-secondary-600 mb-4">
              Ohne zusätzliche Hintergrundmusik – so wie auf der Startseite.
            </p>
            <AudioPlayer
              audioUrl={sample.audio_url}
              title={sample.title || title}
              variant="compact"
            />
          </div>
        )}
      </div>
    </div>
  );
}
