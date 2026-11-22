import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { TEXT_INDEX } from "@/content/texts";
import { requireTextAdmin } from "@/lib/site-texts/admin-auth";
import { dbErrorResponse, loadEditorState, noStore } from "@/lib/site-texts/admin-db";
import { validateText } from "@/lib/site-texts/format";
import { SITE_TEXTS_LOCALE, SITE_TEXTS_TAG } from "@/lib/site-texts/server";
import type { ApiError, PublishResponse } from "@/lib/site-texts/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Veröffentlicht die genannten Entwürfe (oder alle, wenn keine genannt sind)
 * in einer Transaktion und leert danach den Cache – alle Besucher sehen den
 * neuen Text sofort.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTextAdmin(request);
  if (auth.error) return auth.error;

  let requested: string[] | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body?.keys)) requested = body.keys.filter((k: unknown): k is string => typeof k === "string");
  } catch {
    /* leerer Body = alles veröffentlichen */
  }

  try {
    const supabase = await createServerAdminClient();
    const db = supabase as any;

    const { data: drafts, error: draftError } = await db
      .from("site_text_drafts")
      .select("key, value")
      .eq("locale", SITE_TEXTS_LOCALE);
    if (draftError) throw draftError;

    // Vor dem Veröffentlichen erneut gegen den aktuellen Code prüfen: Ein Text
    // kann seit dem Entwurf aus dem Code entfernt oder geändert worden sein.
    const details: { key: string; errors: string[] }[] = [];
    const keys: string[] = [];
    for (const d of (drafts ?? []) as { key: string; value: string | null }[]) {
      if (requested && !requested.includes(d.key)) continue;
      const def = TEXT_INDEX.get(d.key);
      if (!def) {
        details.push({ key: d.key, errors: ["Diesen Text gibt es im Code nicht mehr – Entwurf bitte verwerfen."] });
        continue;
      }
      if (d.value !== null) {
        const result = validateText(def, d.value);
        if (result.errors.length) {
          details.push({ key: d.key, errors: result.errors });
          continue;
        }
      }
      keys.push(d.key);
    }
    if (details.length) {
      return NextResponse.json<ApiError>(
        { error: "Einige Entwürfe können nicht veröffentlicht werden.", code: "validation", details },
        { status: 422 }
      );
    }
    if (keys.length === 0) {
      return NextResponse.json<ApiError>({ error: "Keine Entwürfe zum Veröffentlichen." }, { status: 400 });
    }

    const { data: results, error } = await db.rpc("publish_site_texts", {
      p_locale: SITE_TEXTS_LOCALE,
      p_keys: keys,
      p_actor: auth.user.id,
    });
    if (error) throw error;

    revalidateTag(SITE_TEXTS_TAG);

    const state = await loadEditorState(supabase);
    return NextResponse.json<PublishResponse>(
      {
        ...state,
        results: ((results ?? []) as { text_key: string; action: PublishResponse["results"][number]["action"] }[]).map((r) => ({
          key: r.text_key,
          action: r.action,
        })),
      },
      noStore
    );
  } catch (error) {
    return dbErrorResponse(error, "Veröffentlichen");
  }
}
