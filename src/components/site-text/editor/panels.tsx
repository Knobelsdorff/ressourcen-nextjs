"use client";

import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, Loader2, RotateCcw, Send, Undo2 } from "lucide-react";
import { NAMESPACES, TEXT_INDEX, namespaceTitle } from "@/content/texts";
import { flattenNamespace, namespaceOf, type TextDef } from "@/lib/site-texts/define";
import type { RevisionRow } from "@/lib/site-texts/api-types";
import { TextRegistryContext, type SiteTextEditor } from "../context";
import { labelOf, short } from "./shared";
import { TextField } from "./TextField";

const ORDER = new Map(Array.from(TEXT_INDEX.keys()).map((k, i) => [k, i]));
const byCatalogOrder = (a: string, b: string) => (ORDER.get(a) ?? 1e9) - (ORDER.get(b) ?? 1e9);

function matches(def: TextDef, value: string, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [def.key, def.label ?? "", def.text, value].some((s) => s.toLowerCase().includes(needle));
}

// ── Änderungen / Veröffentlichen ─────────────────────────────────────────────

function formatWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

export function ChangesPanel({ editor, onDone }: { editor: SiteTextEditor; onDone: () => void }) {
  const keys = Object.keys(editor.drafts).sort(byCatalogOrder);
  const me = editor.currentUserEmail?.toLowerCase() ?? null;
  /** Eigener Entwurf? Unbekannte Autoren (alte Einträge, Demo) zählen als eigene. */
  const isMine = (key: string) => {
    const by = editor.drafts[key]?.updatedBy?.toLowerCase();
    return !by || !me || by === me;
  };
  const othersCount = keys.filter((k) => !isMine(k)).length;

  // Vorausgewählt sind nur die eigenen Entwürfe – Änderungen anderer Admins
  // werden nicht aus Versehen mitveröffentlicht.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(keys.filter(isMine)));
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; details?: { key: string; errors: string[] }[] } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Neue eigene Entwürfe sind automatisch ausgewählt, abgewählte bleiben abgewählt.
  const prevKeys = useRef(keys);
  const keySig = keys.join("|");
  useEffect(() => {
    const before = prevKeys.current;
    setSelected((prev) => new Set(keys.filter((k) => prev.has(k) || (!before.includes(k) && isMine(k)))));
    prevKeys.current = keys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig]);

  // Ergebnis (Erfolg/Fehler) steht oben – dorthin scrollen, sonst sieht man es bei langen Listen nicht.
  useEffect(() => {
    if (!result) return;
    const scroller = bodyRef.current?.closest(".st-panel") as HTMLElement | null;
    if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
    else bodyRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [result]);

  const chosen = keys.filter((k) => selected.has(k));
  const blocked = editor.pendingCount > 0 || editor.saving;

  const doPublish = async () => {
    setPublishing(true);
    setResult(null);
    const res = await editor.publish(chosen);
    setPublishing(false);
    setConfirming(false);
    if (res.ok) {
      setResult({ ok: true, message: `${chosen.length} ${chosen.length === 1 ? "Änderung ist" : "Änderungen sind"} jetzt live.` });
    } else {
      setResult({ ok: false, message: res.error ?? "Veröffentlichen fehlgeschlagen.", details: res.details });
    }
  };

  return (
    <>
      <div className="st-panel-body" ref={bodyRef}>
        {result && (
          <div className={result.ok ? "st-change" : "st-error"} style={result.ok ? { borderColor: "#86efac", background: "#f0fdf4" } : undefined}>
            {result.ok ? <Check size={14} /> : null} {result.message}
            {result.details?.map((d) => (
              <div key={d.key} style={{ fontSize: 12 }}>
                <code>{d.key}</code>: {d.errors.join(" ")}
              </div>
            ))}
          </div>
        )}
        {keys.length === 0 && <p className="st-muted">Keine Entwürfe. Texte auf der Seite anklicken, um sie zu ändern.</p>}
        {keys.length > 1 && (
          <div className="st-select-row">
            <span className="st-muted">
              {chosen.length} von {keys.length} ausgewählt
              {othersCount > 0 && ` · ${othersCount} von anderen Admins`}
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              {othersCount > 0 && (
                <button type="button" className="st-link" onClick={() => setSelected(new Set(keys.filter(isMine)))}>
                  Nur meine
                </button>
              )}
              <button type="button" className="st-link" onClick={() => setSelected(new Set(keys.filter((k) => TEXT_INDEX.has(k))))}>
                Alle
              </button>
              <button type="button" className="st-link" onClick={() => setSelected(new Set())}>
                Keine
              </button>
            </span>
          </div>
        )}
        {keys.map((key) => {
          const def = TEXT_INDEX.get(key);
          const draft = editor.drafts[key];
          const before = editor.publishedMeta[key]?.value ?? def?.text;
          const by = draft.updatedBy;
          const author = !by ? "" : me && by.toLowerCase() === me ? "von dir" : `von ${by}`;
          const when = formatWhen(draft.updatedAt);
          return (
            <div key={key} className="st-change">
              <label className="st-check">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  disabled={!def}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(key);
                      else next.delete(key);
                      return next;
                    })
                  }
                />
                <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                  <span className="st-label">{def ? labelOf(def) : "Text gibt es im Code nicht mehr"}</span>
                  <code className="st-key">{key}</code>
                  {(author || when) && (
                    <span className={`st-time ${isMine(key) ? "st-muted" : "st-author-other"}`}>
                      {[author, when].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <span className="st-diff-old">{short(before)}</span>
                  <span className="st-diff-new">{draft.value === null ? `↺ Original: ${short(def?.text)}` : short(draft.value)}</span>
                </span>
              </label>
              <button type="button" className="st-btn" onClick={() => editor.discardDrafts([key])}>
                <Undo2 size={13} /> Entwurf verwerfen
              </button>
            </div>
          );
        })}
      </div>
      {keys.length > 0 && (
        <div className="st-panel-foot">
          {confirming ? (
            <>
              <span style={{ fontSize: 13 }}>
                {chosen.length} {chosen.length === 1 ? "Änderung" : "Änderungen"} veröffentlichen? Danach sehen alle Besucher die neuen Texte.
              </span>
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" className="st-btn" onClick={() => setConfirming(false)} disabled={publishing}>
                  Abbrechen
                </button>
                <button type="button" className="st-btn st-btn-green" onClick={doPublish} disabled={publishing || blocked}>
                  {publishing ? <Loader2 size={14} className="st-spin" /> : <Send size={14} />} Ja, veröffentlichen
                </button>
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                className="st-btn"
                onClick={() => {
                  const others = othersCount > 0 ? ` ${othersCount} davon ${othersCount === 1 ? "ist" : "sind"} von anderen Admins.` : "";
                  if (window.confirm(`Alle ${keys.length} Entwürfe verwerfen?${others}`)) {
                    editor.discardDrafts(keys);
                    onDone();
                  }
                }}
              >
                <Undo2 size={13} /> Alle verwerfen
              </button>
              <button
                type="button"
                className="st-btn st-btn-green"
                disabled={chosen.length === 0 || blocked}
                title={blocked ? "Änderungen werden noch gespeichert …" : undefined}
                onClick={() => setConfirming(true)}
              >
                <Send size={14} /> {chosen.length === keys.length && keys.length > 1 ? "Alle" : chosen.length} veröffentlichen
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ── Texte dieser Seite ───────────────────────────────────────────────────────

export function PagePanel({ editor }: { editor: SiteTextEditor }) {
  const registry = useContext(TextRegistryContext);
  const version = useSyncExternalStore(
    registry?.subscribe ?? (() => () => {}),
    registry?.version ?? (() => 0),
    () => 0
  );
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const visible = new Set(registry?.keys() ?? []);
    const nsIds = Array.from(new Set(Array.from(visible).map(namespaceOf)));
    return NAMESPACES.filter((ns) => nsIds.includes(ns.id)).map((ns) => {
      const all = flattenNamespace(ns.texts);
      return {
        id: ns.id,
        title: ns.title,
        onPage: all.filter((d) => visible.has(d.key)),
        rest: all.filter((d) => !visible.has(d.key)),
      };
    });
    // version: neu berechnen, wenn sich Texte an-/abmelden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, version]);

  const value = (def: TextDef) => editor.drafts[def.key]?.value ?? editor.publishedMeta[def.key]?.value ?? def.text;

  return (
    <div className="st-panel-body">
      <p className="st-muted st-panel-note">
        Alle Texte dieser Seite – auch solche ohne festen Platz (Platzhalter, Fehlermeldungen, Alternativtexte). Änderungen werden als Entwurf gespeichert.
      </p>
      <input className="st-search" placeholder="Suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
      {groups.length === 0 && <p className="st-muted">Auf dieser Seite sind noch keine bearbeitbaren Texte.</p>}
      {groups.map((g) => {
        const onPage = g.onPage.filter((d) => matches(d, value(d), query));
        const rest = g.rest.filter((d) => matches(d, value(d), query));
        if (!onPage.length && !rest.length) return null;
        return (
          <section key={g.id} style={{ display: "grid", gap: 12 }}>
            <h4 className="st-group-title">{g.title}</h4>
            {onPage.map((def) => (
              <TextField key={def.key} def={def} editor={editor} />
            ))}
            {rest.length > 0 && (
              <details open={Boolean(query)}>
                <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--st-muted)" }}>
                  Weitere {rest.length} Texte aus „{g.title}“ (gerade nicht sichtbar: andere Zustände, Meldungen …)
                </summary>
                <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                  {rest.map((def) => (
                    <TextField key={def.key} def={def} editor={editor} visible={false} />
                  ))}
                </div>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ── Verlauf ──────────────────────────────────────────────────────────────────

export function HistoryList({ editor, keyFilter, limit = 50 }: { editor: SiteTextEditor; keyFilter?: string; limit?: number }) {
  const [rows, setRows] = useState<RevisionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Revisionen, deren alter Text gerade als Entwurf angelegt wurde (Rückmeldung am Knopf). */
  const [restored, setRestored] = useState<Set<number>>(() => new Set());

  // Nur neu laden, wenn sich der veröffentlichte Stand wirklich ändert – nicht bei
  // jedem Speichern eines Entwurfs (dabei entsteht jedes Mal ein neues Objekt).
  const publishedSig = useMemo(
    () =>
      Object.entries(editor.publishedMeta)
        .map(([k, v]) => `${k}@${v.updatedAt}`)
        .sort()
        .join("|"),
    [editor.publishedMeta]
  );

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    editor
      .history(keyFilter, limit)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e?.message ?? "Verlauf konnte nicht geladen werden."));
    return () => {
      cancelled = true;
    };
    // Neu laden, wenn veröffentlicht wurde.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyFilter, limit, publishedSig]);

  if (error) return <div className="st-error">{error}</div>;
  if (!rows) return <p className="st-muted"><Loader2 size={14} className="st-spin" /> Lädt …</p>;
  if (rows.length === 0) return <p className="st-muted">Noch nichts veröffentlicht.</p>;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((h) => {
        const def = TEXT_INDEX.get(h.key);
        // Aktueller Stand im Editor (Entwurf vor veröffentlicht; null = Original).
        const draft = editor.drafts[h.key];
        const current = draft ? draft.value : editor.publishedMeta[h.key]?.value ?? null;
        const isCurrent = current === h.oldValue;
        return (
          <div key={h.id} className="st-change">
            <span className="st-muted st-time">
              {new Date(h.changedAt).toLocaleString("de-DE")}
              {h.changedBy ? ` · ${h.changedBy}` : ""}
            </span>
            {!keyFilter && <span className="st-label">{def ? labelOf(def) : h.key}</span>}
            {!keyFilter && <code className="st-key">{h.key}</code>}
            <span className="st-diff-old">{h.oldValue === null ? `Original: ${short(def?.text)}` : short(h.oldValue)}</span>
            <span className="st-diff-new">{h.newValue === null ? "↺ zurück auf Original" : short(h.newValue)}</span>
            {def &&
              (isCurrent && draft && restored.has(h.id) ? (
                <span className="st-restored">
                  <Check size={13} /> Als Entwurf angelegt – live erst nach „Veröffentlichen“.
                </span>
              ) : isCurrent && draft ? (
                <span className="st-muted st-time">Dieser Text liegt schon als Entwurf vor.</span>
              ) : isCurrent ? (
                <span className="st-muted st-time">Dieser Text ist gerade live.</span>
              ) : (
                <button
                  type="button"
                  className="st-btn"
                  title="Legt den vorherigen Text als Entwurf an – veröffentlicht wird erst danach"
                  onClick={() => {
                    editor.setDraft(def, h.oldValue);
                    setRestored((prev) => new Set(prev).add(h.id));
                  }}
                >
                  <RotateCcw size={13} /> Vorherige Version als Entwurf
                </button>
              ))}
          </div>
        );
      })}
    </div>
  );
}

export function HistoryPanel({ editor }: { editor: SiteTextEditor }) {
  return (
    <div className="st-panel-body">
      <HistoryList editor={editor} />
    </div>
  );
}

export { namespaceTitle };
