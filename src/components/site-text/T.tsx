"use client";

/*
 * Bausteine für die Seiten:
 *
 *   <T t={landing["hero.title"]} />                    Text im JSX
 *   <T t={dashboard["trial.days"]} vars={{ count }} />  mit Variablen / Plural
 *   <TextBlock t={legal["impressum.contact"]} as="section" classNames={…} />  langer Text
 *   const placeholder = useText(createStory["name.placeholder"]);         als String
 *   const tx = useTextFn();  toast.error(tx(dashboard["error.load"]));      in Callbacks
 *
 * Für Besucher rendert <T> nur den Text (kein Wrapper-Element). Der
 * Bearbeitungs-Code wird erst im Bearbeitungsmodus nachgeladen.
 */

import { lazy, Suspense, useCallback, useContext, useEffect, useRef, type ElementType } from "react";
import { pickForm, type AnyTextDef, type TextDef } from "@/lib/site-texts/define";
import { interpolate, stripInline, type TextVars } from "@/lib/site-texts/format";
import { renderBlocks, renderText, type BlockClassNames } from "@/lib/site-texts/render";
import { PublishedTextsContext, TextRegistryContext, useSiteTextEditor, type SiteTextEditor } from "./context";

const EditableText = lazy(() => import("./editor/EditableText"));
const EditableBlock = lazy(() => import("./editor/EditableBlock"));

function resolveValue(def: TextDef, published: Record<string, string>, editor: SiteTextEditor | null): string {
  if (editor?.showDrafts) {
    const draft = editor.drafts[def.key];
    if (draft) return draft.value ?? def.text;
  }
  return published[def.key] ?? def.text;
}

/** Aktueller Rohtext (mit {variablen}) eines Einzeltexts. */
export function useResolvedText(def: TextDef): string {
  const published = useContext(PublishedTextsContext);
  const editor = useSiteTextEditor();
  return resolveValue(def, published, editor);
}

/** Meldet den Text für das Panel "Texte dieser Seite" an (nur bei Admins aktiv). */
function useRegisterText(key: string) {
  const registry = useContext(TextRegistryContext);
  useEffect(() => (registry ? registry.add(key) : undefined), [registry, key]);
}

export function T({ t, vars, classNames }: { t: AnyTextDef; vars?: TextVars; classNames?: BlockClassNames }) {
  const def = pickForm(t, vars);
  const value = useResolvedText(def);
  const editor = useSiteTextEditor();
  useRegisterText(def.key);

  const content = renderText(value, def.format, vars, classNames);
  if (editor?.editMode) {
    return (
      <Suspense fallback={content}>
        <EditableText def={def} value={value} vars={vars}>
          {content}
        </EditableText>
      </Suspense>
    );
  }
  return <>{content}</>;
}

/** Langer, formatierter Text (Überschriften, Listen, Links) – z. B. Impressum. */
export function TextBlock({
  t,
  vars,
  classNames,
  className,
  as: Tag = "div",
}: {
  t: TextDef;
  vars?: TextVars;
  classNames?: BlockClassNames;
  className?: string;
  as?: ElementType;
}) {
  const value = useResolvedText(t);
  const editor = useSiteTextEditor();
  useRegisterText(t.key);

  const content = renderBlocks(value, vars, classNames);
  if (editor?.editMode) {
    const fallback = <Tag className={className}>{content}</Tag>;
    return (
      <Suspense fallback={fallback}>
        <EditableBlock def={t} vars={vars} className={className} classNames={classNames} as={Tag}>
          {content}
        </EditableBlock>
      </Suspense>
    );
  }
  return <Tag className={className}>{content}</Tag>;
}

function toPlainString(def: TextDef, value: string, vars?: TextVars) {
  const text = interpolate(value, vars);
  return def.format === "plain" ? text : stripInline(text);
}

/** Text als String – für placeholder, aria-label, alt, title … */
export function useText(t: AnyTextDef, vars?: TextVars): string {
  const def = pickForm(t, vars);
  const value = useResolvedText(def);
  useRegisterText(def.key);
  return toPlainString(def, value, vars);
}

/**
 * Funktion für Texte in Callbacks (Toasts, Fehlermeldungen, berechnete Labels).
 *
 * Die Funktion bleibt immer dieselbe (stabile Identität) und liest den jeweils
 * aktuellen Stand. So kann sie gefahrlos in Abhängigkeitslisten von Effekten
 * stehen, ohne dass z. B. ein Entwurf eines Admins Effekte neu auslöst. Die
 * Komponente rendert trotzdem neu, wenn sich Texte ändern (useContext).
 */
export function useTextFn() {
  const published = useContext(PublishedTextsContext);
  const editor = useSiteTextEditor();
  const latest = useRef({ published, showDrafts: editor?.showDrafts ?? false, drafts: editor?.drafts });
  latest.current = { published, showDrafts: editor?.showDrafts ?? false, drafts: editor?.drafts };
  return useCallback((t: AnyTextDef, vars?: TextVars): string => {
    const { published: pub, showDrafts, drafts } = latest.current;
    const def = pickForm(t, vars);
    const draft = showDrafts ? drafts?.[def.key] : undefined;
    const value = draft ? draft.value ?? def.text : pub[def.key] ?? def.text;
    return toPlainString(def, value, vars);
  }, []);
}

export type TextFn = ReturnType<typeof useTextFn>;
