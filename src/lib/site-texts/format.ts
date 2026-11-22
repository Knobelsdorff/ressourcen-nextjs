/*
 * Gemeinsame Logik für Server und Browser: Variablen einsetzen, Texte prüfen,
 * die kleine Auszeichnung (**fett**, [Link](/pfad), Überschriften, Listen)
 * in einen Baum zerlegen. Gerendert wird der Baum in render.tsx – nie als
 * HTML-String, damit eingegebener Text kein Markup einschleusen kann.
 */

import type { TextDef } from "./define";

const VAR_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

export type TextVars = Record<string, string | number | null | undefined>;

/** Ersetzt {name}. Fehlende Werte bleiben sichtbar stehen, damit Fehler auffallen. */
export function interpolate(text: string, vars?: TextVars): string {
  if (!vars) return text;
  return text.replace(VAR_RE, (match, name: string) => {
    const v = vars[name];
    return v === undefined || v === null ? match : String(v);
  });
}

export function placeholdersOf(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(VAR_RE)) names.add(m[1]);
  return Array.from(names);
}

/** FNV-1a (32 Bit) – nur um zu erkennen, ob sich der Original-Text im Code geändert hat. */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ── Links ───────────────────────────────────────────────────────────────────

/** Erlaubt sind interne Pfade, Anker, http(s), mailto: und tel:. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^\/(?!\/)/.test(h) || h.startsWith("#")) return h;
  if (/^https?:\/\/[^\s]+$/i.test(h)) return h;
  if (/^mailto:[^\s]+$/i.test(h) || /^tel:[+0-9 ()\-/]+$/i.test(h)) return h;
  return null;
}

export function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

// ── Inline-Auszeichnung ──────────────────────────────────────────────────────

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

const INLINE_RE = /\*\*(.+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const start = m.index ?? 0;
    if (start > last) nodes.push({ type: "text", value: text.slice(last, start) });
    if (m[1] !== undefined) {
      nodes.push({ type: "bold", children: parseInline(m[1]) });
    } else {
      const href = safeHref(m[3]);
      const children = parseInline(m[2]);
      // Unsichere Ziele werden als reiner Text gezeigt, nie als Link.
      if (href) nodes.push({ type: "link", href, children });
      else nodes.push(...children);
    }
    last = start + m[0].length;
  }
  if (last < text.length) nodes.push({ type: "text", value: text.slice(last) });
  return nodes;
}

/** Für Stellen, die nur einen String annehmen (aria-label, placeholder …). */
export function stripInline(text: string): string {
  return text.replace(INLINE_RE, (_m, bold: string | undefined, label: string | undefined) =>
    bold !== undefined ? stripInline(bold) : stripInline(label ?? "")
  );
}

// ── Blöcke (für lange Texte wie Impressum/Datenschutz) ─────────────────────

export type BlockNode =
  | { type: "h2" | "h3"; text: string }
  | { type: "p"; lines: string[] }
  | { type: "ul" | "ol"; items: string[] };

export function parseBlocks(text: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  let para: string[] | null = null;
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flush = () => {
    if (para && para.length) blocks.push({ type: "p", lines: para });
    if (list && list.items.length) blocks.push(list);
    para = null;
    list = null;
  };

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trim() === "") {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: heading[1].length >= 3 ? "h3" : "h2", text: heading[2].trim() });
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const type = ul ? "ul" : "ol";
      if (!list || list.type !== type) {
        flush();
        list = { type, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    if (list && /^\s{2,}\S/.test(rawLine)) {
      // eingerückte Folgezeile gehört zum letzten Listenpunkt
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    if (list) flush();
    if (!para) para = [];
    para.push(line.trim());
  }
  flush();
  return blocks;
}

// ── Prüfung vor dem Speichern (Browser zeigt Hinweise, Server entscheidet) ──

export interface ValidationResult {
  value: string;
  errors: string[];
  warnings: string[];
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function normalizeText(def: TextDef, raw: string): string {
  let v = raw.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "");
  if (!def.multiline) v = v.replace(/\s*\n\s*/g, " ");
  // Nur Ränder trimmen, damit absichtliche Zeilenumbrüche innen bleiben.
  return v.replace(/^[ \t\n]+|[ \t\n]+$/g, "");
}

export function validateText(def: TextDef, raw: string): ValidationResult {
  const value = normalizeText(def, raw);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (value.trim() === "") errors.push("Der Text darf nicht leer sein.");
  if (value.length > def.maxLength) {
    errors.push(`Der Text ist zu lang (${value.length} von maximal ${def.maxLength} Zeichen).`);
  }

  const allowed = Object.keys(def.vars);
  const unknown = placeholdersOf(value).filter((name) => !allowed.includes(name));
  if (unknown.length) {
    errors.push(
      allowed.length
        ? `Unbekannte Variable ${unknown.map((n) => `{${n}}`).join(", ")}. Erlaubt: ${allowed.map((n) => `{${n}}`).join(", ")}.`
        : `Dieser Text hat keine Variablen – bitte ${unknown.map((n) => `{${n}}`).join(", ")} entfernen.`
    );
  }
  const missing = placeholdersOf(def.text).filter((name) => !value.includes(`{${name}}`));
  if (missing.length) {
    warnings.push(`Variable ${missing.map((n) => `{${n}}`).join(", ")} fehlt – der Wert wird dann nicht angezeigt.`);
  }

  if (def.format !== "plain") {
    for (const m of value.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)) {
      if (!safeHref(m[1])) errors.push(`Link-Ziel nicht erlaubt: ${m[1]} (erlaubt: /pfad, https://…, mailto:, tel:)`);
    }
  }

  return { value, errors, warnings };
}
