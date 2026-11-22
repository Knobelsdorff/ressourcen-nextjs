/*
 * Gesamter Text-Katalog. Nur für Server (Prüfung beim Speichern) und den
 * Admin-Editor (Panels, /admin/texte) – normale Seiten importieren nur ihren
 * eigenen Namespace, damit Besucher nicht alle Texte herunterladen.
 *
 * Neuer Bereich: Datei in diesem Ordner anlegen und unten eintragen.
 */

import { flattenNamespace, type AnyTextDef, type TextDef } from "@/lib/site-texts/define";
import { account } from "./account";
import { admin } from "./admin";
import { adminClient } from "./adminClient";
import { adminMenu } from "./adminMenu";
import { common } from "./common";
import { createStory } from "./createStory";
import { dashboard } from "./dashboard";
import { firstStory } from "./firstStory";
import { landing } from "./landing";
import { legal } from "./legal";
import { meta } from "./meta";
import { player } from "./player";

export interface NamespaceInfo {
  id: string;
  title: string;
  texts: Record<string, AnyTextDef>;
}

export const NAMESPACES: NamespaceInfo[] = [
  { id: "common", title: "Kopfzeile, Menü & Fußzeile", texts: common },
  { id: "landing", title: "Startseite", texts: landing },
  { id: "dashboard", title: "Dashboard (Mein Raum)", texts: dashboard },
  { id: "createStory", title: "Story erstellen", texts: createStory },
  { id: "firstStory", title: "Engel-Flow: E-Mail-Schritt", texts: firstStory },
  { id: "player", title: "Player & Musik", texts: player },
  { id: "account", title: "Zugang & Konto", texts: account },
  { id: "legal", title: "Impressum & Datenschutz", texts: legal },
  { id: "meta", title: "Seitentitel & Link-Vorschau", texts: meta },
  { id: "adminMenu", title: "Admin-Menü (Dashboard)", texts: adminMenu },
  { id: "admin", title: "Admin-Bereich", texts: admin },
  { id: "adminClient", title: "Admin: manuelle Ressource & Aufnahme", texts: adminClient },
];

const index = new Map<string, TextDef>();
for (const ns of NAMESPACES) {
  for (const def of flattenNamespace(ns.texts)) {
    if (process.env.NODE_ENV !== "production" && index.has(def.key)) {
      throw new Error(`[site-texts] Schlüssel doppelt vergeben: ${def.key}`);
    }
    index.set(def.key, def);
  }
}

/** Alle bearbeitbaren Einzeltexte nach Schlüssel. */
export const TEXT_INDEX: ReadonlyMap<string, TextDef> = index;

export function namespaceTitle(id: string): string {
  return NAMESPACES.find((ns) => ns.id === id)?.title ?? id;
}
