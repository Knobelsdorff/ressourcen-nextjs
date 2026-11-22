import { NextResponse, type NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { requireTextAdmin } from "@/lib/site-texts/admin-auth";
import { dbErrorResponse, loadEditorState, noStore } from "@/lib/site-texts/admin-db";
import type { EditorStateResponse } from "@/lib/site-texts/api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Entwürfe + veröffentlichte Texte (mit Zeitstempel) für den Editor. */
export async function GET(request: NextRequest) {
  const auth = await requireTextAdmin(request);
  if (auth.error) return auth.error;

  try {
    const supabase = await createServerAdminClient();
    const state = await loadEditorState(supabase);
    return NextResponse.json<EditorStateResponse>(state, noStore);
  } catch (error) {
    return dbErrorResponse(error, "Editor-Stand laden");
  }
}
