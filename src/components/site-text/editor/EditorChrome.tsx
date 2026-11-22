"use client";

/*
 * Admin-Oberfläche des Texteditors: Startknopf, obere Leiste, Panels,
 * Vorschau-Pille und großer Editor. Wird nur für Admins geladen.
 *
 * Ablauf: Text anklicken → tippen → Übernehmen (= Entwurf, automatisch auf dem
 * Server gespeichert) → "Veröffentlichen" → alle Besucher sehen ihn.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Eye, FileText, History, ListTree, Loader2, Pencil, RefreshCw, Send, X } from "lucide-react";
import { useSiteTextEditor } from "../context";
import { TRANSLATION_MESSAGE } from "../translation";
import { BlockEditorDrawer } from "./BlockEditorDrawer";
import { ChangesPanel, HistoryPanel, PagePanel } from "./panels";
import { useForeignDialogOpen } from "./useForeignDialogOpen";
import "./site-text.css";

const BAR_HEIGHT = 56;
type Panel = null | "changes" | "page" | "history";

export default function EditorChrome() {
  const editor = useSiteTextEditor();
  const [mounted, setMounted] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [translationHint, setTranslationHint] = useState(false);

  useEffect(() => setMounted(true), []);

  const editMode = editor?.editMode ?? false;
  const preview = editor?.preview ?? false;
  // Offener Dialog der Seite (z. B. Player) → Leiste/Pille klein machen, damit
  // dessen Knöpfe (Schließen oben links/rechts, Abspielen unten) frei bleiben.
  const dialogOpen = useForeignDialogOpen(editMode || preview, BAR_HEIGHT + 4);

  // Seite nach unten schieben, damit die Leiste nichts verdeckt.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("st-edit-mode", editMode);
    root.classList.toggle("st-preview-mode", preview);
    root.style.setProperty("--st-bar-height", `${BAR_HEIGHT}px`);
    return () => {
      root.classList.remove("st-edit-mode");
      root.classList.remove("st-preview-mode");
    };
  }, [editMode, preview]);

  const lastSavedAt = editor?.lastSavedAt;
  useEffect(() => {
    if (!lastSavedAt) return;
    setJustSaved(true);
    const t = window.setTimeout(() => setJustSaved(false), 2000);
    return () => window.clearTimeout(t);
  }, [lastSavedAt]);

  // Strg/Cmd+S: sofort speichern statt Browser-Dialog.
  const retrySave = editor?.retrySave;
  useEffect(() => {
    if (!editMode || !retrySave) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        retrySave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, retrySave]);

  useEffect(() => {
    if (!editMode) setPanel(null);
  }, [editMode]);

  if (!mounted || !editor) return null;

  const draftCount = Object.keys(editor.drafts).length;

  const banner =
    editor.translated && (editMode || preview || translationHint) ? (
      <div className="st-banner" data-site-text-ui role="alert">
        <AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }} />
        {TRANSLATION_MESSAGE}
        <button type="button" className="st-btn" onClick={() => window.location.reload()}>
          <RefreshCw size={13} /> Seite neu laden
        </button>
      </div>
    ) : editor.loadState === "missing-table" ? (
      <div className="st-banner" data-site-text-ui>
        <AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }} />
        Die Text-Tabellen fehlen in Supabase. Bitte die Migration <code>20261120120000_site_texts.sql</code> einspielen – bis dahin kann nichts
        gespeichert werden.
      </div>
    ) : editor.saveError ? (
      <div className="st-banner" data-site-text-ui>
        <AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }} />
        Nicht gespeichert: {editor.saveError}
        {editor.pendingCount > 0 && (
          <button type="button" className="st-btn" onClick={editor.retrySave}>
            <RefreshCw size={13} /> Erneut speichern
          </button>
        )}
      </div>
    ) : editor.loadState === "error" ? (
      <div className="st-banner" data-site-text-ui>
        <AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }} />
        Entwürfe konnten nicht geladen werden{editor.loadError ? `: ${editor.loadError}` : ""}.
        <button type="button" className="st-btn" onClick={() => void editor.reload()}>
          <RefreshCw size={13} /> Neu laden
        </button>
      </div>
    ) : null;

  const drawer = editor.blockEditor ? (
    <BlockEditorDrawer key={editor.blockEditor.def.key} target={editor.blockEditor} editor={editor} />
  ) : null;

  // ── Vorschau ──
  if (preview) {
    return createPortal(
      <>
        <div data-site-text-ui className={`st-preview-pill${dialogOpen ? " st-pill-top" : ""}`}>
          <Eye size={16} /> Vorschau{draftCount ? ` mit ${draftCount} ${draftCount === 1 ? "Entwurf" : "Entwürfen"}` : ""}
          <button type="button" className="st-btn" onClick={() => editor.setPreview(false)}>
            <Pencil size={13} /> Weiter bearbeiten
          </button>
          <button type="button" className="st-btn" onClick={() => editor.setEditMode(false)} title="Bearbeitungsmodus verlassen">
            <X size={13} />
          </button>
        </div>
        {banner}
      </>,
      document.body
    );
  }

  // ── Aus: nur Startknopf ──
  if (!editMode) {
    return createPortal(
      <>
        <div className="st-launcher-group" data-site-text-ui>
          <button
            type="button"
            className="st-launcher"
            onClick={() => {
              // Übersetzte Seite: erst Hinweis zeigen statt Bearbeitungsmodus (Texte würden doppelt).
              if (editor.translated) setTranslationHint(true);
              else editor.setEditMode(true);
            }}
          >
            <Pencil size={15} /> Texte bearbeiten
            {draftCount > 0 && <span className="st-count" title="Entwürfe, noch nicht veröffentlicht">{draftCount}</span>}
          </button>
        </div>
        {banner}
        {drawer}
      </>,
      document.body
    );
  }

  // Entwürfe noch nicht vom Server: nicht "Alles veröffentlicht" behaupten, nichts veröffentlichen.
  const loadingDrafts = editor.loadState === "idle" || editor.loadState === "loading";

  const status = editor.saving ? (
    <span className="st-bar-status">
      <Loader2 size={14} className="st-spin" /> Speichert …
    </span>
  ) : editor.saveError ? (
    <span className="st-bar-status st-status-error">
      <AlertTriangle size={14} /> Nicht gespeichert
    </span>
  ) : justSaved ? (
    <span className="st-bar-status">
      <Check size={14} /> Entwurf gespeichert
    </span>
  ) : loadingDrafts ? (
    <span className="st-bar-status">
      <Loader2 size={14} className="st-spin" /> Lädt Entwürfe …
    </span>
  ) : draftCount > 0 ? (
    <span className="st-bar-status">{draftCount === 1 ? "1 Entwurf" : `${draftCount} Entwürfe`} – noch nicht live</span>
  ) : (
    <span className="st-bar-status st-hide-sm">Alles veröffentlicht</span>
  );

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return createPortal(
    <div data-site-text-ui>
      <div
        className={`st-bar${dialogOpen ? " st-bar-compact" : ""}`}
        style={dialogOpen ? undefined : { height: BAR_HEIGHT }}
        title={dialogOpen ? "Bearbeitungsmodus – verkleinert, solange ein Fenster der Seite offen ist" : undefined}
      >
        <div className="st-bar-left">
          <span className="st-bar-badge">
            <Pencil size={14} /> <span className="st-bar-badge-label">Bearbeitungsmodus</span>
          </span>
          {status}
        </div>

        <div className="st-bar-right">
          <button type="button" className={`st-bar-btn${panel === "page" ? " st-active" : ""}`} onClick={() => toggle("page")} title="Alle Texte dieser Seite, auch Meldungen und Platzhalter">
            <ListTree size={15} /> <span className="st-hide-sm">Diese Seite</span>
          </button>
          <button type="button" className={`st-bar-btn${panel === "history" ? " st-active" : ""}`} onClick={() => toggle("history")}>
            <History size={15} /> <span className="st-hide-sm">Verlauf</span>
          </button>
          <a
            className="st-bar-btn st-hide-sm"
            href="/admin/texte"
            title="Alle Texte der Website"
            onClick={(e) => {
              // Offene Eingabe übernehmen und speichern, dann erst die Seite wechseln.
              e.preventDefault();
              if (!editor.commitActiveEdit()) return;
              void editor.saveNow().then(() => window.location.assign("/admin/texte"));
            }}
          >
            <FileText size={15} /> Alle Texte
          </a>
          <button type="button" className="st-bar-btn" onClick={() => editor.setPreview(true)} title="Seite mit Entwürfen ansehen, wie Besucher sie sehen würden">
            <Eye size={15} /> <span className="st-hide-sm">Vorschau</span>
          </button>
          <button type="button" className={`st-bar-btn st-bar-publish${panel === "changes" ? " st-active" : ""}`} disabled={draftCount === 0 || loadingDrafts} onClick={() => toggle("changes")}>
            <Send size={15} /> <span className="st-hide-sm">Veröffentlichen</span>
            {draftCount > 0 && <span className="st-count">{draftCount}</span>}
          </button>
          <button
            type="button"
            className="st-bar-btn st-bar-close"
            onClick={() => editor.setEditMode(false)}
            aria-label="Bearbeitungsmodus beenden"
            title="Bearbeitungsmodus beenden – Entwürfe bleiben gespeichert"
          >
            <X size={15} /> <span className="st-hide-sm">Fertig</span>
          </button>
        </div>
      </div>

      {banner}

      {panel && (
        <div className={`st-panel${panel === "page" ? " st-panel-wide" : ""}`}>
          <div className="st-panel-head">
            <strong>
              {panel === "changes" && "Entwürfe veröffentlichen"}
              {panel === "page" && "Texte dieser Seite"}
              {panel === "history" && "Verlauf"}
            </strong>
            <button type="button" className="st-icon-btn" onClick={() => setPanel(null)} aria-label="Schließen">
              <X size={16} />
            </button>
          </div>
          {panel === "changes" && <ChangesPanel editor={editor} onDone={() => setPanel(null)} />}
          {panel === "page" && <PagePanel editor={editor} />}
          {panel === "history" && <HistoryPanel editor={editor} />}
        </div>
      )}

      {drawer}
    </div>,
    document.body
  );
}
