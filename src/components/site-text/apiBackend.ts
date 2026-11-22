"use client";

import type { ApiError, EditorStateResponse, PublishResponse, RevisionRow } from "@/lib/site-texts/api-types";
import { SiteTextApiError, type SiteTextBackend } from "./context";

const BASE = "/api/admin/site-texts";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  } catch {
    throw new SiteTextApiError("Keine Verbindung – bitte Internet prüfen.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiError>;
    throw new SiteTextApiError(err.error || `Fehler ${res.status}`, err.code ?? (res.status === 401 || res.status === 403 ? "unauthorized" : undefined), err.details);
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const apiBackend: SiteTextBackend = {
  async checkAdmin() {
    try {
      const data = await request<{ isAdmin: boolean }>(`${BASE}/session`);
      return data.isAdmin === true;
    } catch {
      return false;
    }
  },
  load: () => request<EditorStateResponse>(BASE),
  saveDrafts: (set, discard) => request<EditorStateResponse>(`${BASE}/drafts`, json({ set, discard })),
  publish: (keys) => request<PublishResponse>(`${BASE}/publish`, json({ keys })),
  async history(key, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (key) params.set("key", key);
    const data = await request<{ revisions: RevisionRow[] }>(`${BASE}/history?${params}`);
    return data.revisions;
  },
};
