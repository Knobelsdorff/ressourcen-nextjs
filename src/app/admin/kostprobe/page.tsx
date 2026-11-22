"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { createSPAClient } from "@/lib/supabase/client";
import { T, useTextFn, type TextFn } from "@/components/site-text/T";
import { admin } from "@/content/texts/admin";

const DEFAULT_TITLE = "Wohlwollende Präsenz";
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const BUCKET = "audio-files";
const FOLDER = "homepage-sample";

interface SampleState {
  title: string;
  audio_url: string;
  path: string | null;
}

async function parseJsonResponse(response: Response, tx: TextFn) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (response.status === 413) {
      throw new Error(tx(admin["kostprobe.serverTooLarge"]));
    }
    throw new Error(
      text?.startsWith("Request Entity")
        ? tx(admin["kostprobe.uploadTooLarge"])
        : tx(admin["kostprobe.unexpectedResponse"], { status: response.status })
    );
  }
}

export default function AdminKostprobePage() {
  const { user, loading: authLoading } = useAuth();
  const tx = useTextFn();
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
      const data = await parseJsonResponse(response, tx);
      if (!response.ok) {
        throw new Error(data.error || tx(admin["kostprobe.loadError"]));
      }
      if (data.sample) {
        setSample(data.sample);
        setTitle(data.sample.title || DEFAULT_TITLE);
      } else {
        setSample(null);
        setTitle(DEFAULT_TITLE);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tx(admin["kostprobe.loadError"]);
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
      setError(tx(admin["kostprobe.pickMp3"]));
      return;
    }

    if (file) {
      if (!file.name.toLowerCase().endsWith(".mp3")) {
        setError(tx(admin["kostprobe.onlyMp3"]));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(tx(admin["kostprobe.tooLarge"], { size: (file.size / 1024 / 1024).toFixed(2) }));
        return;
      }
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const resolvedTitle = title.trim() || DEFAULT_TITLE;

      // Nur Titel aktualisieren – kleine JSON-API ohne Datei-Body
      if (!file) {
        const response = await fetch("/api/admin/homepage-sample", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: resolvedTitle }),
        });
        const data = await parseJsonResponse(response, tx);
        if (!response.ok) {
          throw new Error(data.error || tx(admin["kostprobe.saveFailed"]));
        }
        setSample(data.sample);
        setTitle(data.sample.title || DEFAULT_TITLE);
        setMessage(tx(admin["kostprobe.titleSaved"]));
        return;
      }

      // Direkt-Upload zu Supabase Storage (umgeht Vercel Body-Limit ~4.5 MB)
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).slice(2, 11);
      const storagePath = `${FOLDER}/homepage-sample_${timestamp}_${randomId}.mp3`;

      console.log(`[kostprobe] Direct upload: ${fileSizeMB} MB → ${storagePath}`);

      const supabaseClient = createSPAClient();
      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: "audio/mpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        const msg = uploadError.message?.toLowerCase() || "";
        if (msg.includes("row-level security") || msg.includes("permission") || msg.includes("forbidden")) {
          throw new Error(tx(admin["kostprobe.storageDenied"]));
        }
        if (msg.includes("bucket")) {
          throw new Error(tx(admin["kostprobe.bucketMissing"]));
        }
        throw new Error(tx(admin["kostprobe.uploadError"], { message: uploadError.message }));
      }

      const {
        data: { publicUrl },
      } = supabaseClient.storage.from(BUCKET).getPublicUrl(storagePath);

      const response = await fetch("/api/admin/homepage-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resolvedTitle,
          audioUrl: publicUrl,
          storagePath,
        }),
      });
      const data = await parseJsonResponse(response, tx);

      if (!response.ok) {
        // Orphan-Datei entfernen, falls Metadaten-Speichern scheitert
        try {
          await supabaseClient.storage.from(BUCKET).remove([storagePath]);
        } catch {
          /* ignore */
        }
        throw new Error(data.error || tx(admin["kostprobe.saveFailed"]));
      }

      setSample(data.sample);
      setTitle(data.sample.title || DEFAULT_TITLE);
      setFile(null);
      setMessage(tx(admin["kostprobe.saved"]));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tx(admin["kostprobe.saveFailed"]);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sample) return;
    if (!confirm(tx(admin["kostprobe.confirmDelete"]))) {
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/homepage-sample", { method: "DELETE" });
      const data = await parseJsonResponse(response, tx);
      if (!response.ok) {
        throw new Error(data.error || tx(admin["kostprobe.deleteFailed"]));
      }
      setSample(null);
      setTitle(DEFAULT_TITLE);
      setFile(null);
      setMessage(tx(admin["kostprobe.deleted"]));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tx(admin["kostprobe.deleteFailed"]);
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
          <p className="mt-4 text-secondary-600"><T t={admin["common.loading"]} /></p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary-700 mb-4"><T t={admin["common.signInPrompt"]} /></p>
          <Link href="/dashboard" className="text-primary-500 hover:underline">
            <T t={admin["common.toDashboard"]} />
          </Link>
        </div>
      </div>
    );
  }

  if (!isFullAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary-700 mb-4"><T t={admin["kostprobe.noPermission"]} /></p>
          <Link href="/dashboard" className="text-primary-500 hover:underline">
            <T t={admin["common.toDashboard"]} />
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
            <T t={admin["common.backToDashboard"]} />
          </Link>
          <div className="flex max-sm:flex-col max-sm:gap-2 sm:items-center gap-3">
            <Headphones className="w-8 h-8 text-primary-500" />
            <h1 className="sm:text-3xl text-xl font-bold text-secondary-900"><T t={admin["kostprobe.title"]} /></h1>
          </div>
          <p className="mt-2 text-secondary-600 max-sm:text-sm">
            <T t={admin["kostprobe.intro"]} />
          </p>
        </div>

        <div className="wellness-panel bg-white rounded-lg shadow sm:p-6 p-4 space-y-6">
          <div>
            <label htmlFor="kostprobe-title" className="block text-sm font-medium text-secondary-700 mb-2">
              <T t={admin["kostprobe.titleLabel"]} />
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
              <T t={admin["kostprobe.fileLabel"]} /> {sample ? <T t={admin["kostprobe.fileReplace"]} /> : ""}
            </label>
            <input
              id="kostprobe-file"
              type="file"
              accept="audio/mpeg,.mp3"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-secondary-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="mt-2 text-xs text-secondary-500"><T t={admin["kostprobe.fileHint"]} /></p>
            {file && (
              <p className="mt-1 text-sm text-secondary-600">
                <T t={admin["kostprobe.selected"]} vars={{ name: file.name, size: (file.size / 1024 / 1024).toFixed(2) }} />
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
              <T t={saving ? admin["kostprobe.saving"] : sample && !file ? admin["kostprobe.saveTitle"] : sample ? admin["kostprobe.replace"] : admin["kostprobe.upload"]} />
            </button>
            {sample && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <T t={deleting ? admin["kostprobe.deleting"] : admin["kostprobe.delete"]} />
              </button>
            )}
          </div>
        </div>

        {sample?.audio_url && (
          <div className="wellness-panel bg-white rounded-lg shadow sm:p-6 p-4 mt-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-1"><T t={admin["kostprobe.preview"]} /></h2>
            <p className="text-sm text-secondary-600 mb-4">
              <T t={admin["kostprobe.previewNote"]} />
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
