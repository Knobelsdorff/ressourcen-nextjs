"use client";

/*
 * Großer Editor für lange Texte: links Text mit Auszeichnung, rechts die
 * Vorschau genau so, wie sie auf der Seite erscheint.
 */

import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { validateText } from "@/lib/site-texts/format";
import { renderText } from "@/lib/site-texts/render";
import type { BlockEditorTarget, SiteTextEditor } from "../context";
import { currentValue, FormatButtons, labelOf, prefixLines, textStatus, VarChips, wrapInTextarea } from "./shared";
import { StatusBadges } from "./TextField";

export function BlockEditorDrawer({ target, editor }: { target: BlockEditorTarget; editor: SiteTextEditor }) {
  const { def, vars } = target;
  const start = currentValue(def, editor);
  const [local, setLocal] = useState(start);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const status = textStatus(def, editor);
  const dirty = local !== start;

  const close = () => {
    if (dirty && !window.confirm("Änderungen in diesem Text verwerfen?")) return;
    editor.openBlockEditor(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const apply = (force = false) => {
    const result = validateText(def, local);
    setErrors(result.errors);
    if (result.errors.length) return;
    if (!force && result.warnings.length && result.warnings.join() !== warnings.join()) {
      setWarnings(result.warnings);
      return;
    }
    if (result.value !== start) editor.setDraft(def, result.value);
    editor.openBlockEditor(null);
  };

  return (
    <div data-site-text-ui>
      <div className="st-drawer-backdrop" onClick={close} />
      <div className="st-drawer" role="dialog" aria-label={`Text bearbeiten: ${labelOf(def)}`}>
        <div className="st-drawer-head">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <strong style={{ fontSize: 16 }}>{labelOf(def)}</strong>
            <button type="button" className="st-icon-btn" onClick={close} aria-label="Schließen">
              <X size={18} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <code className="st-key">{def.key}</code>
            <StatusBadges def={def} editor={editor} />
          </div>
        </div>

        <div className="st-drawer-body">
          <div className="st-drawer-col">
            <FormatButtons
              format={def.format}
              onBold={() => ref.current && setLocal(wrapInTextarea(ref.current, "**", "**", "fett"))}
              onLink={(url) => ref.current && setLocal(wrapInTextarea(ref.current, "[", `](${url})`, "Linktext"))}
              onPrefix={(prefix) => ref.current && setLocal(prefixLines(ref.current, prefix))}
            />
            <textarea
              ref={ref}
              value={local}
              spellCheck
              onChange={(e) => {
                setLocal(e.target.value);
                setErrors([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  apply(warnings.length > 0);
                }
              }}
            />
            <VarChips def={def} onInsert={(token) => ref.current && setLocal(wrapInTextarea(ref.current, token))} />
            {def.format === "markdown" && (
              <p className="st-md-help">
                Leerzeile = neuer Absatz · <code>## Überschrift</code> · <code>### Zwischenüberschrift</code> ·{" "}
                <code>- Listenpunkt</code> · <code>**fett**</code> · <code>[Linktext](https://…)</code>
              </p>
            )}
            {def.format === "inline" && (
              <p className="st-md-help">
                <code>**fett**</code> · <code>[Linktext](/pfad)</code>
              </p>
            )}
            {status.codeChanged && (
              <div className="st-warning">Der Original-Text im Code wurde seit der veröffentlichten Änderung angepasst.</div>
            )}
            {errors.map((m) => (
              <div key={m} className="st-error">{m}</div>
            ))}
            {warnings.map((m) => (
              <div key={m} className="st-warning">{m}</div>
            ))}
          </div>
          <div className="st-drawer-col">
            <span className="st-group-title" style={{ margin: 0 }}>Vorschau</span>
            {/* Mit den Klassen der Seite – sieht dann aus wie auf der Seite. */}
            <div
              className={target.classNames ? `st-md-preview st-md-preview-page ${target.className ?? ""}` : "st-md-preview"}
              style={target.classNames ? target.baseStyle : undefined}
            >
              {renderText(local, def.format, vars, target.classNames ?? {})}
            </div>
          </div>
        </div>

        <div className="st-drawer-foot">
          <div style={{ display: "flex", gap: 8 }}>
            {(status.isOverridden || status.hasDraft) && (
              <button
                type="button"
                className="st-btn"
                title="Zurück auf den Text aus dem Code (als Entwurf)"
                onClick={() => {
                  if (!window.confirm("Zurück auf den Original-Text aus dem Code? (wird als Entwurf gespeichert)")) return;
                  editor.setDraft(def, null);
                  editor.openBlockEditor(null);
                }}
              >
                <RotateCcw size={14} /> Original
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="st-btn" onClick={close}>
              Abbrechen
            </button>
            <button type="button" className="st-btn st-btn-primary" onClick={() => apply(warnings.length > 0)}>
              <Check size={14} /> {warnings.length ? "Trotzdem übernehmen" : "Als Entwurf übernehmen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
