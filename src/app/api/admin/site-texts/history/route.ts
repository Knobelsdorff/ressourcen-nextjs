import { NextResponse, type NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { requireTextAdmin } from "@/lib/site-texts/admin-auth";
import { dbErrorResponse, lookupEmails, noStore } from "@/lib/site-texts/admin-db";
import { SITE_TEXTS_LOCALE } from "@/lib/site-texts/server";
import type { RevisionRow } from "@/lib/site-texts/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verlauf der Veröffentlichungen – gesamt oder für einen Schlüssel (?key=). */
export async function GET(request: NextRequest) {
  const auth = await requireTextAdmin(request);
  if (auth.error) return auth.error;

  const key = request.nextUrl.searchParams.get("key");
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 50, 1), 200);

  try {
    const supabase = await createServerAdminClient();
    let query = (supabase as any)
      .from("site_text_revisions")
      .select("id, key, old_value, new_value, changed_at, changed_by")
      .eq("locale", SITE_TEXTS_LOCALE)
      .order("changed_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (key) query = query.eq("key", key);
    const { data, error } = await query;
    if (error) throw error;

    // Wer hat geändert? (wenige Admins, E-Mails kurz zwischengespeichert)
    const emails = await lookupEmails(supabase, (data ?? []).map((r: any) => r.changed_by));

    const revisions: RevisionRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      key: r.key,
      oldValue: r.old_value,
      newValue: r.new_value,
      changedAt: r.changed_at,
      changedBy: r.changed_by ? emails.get(r.changed_by) ?? null : null,
    }));
    return NextResponse.json({ revisions }, noStore);
  } catch (error) {
    return dbErrorResponse(error, "Verlauf laden");
  }
}
