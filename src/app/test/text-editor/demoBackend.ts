"use client";

/*
 * Demo-Backend für /test/text-editor: verhält sich wie die echte API
 * (Entwürfe, Veröffentlichen, Verlauf, Prüfung gegen den Katalog), speichert
 * aber nur im localStorage dieses Browsers. Nichts geht an Supabase.
 */

import { TEXT_INDEX } from "@/content/texts";
import { textHash, validateText } from "@/lib/site-texts/format";
import type { DraftRow, EditorStateResponse, PublishedRow, RevisionRow } from "@/lib/site-texts/api-types";
import { SiteTextApiError, type SiteTextBackend } from "@/components/site-text/context";

const KEY = "site-text-demo-v2";

type DemoDb = { drafts: DraftRow[]; published: PublishedRow[]; revisions: RevisionRow[] };

function read(): DemoDb {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DemoDb;
  } catch {
    /* leer */
  }
  return { drafts: [], published: [], revisions: [] };
}

function write(db: DemoDb) {
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

const delay = () => new Promise((r) => setTimeout(r, 250));
const state = (db: DemoDb): EditorStateResponse => ({ drafts: db.drafts, published: db.published });

export function resetDemoDb() {
  window.localStorage.removeItem(KEY);
}

export const demoBackend: SiteTextBackend = {
  async checkAdmin() {
    return true;
  },
  async load() {
    await delay();
    return state(read());
  },
  async saveDrafts(set, discard) {
    await delay();
    const db = read();
    const details: { key: string; errors: string[] }[] = [];
    for (const { key, value } of set) {
      const def = TEXT_INDEX.get(key);
      if (!def) {
        details.push({ key, errors: ["Diesen Text gibt es im Code nicht."] });
        continue;
      }
      const result = value === null ? null : validateText(def, value);
      if (result?.errors.length) {
        details.push({ key, errors: result.errors });
        continue;
      }
      const row: DraftRow = { key, value: result ? result.value : null, updatedAt: new Date().toISOString(), baseHash: textHash(def.text) };
      db.drafts = [...db.drafts.filter((d) => d.key !== key), row];
    }
    if (details.length) throw new SiteTextApiError("Einige Texte sind ungültig.", "validation", details);
    db.drafts = db.drafts.filter((d) => !discard.includes(d.key));
    write(db);
    return state(db);
  },
  async publish(keys) {
    await delay();
    const db = read();
    const results: { key: string; action: "published" | "reset" | "unchanged" }[] = [];
    const now = new Date().toISOString();
    for (const draft of db.drafts.filter((d) => keys.includes(d.key))) {
      const old = db.published.find((p) => p.key === draft.key);
      if (draft.value === null) {
        db.published = db.published.filter((p) => p.key !== draft.key);
        results.push({ key: draft.key, action: old ? "reset" : "unchanged" });
      } else {
        db.published = [...db.published.filter((p) => p.key !== draft.key), { key: draft.key, value: draft.value, updatedAt: now, baseHash: draft.baseHash }];
        results.push({ key: draft.key, action: "published" });
      }
      db.revisions.unshift({
        id: Date.now() + db.revisions.length,
        key: draft.key,
        oldValue: old?.value ?? null,
        newValue: draft.value,
        changedAt: now,
        changedBy: "demo@localhost",
      });
    }
    db.drafts = db.drafts.filter((d) => !keys.includes(d.key));
    write(db);
    return { ...state(db), results };
  },
  async history(key, limit = 50) {
    await delay();
    return read()
      .revisions.filter((r) => !key || r.key === key)
      .slice(0, limit);
  },
};
