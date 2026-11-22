import { NextResponse, type NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { TEXT_INDEX } from "@/content/texts";
import { requireTextAdmin } from "@/lib/site-texts/admin-auth";
import { dbErrorResponse, loadEditorState, noStore } from "@/lib/site-texts/admin-db";
import { textHash, validateText } from "@/lib/site-texts/format";
import { SITE_TEXTS_LOCALE } from "@/lib/site-texts/server";
import type { ApiError, EditorStateResponse, SaveDraftsRequest } from "@/lib/site-texts/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHANGES = 200;

/**
 * Entwürfe speichern oder verwerfen. Geprüft wird gegen den Katalog im Code:
 * Schlüssel muss existieren, Variablen müssen erlaubt sein, Länge passt.
 * Entspricht ein Entwurf schon dem veröffentlichten Stand, wird er gelöscht.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTextAdmin(request);
  if (auth.error) return auth.error;

  let body: SaveDraftsRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const set = Array.isArray(body.set) ? body.set : [];
  const discard = Array.isArray(body.discard) ? body.discard.filter((k): k is string => typeof k === "string") : [];
  if (set.length + discard.length > MAX_CHANGES) {
    return NextResponse.json<ApiError>({ error: `Höchstens ${MAX_CHANGES} Änderungen auf einmal.` }, { status: 400 });
  }

  // Prüfen
  const details: { key: string; errors: string[] }[] = [];
  const upserts: { key: string; value: string | null; baseHash: string }[] = [];
  for (const change of set) {
    const key = typeof change?.key === "string" ? change.key : "";
    const def = TEXT_INDEX.get(key);
    if (!def) {
      details.push({ key: key || "?", errors: ["Diesen Text gibt es im Code nicht (mehr)."] });
      continue;
    }
    if (change.value === null) {
      upserts.push({ key, value: null, baseHash: textHash(def.text) });
      continue;
    }
    if (typeof change.value !== "string") {
      details.push({ key, errors: ["Ungültiger Wert."] });
      continue;
    }
    const result = validateText(def, change.value);
    if (result.errors.length) {
      details.push({ key, errors: result.errors });
      continue;
    }
    upserts.push({ key, value: result.value, baseHash: textHash(def.text) });
  }
  if (details.length) {
    return NextResponse.json<ApiError>({ error: "Einige Texte sind ungültig.", code: "validation", details }, { status: 422 });
  }

  try {
    const supabase = await createServerAdminClient();
    const db = supabase as any;

    if (upserts.length) {
      // Aktuell veröffentlichten Stand holen, um überflüssige Entwürfe zu vermeiden.
      const { data: publishedRows, error: pubError } = await db
        .from("site_texts")
        .select("key, value")
        .eq("locale", SITE_TEXTS_LOCALE)
        .in("key", upserts.map((u) => u.key));
      if (pubError) throw pubError;
      const published = new Map<string, string>((publishedRows ?? []).map((r: any) => [r.key, r.value]));

      const toDelete: string[] = [];
      const rows: Record<string, unknown>[] = [];
      for (const u of upserts) {
        const def = TEXT_INDEX.get(u.key)!;
        const current = published.get(u.key);
        const unchanged = u.value === null ? current === undefined : u.value === (current ?? def.text);
        if (unchanged) {
          toDelete.push(u.key);
        } else if (u.value !== null && current !== undefined && u.value === def.text) {
          // Text entspricht wieder dem Original → Abweichung entfernen statt das Original zu kopieren.
          rows.push({ locale: SITE_TEXTS_LOCALE, key: u.key, value: null, base_hash: u.baseHash, updated_at: new Date().toISOString(), updated_by: auth.user.id });
        } else {
          rows.push({ locale: SITE_TEXTS_LOCALE, key: u.key, value: u.value, base_hash: u.baseHash, updated_at: new Date().toISOString(), updated_by: auth.user.id });
        }
      }
      if (rows.length) {
        const { error } = await db.from("site_text_drafts").upsert(rows, { onConflict: "locale,key" });
        if (error) throw error;
      }
      discard.push(...toDelete);
    }

    if (discard.length) {
      const { error } = await db.from("site_text_drafts").delete().eq("locale", SITE_TEXTS_LOCALE).in("key", discard);
      if (error) throw error;
    }

    const state = await loadEditorState(supabase);
    return NextResponse.json<EditorStateResponse>(state, noStore);
  } catch (error) {
    return dbErrorResponse(error, "Entwürfe speichern");
  }
}
