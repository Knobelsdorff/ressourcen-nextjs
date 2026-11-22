"use client";

import { useState } from "react";
import { Bold, Heading2, Heading3, Link2, List } from "lucide-react";
import type { TextDef } from "@/lib/site-texts/define";
import { textHash } from "@/lib/site-texts/format";
import type { SiteTextEditor } from "../context";

export function labelOf(def: TextDef) {
  return def.label ?? def.key;
}

export function short(text: string | null | undefined, max = 110) {
  if (text == null) return "—";
  const flat = text.replace(/\s*\n\s*/g, " ⏎ ");
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** Status eines Texts für Markierungen und Badges. */
export function textStatus(def: TextDef, editor: SiteTextEditor) {
  const draft = editor.drafts[def.key];
  const live = editor.publishedMeta[def.key];
  return {
    hasDraft: Boolean(draft),
    draftResets: draft ? draft.value === null : false,
    isOverridden: Boolean(live),
    /** Veröffentlichte Änderung beruht auf einem älteren Original im Code. */
    codeChanged: Boolean(live?.baseHash && live.baseHash !== textHash(def.text)),
    publishedValue: live?.value,
  };
}

/** Aktueller Wert im Editor: Entwurf → veröffentlicht → Original. */
export function currentValue(def: TextDef, editor: SiteTextEditor) {
  const draft = editor.drafts[def.key];
  if (draft) return draft.value ?? def.text;
  return editor.publishedMeta[def.key]?.value ?? def.text;
}

/** Text an der Cursor-Position einfügen (contentEditable). */
export function insertIntoEditable(text: string) {
  // execCommand ist veraltet, aber die einzige Möglichkeit, die Undo-Historie zu erhalten.
  document.execCommand("insertText", false, text);
}

/** Auswahl in einem Textfeld umschließen bzw. Text einfügen; liefert neuen Wert. */
export function wrapInTextarea(
  el: HTMLTextAreaElement,
  before: string,
  after = "",
  placeholder = ""
): string {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const selected = value.slice(s, e) || placeholder;
  const next = value.slice(0, s) + before + selected + after + value.slice(e);
  const cursorStart = s + before.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(cursorStart, cursorStart + selected.length);
  });
  return next;
}

/** Zeilenanfang setzen (Überschrift, Liste) für alle markierten Zeilen. */
export function prefixLines(el: HTMLTextAreaElement, prefix: string): string {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  const lineEndIdx = value.indexOf("\n", e);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const block = value
    .slice(lineStart, lineEnd)
    .split("\n")
    .map((line) => prefix + line.replace(/^(#{1,3}\s+|[-*]\s+|\d+[.)]\s+)/, ""))
    .join("\n");
  requestAnimationFrame(() => el.focus());
  return value.slice(0, lineStart) + block + value.slice(lineEnd);
}

export function VarChips({ def, onInsert }: { def: TextDef; onInsert: (token: string) => void }) {
  const names = Object.keys(def.vars);
  if (names.length === 0) return null;
  return (
    <div className="st-vars">
      <span className="st-vars-label">Variablen (Klick fügt ein):</span>
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className="st-var"
          title={def.vars[name]}
          // mousedown statt click: Fokus/Cursor im Text bleibt erhalten
          onMouseDown={(e) => {
            e.preventDefault();
            onInsert(`{${name}}`);
          }}
        >
          {`{${name}}`}
          <span style={{ opacity: 0.75, fontFamily: "inherit" }}>· {def.vars[name]}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Knöpfe für fett / Link (inline) und zusätzlich Überschrift / Liste (markdown).
 * `apply` bekommt die gewünschte Aktion; die Komponente kümmert sich nur um die
 * Link-Eingabe.
 */
export function FormatButtons({
  format,
  onBold,
  onLink,
  onPrefix,
}: {
  format: TextDef["format"];
  onBold: () => void;
  onLink: (url: string) => void;
  onPrefix?: (prefix: string) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  if (format === "plain") return null;
  const keep = (e: React.MouseEvent) => e.preventDefault();
  return (
    <div className="st-format-row">
      <button type="button" className="st-btn" onMouseDown={keep} onClick={onBold} title="Fett: **Text**">
        <Bold size={13} /> Fett
      </button>
      <button type="button" className="st-btn" onMouseDown={keep} onClick={() => setLinkOpen((v) => !v)} title="Link: [Text](/pfad)">
        <Link2 size={13} /> Link
      </button>
      {format === "markdown" && onPrefix && (
        <>
          <button type="button" className="st-btn" onMouseDown={keep} onClick={() => onPrefix("## ")} title="Überschrift">
            <Heading2 size={13} /> Überschrift
          </button>
          <button type="button" className="st-btn" onMouseDown={keep} onClick={() => onPrefix("### ")} title="Zwischenüberschrift">
            <Heading3 size={13} /> Klein
          </button>
          <button type="button" className="st-btn" onMouseDown={keep} onClick={() => onPrefix("- ")} title="Liste">
            <List size={13} /> Liste
          </button>
        </>
      )}
      {linkOpen && (
        <>
          <input
            value={url}
            placeholder="/seite, https://…, mailto:…"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && url.trim()) {
                e.preventDefault();
                onLink(url.trim());
                setLinkOpen(false);
                setUrl("");
              }
            }}
          />
          <button
            type="button"
            className="st-btn st-btn-primary"
            disabled={!url.trim()}
            onMouseDown={keep}
            onClick={() => {
              onLink(url.trim());
              setLinkOpen(false);
              setUrl("");
            }}
          >
            Einfügen
          </button>
        </>
      )}
    </div>
  );
}
