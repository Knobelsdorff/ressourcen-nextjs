"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Eye, History, ListTree, Loader2, Pencil, RotateCcw, Undo2, X } from "lucide-react";
import { useSiteTextContext } from "./SiteTextProvider";
import "./site-text.css";

const BAR_HEIGHT = 56;

function short(text: string | null | undefined, max = 90) {
  if (text == null) return "—";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function EditModeBar() {
  const ctx = useSiteTextContext();
  const { isAdmin, editMode, setEditMode, draft, saving, save, discard, lastSavedAt } = ctx;
  const [mounted, setMounted] = useState(false);
  const [panel, setPanel] = useState<null | "changes" | "hidden" | "history">(null);
  const [justSaved, setJustSaved] = useState(false);
  const changes = Object.entries(draft);

  useEffect(() => setMounted(true), []);

  // Seite nach unten schieben, damit die Leiste nichts verdeckt.
  useEffect(() => {
    document.documentElement.classList.toggle("st-edit-mode", editMode);
    document.documentElement.style.setProperty("--st-bar-height", `${BAR_HEIGHT}px`);
    return () => document.documentElement.classList.remove("st-edit-mode");
  }, [editMode]);

  useEffect(() => {
    if (!lastSavedAt) return;
    setJustSaved(true);
    const t = window.setTimeout(() => setJustSaved(false), 2200);
    return () => window.clearTimeout(t);
  }, [lastSavedAt]);

  // Cmd/Ctrl+S speichert im Bearbeitungsmodus.
  useEffect(() => {
    if (!editMode) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, save]);

  if (!mounted || !isAdmin) return null;

  if (!editMode) {
    return createPortal(
      <button type="button" data-site-text-ui className="st-launcher" onClick={() => setEditMode(true)}>
        <Pencil size={15} /> Texte bearbeiten
      </button>,
      document.body
    );
  }

  const hiddenTexts = Array.from(ctx.registry.values()).filter((t) => t.kind === "hidden");

  const leaveEditMode = () => {
    if (changes.length > 0 && !window.confirm(`${changes.length} ungespeicherte Änderung(en) verwerfen?`)) return;
    discard();
    setPanel(null);
    setEditMode(false);
  };

  return createPortal(
    <div data-site-text-ui>
      <div className="st-bar" style={{ height: BAR_HEIGHT }}>
        <div className="st-bar-left">
          <span className="st-bar-badge">
            <Pencil size={14} /> Bearbeitungsmodus
          </span>
          <span className="st-bar-help">Text anklicken oder auf den Stift, um ihn zu ändern</span>
        </div>

        <div className="st-bar-right">
          <button type="button" className="st-bar-btn" onClick={() => setPanel(panel === "hidden" ? null : "hidden")}>
            <ListTree size={15} /> <span className="st-hide-sm">Weitere Texte</span>
            {hiddenTexts.length > 0 && <span className="st-count st-count-muted">{hiddenTexts.length}</span>}
          </button>
          <button type="button" className="st-bar-btn" onClick={() => setPanel(panel === "history" ? null : "history")}>
            <History size={15} /> <span className="st-hide-sm">Verlauf</span>
          </button>
          <button
            type="button"
            className="st-bar-btn"
            disabled={changes.length === 0}
            onClick={() => setPanel(panel === "changes" ? null : "changes")}
          >
            {changes.length > 0 ? (
              <>
                <span className="st-count">{changes.length}</span>
                <span className="st-hide-sm">{changes.length === 1 ? "Änderung" : "Änderungen"}</span>
                <ChevronDown size={14} />
              </>
            ) : justSaved ? (
              <>
                <Check size={15} /> Gespeichert
              </>
            ) : (
              <span className="st-muted">Keine Änderungen</span>
            )}
          </button>
          <button type="button" className="st-bar-btn" disabled={changes.length === 0 || saving} onClick={discard}>
            <Undo2 size={15} /> <span className="st-hide-sm">Verwerfen</span>
          </button>
          <button
            type="button"
            className="st-bar-btn st-bar-save"
            disabled={changes.length === 0 || saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 size={15} className="st-spin" /> : <Check size={15} />} Speichern
          </button>
          <button type="button" className="st-bar-btn st-bar-close" onClick={leaveEditMode} aria-label="Bearbeitungsmodus beenden" title="Bearbeitungsmodus beenden">
            <Eye size={15} /> <span className="st-hide-sm">Fertig</span>
          </button>
        </div>
      </div>

      {panel && (
        <div className="st-panel">
          <div className="st-panel-head">
            <strong>
              {panel === "changes" && "Ungespeicherte Änderungen"}
              {panel === "hidden" && "Weitere Texte dieser Seite"}
              {panel === "history" && "Zuletzt gespeichert"}
            </strong>
            <button type="button" className="st-icon-btn" onClick={() => setPanel(null)} aria-label="Schließen">
              <X size={16} />
            </button>
          </div>

          {panel === "changes" && (
            <ul className="st-list">
              {changes.length === 0 && <li className="st-muted">Keine offenen Änderungen.</li>}
              {changes.map(([key, value]) => {
                const def = ctx.registry.get(key)?.defaultValue;
                const before = ctx.saved[key] ?? def;
                return (
                  <li key={key} className="st-change">
                    <code className="st-key">{key}</code>
                    <div className="st-diff-old">{short(before)}</div>
                    <div className="st-diff-new">{value === null ? `↺ Original: ${short(def)}` : short(value)}</div>
                    <button type="button" className="st-btn" onClick={() => ctx.undoDraft(key)}>
                      <Undo2 size={13} /> Rückgängig
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {panel === "hidden" && (
            <div className="st-list">
              <p className="st-muted st-panel-note">
                Texte ohne festen Platz auf der Seite – Platzhalter in Feldern, Fehlermeldungen, Hinweise.
              </p>
              {hiddenTexts.map((t) => (
                <label key={t.key} className="st-field">
                  <span className="st-field-label">
                    {t.label ?? t.key}
                    {ctx.isDirty(t.key) && <span className="st-dot" aria-label="geändert" />}
                  </span>
                  <textarea
                    rows={2}
                    value={ctx.resolve(t.key, t.defaultValue)}
                    onChange={(e) => ctx.setDraftValue(t.key, e.target.value, t.defaultValue)}
                  />
                  <span className="st-field-foot">
                    <code className="st-key">{t.key}</code>
                    {ctx.isOverridden(t.key) && (
                      <button type="button" className="st-link" onClick={() => ctx.resetToDefault(t.key)}>
                        <RotateCcw size={12} /> Original
                      </button>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}

          {panel === "history" && (
            <ul className="st-list">
              {ctx.history.length === 0 && <li className="st-muted">Noch nichts gespeichert.</li>}
              {ctx.history.slice(0, 30).map((h, i) => (
                <li key={`${h.key}-${h.at}-${i}`} className="st-change">
                  <span className="st-muted st-time">{new Date(h.at).toLocaleString("de-DE")}</span>
                  <code className="st-key">{h.key}</code>
                  <div className="st-diff-old">{short(h.oldValue ?? ctx.registry.get(h.key)?.defaultValue)}</div>
                  <div className="st-diff-new">{h.newValue === null ? "↺ Original" : short(h.newValue)}</div>
                  <button
                    type="button"
                    className="st-btn"
                    title="Stellt den vorherigen Text als Entwurf wieder her"
                    onClick={() => {
                      const def = ctx.registry.get(h.key)?.defaultValue ?? "";
                      if (h.oldValue === null) ctx.resetToDefault(h.key);
                      else ctx.setDraftValue(h.key, h.oldValue, def);
                    }}
                  >
                    <RotateCcw size={13} /> Diese Version zurückholen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
