/*
 * Nur auf dem Server verwenden (Layouts, generateMetadata, API-Routen).
 *
 * Lesen kostet praktisch nichts: Die veröffentlichten Texte werden aus Supabase
 * geholt und im Next.js-Data-Cache (Tag "site-texts") gehalten. Das
 * Veröffentlichen im Editor ruft revalidateTag auf – dann wird sofort neu
 * gelesen. Zusätzlich höchstens alle 5 Minuten eine kleine Abfrage, damit
 * Änderungen direkt in der Datenbank (z. B. TRUNCATE) nicht ewig im Cache hängen.
 */

import { unstable_cache } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { pickForm, type AnyTextDef } from "./define";
import { interpolate, stripInline, type TextVars } from "./format";

export const SITE_TEXTS_TAG = "site-texts";
export const SITE_TEXTS_LOCALE = "de";
/** Sicherheitsnetz für Änderungen außerhalb des Editors (direkt in Supabase). */
const SITE_TEXTS_REVALIDATE_SECONDS = 300;

export type PublishedTexts = Record<string, string>;

/** Fehlercodes für "Tabelle existiert (noch) nicht" – Migration nicht eingespielt. */
export function isMissingTableError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === "42P01" || e.code === "PGRST205" || e.code === "42883" || /does not exist|schema cache/i.test(e.message ?? "");
}

const loadPublished = unstable_cache(
  async (locale: string): Promise<PublishedTexts> => {
    const supabase = await createServerAdminClient();
    const { data, error } = await (supabase as any)
      .from("site_texts")
      .select("key, value")
      .eq("locale", locale);
    // Fehler werfen statt {} zurückgeben: ein Fehler wird nicht gecacht, der
    // nächste Aufruf versucht es erneut.
    if (error) throw error;
    const out: PublishedTexts = {};
    for (const row of (data ?? []) as { key: string; value: string }[]) out[row.key] = row.value;
    return out;
  },
  ["site-texts-published-v2"],
  { tags: [SITE_TEXTS_TAG], revalidate: SITE_TEXTS_REVALIDATE_SECONDS }
);

let warnedMissing = false;

/** Veröffentlichte Abweichungen vom Code. Bei Problemen {} → überall Original-Texte. */
export async function getPublishedTexts(locale = SITE_TEXTS_LOCALE): Promise<PublishedTexts> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.PRIVATE_SUPABASE_SERVICE_KEY) return {};
  try {
    return await loadPublished(locale);
  } catch (error) {
    if (isMissingTableError(error)) {
      if (!warnedMissing) {
        warnedMissing = true;
        console.warn("[site-texts] Tabelle site_texts fehlt – Migration 20261120120000_site_texts.sql einspielen. Es gelten die Original-Texte.");
      }
    } else {
      // Nicht gecacht: der nächste Aufruf versucht es erneut.
      const message = (error as { message?: string } | null)?.message ?? String(error);
      console.error(`[site-texts] Veröffentlichte Texte konnten nicht geladen werden (${message}) – es gelten vorerst die Original-Texte.`);
    }
    return {};
  }
}

/** Text als String auf dem Server (Metadaten, Server-Komponenten). */
export async function getText(def: AnyTextDef, vars?: TextVars): Promise<string> {
  const published = await getPublishedTexts();
  return resolveTextString(def, published, vars);
}

export function resolveTextString(def: AnyTextDef, published: PublishedTexts, vars?: TextVars): string {
  const form = pickForm(def, vars);
  const value = published[form.key] ?? form.text;
  const text = interpolate(value, vars);
  return form.format === "plain" ? text : stripInline(text);
}
