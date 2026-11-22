import { NextResponse, type NextRequest } from "next/server";
import { requireTextAdmin } from "@/lib/site-texts/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Darf die angemeldete Person Texte bearbeiten? Antwortet immer mit 200, damit
 * Nicht-Admins keine Fehler in der Konsole sehen. Keine Datenbank-Abfrage.
 */
export async function GET(request: NextRequest) {
  const auth = await requireTextAdmin(request);
  return NextResponse.json({ isAdmin: !auth.error }, { headers: { "Cache-Control": "no-store" } });
}
