/*
 * Text-Katalog: jeder sichtbare Text der Seite hat hier einen festen Schlüssel
 * und seinen Original-Text ("Default"). Supabase speichert nur, was ein Admin
 * davon abweichend veröffentlicht hat.
 *
 *   export const landing = defineTexts("landing", {
 *     "hero.title": "Finde innere Ruhe …",
 *     "hero.cta": { text: "Jetzt starten", label: "Button im Hero" },
 *     "trial.days": { one: "Noch 1 Tag", other: "Noch {count} Tage" },
 *   });
 *
 *   <T t={landing["hero.title"]} />            // im JSX
 *   const label = useText(landing["hero.cta"]); // als String (placeholder, aria-label …)
 *
 * Regeln:
 * - Schlüssel nie umbenennen, wenn der Text schon bearbeitet sein könnte –
 *   sonst geht die Änderung verloren (die alte Zeile bleibt in der DB und
 *   erscheint in /admin/texte als "nicht mehr verwendet").
 * - Variablen schreiben sich {name} und brauchen eine Beschreibung in `vars`,
 *   damit der Admin weiß, was dort eingesetzt wird.
 * - Diese Datei hat keine React-Abhängigkeit: Server (Metadaten, API) und
 *   Browser nutzen denselben Katalog.
 */

export type TextFormat = "plain" | "inline" | "markdown";

/** Ein bearbeitbarer Text = eine Zeile in der Datenbank. */
export interface TextDef {
  readonly kind: "text";
  /** Vollständiger Schlüssel, z. B. "landing.hero.title". */
  readonly key: string;
  /** Original-Text aus dem Code. */
  readonly text: string;
  readonly format: TextFormat;
  /** Erlaubte Variablen: Name → Erklärung für den Admin. */
  readonly vars: Readonly<Record<string, string>>;
  /** Kurze Beschreibung für Panels ("Button im Hero"). */
  readonly label?: string;
  readonly multiline: boolean;
  readonly maxLength: number;
}

/** Text mit Einzahl/Mehrzahl – zwei bearbeitbare Formen. */
export interface PluralDef {
  readonly kind: "plural";
  readonly key: string;
  readonly one: TextDef;
  readonly other: TextDef;
  /** Name der Zahl-Variable, die die Form auswählt (Standard: count). */
  readonly countVar: string;
}

export type AnyTextDef = TextDef | PluralDef;

type TextOptions = {
  format?: TextFormat;
  vars?: Record<string, string>;
  label?: string;
  multiline?: boolean;
  maxLength?: number;
};

export type TextInput =
  | string
  | ({ text: string } & TextOptions)
  | ({ one: string; other: string; countVar?: string } & TextOptions);

type DefFor<I> = I extends { one: string } ? PluralDef : TextDef;

export type TextNamespace<T extends Record<string, TextInput>> = {
  readonly [K in keyof T]: DefFor<T[K]>;
};

export const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_-]+)+$/;
export const MAX_KEY_LENGTH = 150;

const DEFAULT_MAX_LENGTH: Record<TextFormat, number> = {
  plain: 2000,
  inline: 2000,
  markdown: 20000,
};

function makeText(key: string, text: string, opts: TextOptions): TextDef {
  if (process.env.NODE_ENV !== "production") {
    if (!KEY_PATTERN.test(key) || key.length > MAX_KEY_LENGTH) {
      throw new Error(`[site-texts] Ungültiger Schlüssel: "${key}"`);
    }
  }
  const format = opts.format ?? "plain";
  return Object.freeze({
    kind: "text" as const,
    key,
    text,
    format,
    vars: Object.freeze({ ...(opts.vars ?? {}) }),
    label: opts.label,
    multiline: opts.multiline ?? true,
    maxLength: opts.maxLength ?? DEFAULT_MAX_LENGTH[format],
  });
}

export function defineTexts<const T extends Record<string, TextInput>>(
  namespace: string,
  entries: T
): TextNamespace<T> {
  const out: Record<string, AnyTextDef> = {};
  for (const [name, input] of Object.entries(entries)) {
    const key = `${namespace}.${name}`;
    if (typeof input === "string") {
      out[name] = makeText(key, input, {});
    } else if ("one" in input) {
      const countVar = input.countVar ?? "count";
      const vars = { [countVar]: "Anzahl (wird automatisch eingesetzt)", ...(input.vars ?? {}) };
      const opts = { ...input, vars };
      out[name] = Object.freeze({
        kind: "plural" as const,
        key,
        countVar,
        one: makeText(`${key}.one`, input.one, { ...opts, label: `${input.label ?? name} (Einzahl)` }),
        other: makeText(`${key}.other`, input.other, { ...opts, label: `${input.label ?? name} (Mehrzahl)` }),
      });
    } else {
      out[name] = makeText(key, input.text, input);
    }
  }
  return Object.freeze(out) as TextNamespace<T>;
}

/** Alle bearbeitbaren Einzeltexte eines Namespaces (Plural → zwei Einträge). */
export function flattenNamespace(ns: Record<string, AnyTextDef>): TextDef[] {
  const list: TextDef[] = [];
  for (const def of Object.values(ns)) {
    if (def.kind === "plural") list.push(def.one, def.other);
    else list.push(def);
  }
  return list;
}

export function namespaceOf(key: string): string {
  const dot = key.indexOf(".");
  return dot === -1 ? key : key.slice(0, dot);
}

/** Wählt bei Plural-Texten die passende Form anhand der Zahl-Variable. */
export function pickForm(def: AnyTextDef, vars?: Record<string, unknown>): TextDef {
  if (def.kind === "text") return def;
  const n = Number(vars?.[def.countVar]);
  return n === 1 ? def.one : def.other;
}
