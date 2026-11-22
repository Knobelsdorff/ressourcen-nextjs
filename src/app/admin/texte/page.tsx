"use client";

/*
 * /admin/texte – alle bearbeitbaren Texte der Website an einem Ort.
 *
 * Ergänzt das Bearbeiten direkt auf der Seite: Hier findet man auch Texte,
 * die nicht sichtbar sind (Seitentitel, Fehlermeldungen, andere Zustände),
 * kann suchen, filtern, veröffentlichen und den Verlauf ansehen.
 * Nur für Admins – alle Änderungen laufen über dieselbe geprüfte API.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, FileText, History, Loader2, RefreshCw, Search, Send } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSiteTextEditor } from "@/components/site-text/context";
import { ChangesPanel, HistoryList } from "@/components/site-text/editor/panels";
import { TextField } from "@/components/site-text/editor/TextField";
import { textStatus } from "@/components/site-text/editor/shared";
import "@/components/site-text/editor/site-text.css";
import { NAMESPACES, TEXT_INDEX } from "@/content/texts";
import { flattenNamespace, type TextDef } from "@/lib/site-texts/define";

type Filter = "all" | "changed" | "drafts" | "codeChanged";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "drafts", label: "Entwürfe" },
  { id: "changed", label: "Geändert (live)" },
  { id: "codeChanged", label: "Original im Code geändert" },
];

export default function AdminTextsPage() {
  const { user, loading: authLoading } = useAuth();
  const editor = useSiteTextEditor();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"texts" | "publish" | "history">("texts");

  const groups = useMemo(() => {
    if (!editor) return [];
    const q = query.trim().toLowerCase();
    return NAMESPACES.map((ns) => {
      const texts = flattenNamespace(ns.texts).filter((def) => {
        const status = textStatus(def, editor);
        if (filter === "drafts" && !status.hasDraft) return false;
        if (filter === "changed" && !status.isOverridden) return false;
        if (filter === "codeChanged" && !status.codeChanged) return false;
        if (!q) return true;
        const value = editor.drafts[def.key]?.value ?? editor.publishedMeta[def.key]?.value ?? def.text;
        return [def.key, def.label ?? "", def.text, value].some((s) => s.toLowerCase().includes(q));
      });
      return { ...ns, list: texts, total: flattenNamespace(ns.texts).length };
    });
  }, [editor, query, filter]);

  // Texte, die in der Datenbank stehen, im Code aber nicht mehr existieren.
  const orphans = useMemo(() => {
    if (!editor) return { published: [] as string[], drafts: [] as string[] };
    return {
      published: Object.keys(editor.publishedMeta).filter((k) => !TEXT_INDEX.has(k)).sort(),
      drafts: Object.keys(editor.drafts).filter((k) => !TEXT_INDEX.has(k)).sort(),
    };
  }, [editor]);

  // Der Editor-Zustand existiert nur für bestätigte Admins (SiteTextProvider).
  if (authLoading && !editor) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-amber-800">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Lädt …
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold text-amber-900">Texte bearbeiten</h1>
        <p className="mb-6 text-amber-800">
          {user ? "Dieser Bereich ist nur für Admins." : "Bitte melde dich mit einem Admin-Konto an."}
        </p>
        <Link href={user ? "/dashboard" : "/zugang?returnTo=/admin/texte"} className="underline">
          {user ? "Zum Dashboard" : "Zur Anmeldung"}
        </Link>
      </div>
    );
  }

  const draftCount = Object.keys(editor.drafts).length;
  const changedCount = Object.keys(editor.publishedMeta).length;
  const totalCount = TEXT_INDEX.size;
  const shownCount = groups.reduce((n, g) => n + g.list.length, 0);
  const searching = query.trim().length > 0 || filter !== "all";

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8" style={{ font: "15px/1.5 ui-sans-serif, system-ui, sans-serif", color: "#1c1917" }}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FileText className="h-6 w-6" aria-hidden="true" /> Texte der Website
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {totalCount} Texte · {changedCount} geändert · {draftCount} {draftCount === 1 ? "Entwurf" : "Entwürfe"}. Tipp: Die meisten Texte lassen sich
            auch direkt auf der Seite bearbeiten („Texte bearbeiten“ unten links).
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="st-btn" onClick={() => void editor.reload()} title="Neu laden">
            <RefreshCw size={14} /> Neu laden
          </button>
        </div>
      </header>

      {editor.loadState === "missing-table" && (
        <div className="mb-6 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          Die Text-Tabellen fehlen in Supabase. Bitte die Migration supabase/migrations/20261120120000_site_texts.sql einspielen.
        </div>
      )}
      {editor.saveError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" style={{ whiteSpace: "pre-line" }}>
          Nicht gespeichert: {editor.saveError}{" "}
          {editor.pendingCount > 0 && (
            <button type="button" className="st-btn" onClick={editor.retrySave}>
              Erneut speichern
            </button>
          )}
        </div>
      )}

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Bereiche">
        <button type="button" className={`st-btn ${tab === "texts" ? "st-btn-primary" : ""}`} onClick={() => setTab("texts")}>
          <FileText size={14} /> Texte
        </button>
        <button type="button" className={`st-btn ${tab === "publish" ? "st-btn-primary" : ""}`} onClick={() => setTab("publish")}>
          <Send size={14} /> Veröffentlichen {draftCount > 0 && <span className="st-count">{draftCount}</span>}
        </button>
        <button type="button" className={`st-btn ${tab === "history" ? "st-btn-primary" : ""}`} onClick={() => setTab("history")}>
          <History size={14} /> Verlauf
        </button>
      </nav>

      {tab === "publish" && (
        <section className="st-panel" style={{ position: "static", width: "100%", maxHeight: "none" }}>
          <div className="st-panel-head">
            <strong>Entwürfe veröffentlichen</strong>
          </div>
          <ChangesPanel editor={editor} onDone={() => setTab("texts")} />
        </section>
      )}

      {tab === "history" && (
        <section className="st-panel" style={{ position: "static", width: "100%", maxHeight: "none" }}>
          <div className="st-panel-head">
            <strong>Zuletzt veröffentlicht</strong>
          </div>
          <div className="st-panel-body">
            <HistoryList editor={editor} limit={100} />
          </div>
        </section>
      )}

      {tab === "texts" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="st-search"
                style={{ paddingLeft: 34 }}
                placeholder="Text oder Schlüssel suchen …"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className={`st-btn ${filter === f.id ? "st-btn-primary" : ""}`} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {searching && <p className="mb-3 text-sm text-stone-600">{shownCount} Treffer</p>}

          <div className="grid gap-3">
            {groups.map((g) => {
              if (searching && g.list.length === 0) return null;
              const expanded = searching || open.has(g.id);
              return (
                <section key={g.id} className="rounded-xl border border-stone-200 bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => toggle(g.id)}
                    aria-expanded={expanded}
                  >
                    <span className="font-semibold">{g.title}</span>
                    <span className="flex items-center gap-2 text-sm text-stone-500">
                      {searching ? `${g.list.length} von ${g.total}` : `${g.total} Texte`}
                      <ChevronDown size={16} className={expanded ? "rotate-180" : ""} />
                    </span>
                  </button>
                  {expanded && (
                    <div className="grid gap-5 border-t border-stone-100 px-4 py-4">
                      {g.list.map((def: TextDef) => (
                        <TextField key={def.key} def={def} editor={editor} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {(orphans.published.length > 0 || orphans.drafts.length > 0) && (
            <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <h2 className="mb-2 font-semibold">Nicht mehr verwendet</h2>
              <p className="mb-3 text-stone-700">
                Diese Texte stehen noch in der Datenbank, gibt es im Code aber nicht mehr (z. B. weil eine Seite umgebaut wurde). Sie werden
                nirgends angezeigt und stören nicht.
              </p>
              <ul className="grid gap-1">
                {orphans.published.map((key) => (
                  <li key={`p-${key}`}>
                    <code className="st-key">{key}</code> – veröffentlicht: „{editor.publishedMeta[key]?.value.slice(0, 80)}“
                  </li>
                ))}
                {orphans.drafts.map((key) => (
                  <li key={`d-${key}`}>
                    <code className="st-key">{key}</code> – Entwurf{" "}
                    <button type="button" className="st-link" onClick={() => editor.discardDrafts([key])}>
                      verwerfen
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
