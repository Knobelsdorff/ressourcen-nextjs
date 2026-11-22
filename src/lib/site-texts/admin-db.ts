/*
 * Datenbank-Zugriffe des Editors (nur Server, Service Role). Die API-Routen
 * prüfen vorher, dass ein Admin angemeldet ist.
 */

import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import type { ApiError, DraftRow, EditorStateResponse, PublishedRow } from "./api-types";
import { isMissingTableError, SITE_TEXTS_LOCALE } from "./server";

export type AdminClient = Awaited<ReturnType<typeof createServerAdminClient>>;

// E-Mails der Admins (Nutzer-ID → E-Mail). Es gibt nur wenige Admins, und die
// Abfrage läuft bei jedem Speichern mit – deshalb kurz im Speicher halten.
const EMAIL_TTL_MS = 10 * 60 * 1000;
const emailCache = new Map<string, { email: string | null; at: number }>();

export async function lookupEmails(supabase: AdminClient, ids: Iterable<string | null | undefined>): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const now = Date.now();
  const missing: string[] = [];
  for (const id of new Set(Array.from(ids).filter((x): x is string => Boolean(x)))) {
    const cached = emailCache.get(id);
    if (cached && now - cached.at < EMAIL_TTL_MS) {
      if (cached.email) result.set(id, cached.email);
    } else {
      missing.push(id);
    }
  }
  await Promise.all(
    missing.slice(0, 20).map(async (id) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(id);
        if (error) return; // Fehler nicht merken – nächstes Mal neu versuchen
        const email = data?.user?.email ?? null;
        emailCache.set(id, { email, at: now });
        if (email) result.set(id, email);
      } catch {
        /* unbekannt bleibt leer */
      }
    })
  );
  return result;
}

export async function loadEditorState(supabase: AdminClient): Promise<EditorStateResponse> {
  const db = supabase as any;
  const [drafts, published] = await Promise.all([
    db.from("site_text_drafts").select("key, value, updated_at, base_hash, updated_by").eq("locale", SITE_TEXTS_LOCALE),
    db.from("site_texts").select("key, value, updated_at, base_hash").eq("locale", SITE_TEXTS_LOCALE),
  ]);
  if (drafts.error) throw drafts.error;
  if (published.error) throw published.error;
  const emails = await lookupEmails(supabase, (drafts.data ?? []).map((r: any) => r.updated_by));
  return {
    drafts: (drafts.data ?? []).map(
      (r: any): DraftRow => ({
        key: r.key,
        value: r.value,
        updatedAt: r.updated_at,
        baseHash: r.base_hash,
        updatedBy: r.updated_by ? emails.get(r.updated_by) ?? null : null,
      })
    ),
    published: (published.data ?? []).map(
      (r: any): PublishedRow => ({ key: r.key, value: r.value, updatedAt: r.updated_at, baseHash: r.base_hash })
    ),
  };
}

/** Einheitliche Fehlerantwort; fehlende Tabellen bekommen einen eigenen Code. */
export function dbErrorResponse(error: unknown, context: string) {
  if (isMissingTableError(error)) {
    return NextResponse.json<ApiError>(
      {
        error: "Die Text-Tabellen fehlen in Supabase. Bitte supabase/migrations/20261120120000_site_texts.sql einspielen.",
        code: "missing-table",
      },
      { status: 503 }
    );
  }
  console.error(`[site-texts] ${context}:`, error);
  return NextResponse.json<ApiError>({ error: "Datenbankfehler – bitte später erneut versuchen." }, { status: 500 });
}

export const noStore = { headers: { "Cache-Control": "no-store" } };
