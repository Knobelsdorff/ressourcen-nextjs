/*
 * Wer darf Texte bearbeiten? Nur volle Admins.
 *
 * Maßgeblich ist ADMIN_EMAILS (nur Server). Ist die Variable nicht gesetzt,
 * gilt wie überall im Projekt NEXT_PUBLIC_ADMIN_EMAILS. Geprüft wird immer die
 * E-Mail aus der Supabase-Session (Cookie) – nie etwas, das der Browser schickt.
 * Musik-Admins (NEXT_PUBLIC_MUSIC_ADMIN_EMAILS) dürfen keine Texte ändern.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export function textAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isTextAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return textAdminEmails().includes(email.trim().toLowerCase());
}

type AdminResult = { user: User; error?: undefined } | { user?: undefined; error: NextResponse };

export async function requireTextAdmin(request: NextRequest): Promise<AdminResult> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  }
  if (!isTextAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "Nur Admins dürfen Texte bearbeiten." }, { status: 403 }) };
  }
  return { user };
}
