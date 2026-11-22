"use client";

/*
 * Ein Text als Eingabefeld – für das Panel "Diese Seite" und /admin/texte.
 * Gedacht für Texte ohne festen Platz auf der Seite (Platzhalter,
 * Fehlermeldungen, Alternativtexte) und für die Gesamtübersicht.
 */

import { useEffect, useRef, useState } from "react";
import { Expand, RotateCcw, Undo2 } from "lucide-react";
import type { TextDef } from "@/lib/site-texts/define";
import { validateText } from "@/lib/site-texts/format";
import type { SiteTextEditor } from "../context";
import { currentValue, FormatButtons, labelOf, prefixLines, textStatus, VarChips, wrapInTextarea } from "./shared";

export function StatusBadges({ def, editor, visible }: { def: TextDef; editor: SiteTextEditor; visible?: boolean }) {
  const s = textStatus(def, editor);
  return (
    <>
      {s.hasDraft && <span className="st-badge st-badge-draft">{s.draftResets ? "Entwurf: zurück auf Original" : "Entwurf"}</span>}
      {s.isOverridden && <span className="st-badge st-badge-live">Geändert (live)</span>}
      {s.codeChanged && <span className="st-badge st-badge-warn" title={`Neues Original: ${def.text}`}>Original im Code geändert</span>}
      {visible === false && <span className="st-badge st-badge-hidden">kein fester Platz</span>}
    </>
  );
}

export function TextField({ def, editor, visible }: { def: TextDef; editor: SiteTextEditor; visible?: boolean }) {
  const current = currentValue(def, editor);
  const [local, setLocal] = useState(current);
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const status = textStatus(def, editor);

  // Änderungen von außen übernehmen, solange hier nicht getippt wird.
  useEffect(() => {
    if (!touched) setLocal(current);
  }, [current, touched]);

  const apply = () => {
    if (!touched) return;
    const result = validateText(def, local);
    setErrors(result.errors);
    setWarnings(result.warnings);
    if (result.errors.length) return;
    if (result.value !== current) editor.setDraft(def, result.value);
    setTouched(false);
  };

  const update = (next: string) => {
    setLocal(next);
    setTouched(true);
    setErrors([]);
  };

  const rows = Math.min(10, Math.max(def.format === "markdown" ? 6 : 2, Math.ceil(local.length / 60) + local.split("\n").length - 1));

  return (
    <div className="st-field">
      <span className="st-field-label" style={{ flexWrap: "wrap" }}>
        {labelOf(def)} <StatusBadges def={def} editor={editor} visible={visible} />
      </span>
      <textarea
        ref={ref}
        rows={rows}
        value={local}
        onChange={(e) => update(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            apply();
          }
          if (e.key === "Enter" && !def.multiline && !e.shiftKey) {
            e.preventDefault();
            apply();
          }
        }}
      />
      <VarChips
        def={def}
        onInsert={(token) => {
          if (ref.current) update(wrapInTextarea(ref.current, token));
        }}
      />
      <FormatButtons
        format={def.format}
        onBold={() => ref.current && update(wrapInTextarea(ref.current, "**", "**", "fett"))}
        onLink={(url) => ref.current && update(wrapInTextarea(ref.current, "[", `](${url})`, "Linktext"))}
        onPrefix={(prefix) => ref.current && update(prefixLines(ref.current, prefix))}
      />
      {errors.map((m) => (
        <div key={m} className="st-error">{m}</div>
      ))}
      {warnings.map((m) => (
        <div key={m} className="st-warning">{m}</div>
      ))}
      <span className="st-field-foot">
        <code className="st-key">{def.key}</code>
        <span style={{ display: "inline-flex", gap: 10 }}>
          {(def.format === "markdown" || local.length > 280) && (
            <button type="button" className="st-link" onClick={() => editor.openBlockEditor({ def })}>
              <Expand size={12} /> Großer Editor
            </button>
          )}
          {status.hasDraft && (
            <button type="button" className="st-link" onClick={() => { setTouched(false); editor.discardDrafts([def.key]); }}>
              <Undo2 size={12} /> Entwurf verwerfen
            </button>
          )}
          {(status.isOverridden || (status.hasDraft && !status.draftResets)) && (
            <button type="button" className="st-link" onClick={() => { setTouched(false); editor.setDraft(def, null); }} title={`Original: ${def.text}`}>
              <RotateCcw size={12} /> Original
            </button>
          )}
        </span>
      </span>
    </div>
  );
}
