"use client";

/*
 * Ein Text im Bearbeitungsmodus: Rahmen, Stift beim Überfahren, Klick → direkt
 * an Ort und Stelle tippen. Übernehmen speichert einen Entwurf (Server), sichtbar
 * für Besucher erst nach "Veröffentlichen".
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Check, MousePointerClick, Pencil, RotateCcw, Undo2, X } from "lucide-react";
import type { TextDef } from "@/lib/site-texts/define";
import { validateText, type TextVars } from "@/lib/site-texts/format";
import { useSiteTextEditor } from "../context";
import { isPageTranslated, TRANSLATION_MESSAGE } from "../translation";
import { FormatButtons, insertIntoEditable, labelOf, textStatus, VarChips } from "./shared";
import "./site-text.css";

type Rect = { top: number; left: number; right: number; bottom: number };

/** Elemente, die im Bearbeitungsmodus trotzdem benutzbar sein müssen (Menü öffnen, Player starten …). */
const INTERACTIVE = 'a[href], button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], label, summary';
type Interactive = "link" | "button" | null;

function interactiveOf(el: HTMLElement | null): { el: HTMLElement; kind: Exclude<Interactive, null> } | null {
  const target = el?.closest<HTMLElement>(INTERACTIVE);
  if (!target || target.closest("[data-site-text-ui]")) return null;
  if ((target as HTMLButtonElement).disabled || target.getAttribute("aria-disabled") === "true") return null;
  return { el: target, kind: target.matches('a[href], [role="link"]') ? "link" : "button" };
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
}

export default function EditableText({
  def,
  value,
  children,
}: {
  def: TextDef;
  value: string;
  vars?: TextVars;
  children: ReactNode;
}) {
  const editor = useSiteTextEditor()!;
  const { activeId, setActiveId } = editor;
  const instanceId = useId();
  const isEditing = activeId === instanceId;

  const spanRef = useRef<HTMLSpanElement>(null);
  const editRef = useRef<HTMLSpanElement>(null);
  const savedRange = useRef<Range | null>(null);
  const hideTimer = useRef<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(120);
  const [hovered, setHovered] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [startValue, setStartValue] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [interactive, setInteractive] = useState<Interactive>(null);

  const status = textStatus(def, editor);
  const showFloating = hovered || isEditing;

  const updateRect = useCallback(() => {
    const el = (isEditing ? editRef.current : spanRef.current) ?? spanRef.current;
    if (el) setRect(rectOf(el));
  }, [isEditing]);

  useLayoutEffect(() => {
    if (!showFloating) return;
    updateRect();
    let frame = 0;
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateRect);
    };
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [showFloating, updateRect]);

  // Start: Fokus setzen, alles markieren, Auswahl merken (für Link einfügen).
  useEffect(() => {
    if (!isEditing || !editRef.current) return;
    const el = editRef.current;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    updateRect();
    const onSelectionChange = () => {
      const s = window.getSelection();
      if (s && s.rangeCount && el.contains(s.anchorNode)) savedRange.current = s.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [isEditing, updateRect]);

  const startEditing = () => {
    // Übersetzte Seite: nicht bearbeiten (die Leiste zeigt den Hinweis).
    if (editor.translated || isPageTranslated()) return;
    // Stift ausblenden: Der Text wird gleich ausgetauscht, "mouseleave" käme nie an.
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setHovered(false);
    setInteractive(interactiveOf(spanRef.current)?.kind ?? null);
    setStartValue(value);
    setErrors([]);
    setWarnings([]);
    setActiveId(instanceId);
  };

  const close = useCallback(() => {
    setErrors([]);
    setWarnings([]);
    // Nach dem Bearbeiten keinen hängenden Stift/Rahmen – erst bei Mausbewegung wieder.
    setHovered(false);
    setActiveId(null);
  }, [setActiveId]);

  /** Übernimmt den Text als Entwurf. Rückgabe: true = fertig, false = bleibt offen (Fehler/Hinweis). */
  const commit = useCallback(
    (force = false): boolean => {
      const el = editRef.current;
      if (!el) return true;
      // Nie einen vom Browser übersetzten Text speichern.
      if (isPageTranslated(el) || isPageTranslated()) {
        setErrors([TRANSLATION_MESSAGE]);
        return false;
      }
      const result = validateText(def, el.innerText);
      if (result.errors.length) {
        setErrors(result.errors);
        return false;
      }
      // Hinweise (z. B. fehlende Variable) einmal zeigen, zweites Übernehmen bestätigt.
      if (!force && result.warnings.length && result.warnings.join() !== warnings.join()) {
        setWarnings(result.warnings);
        return false;
      }
      if (result.value !== value) editor.setDraft(def, result.value);
      close();
      return true;
    },
    [def, editor, value, warnings, close]
  );

  // Offene Eingabe beim Provider anmelden: Vorschau/Fertig/Links übernehmen sie
  // zuerst, statt sie zu verwerfen. Hinweise (fehlende Variable) stoppen den Wechsel.
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const { registerActiveEdit } = editor;
  useEffect(() => {
    if (!isEditing) return;
    const fn = () => commitRef.current(false);
    registerActiveEdit(fn);
    return () => registerActiveEdit(null);
  }, [isEditing, registerActiveEdit]);

  // Tab schließen/neu laden mit nicht übernommener Eingabe → Browser fragt nach.
  useEffect(() => {
    if (!isEditing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const el = editRef.current;
      if (el && el.innerText.replace(/\n+$/, "") !== startValue) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isEditing, startValue]);

  // Klick außerhalb → übernehmen (wie bei Notion/Webflow).
  useEffect(() => {
    if (!isEditing) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (editRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-site-text-ui]")) return;
      commit(true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isEditing, commit]);

  const restoreSelection = () => {
    const el = editRef.current;
    if (!el) return;
    el.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
  };

  const selectedText = () => {
    const sel = window.getSelection();
    return sel && editRef.current?.contains(sel.anchorNode) ? sel.toString() : "";
  };

  const onMouseEnter = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (!hovered) setInteractive(interactiveOf(spanRef.current)?.kind ?? null);
    setHovered(true);
  };

  /** Den Button/Link um den Text normal auslösen (Klick direkt auf das Element, nicht auf den Text). */
  const triggerElement = () => {
    const el = editRef.current ?? spanRef.current;
    const target = interactiveOf(el)?.el;
    // Offene Eingabe erst übernehmen (geht sonst verloren); bei Fehler bleibt der Editor offen.
    if (isEditing && !commit(true)) return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setHovered(false);
    if (!target) return;
    // Nach dem Schließen des Editors klicken, damit der Text wieder normal dasteht.
    window.setTimeout(() => {
      const fresh = interactiveOf(spanRef.current)?.el ?? target;
      if (fresh.isConnected) fresh.click();
    }, 0);
  };
  const actionLabel = interactive === "link" ? "Link öffnen" : "Klicken";
  const actionTitle =
    interactive === "link"
      ? "Den Link normal öffnen (im Bearbeitungsmodus öffnet ein Klick auf den Text sonst den Editor)"
      : "Den Button normal benutzen, z. B. Menü oder Player öffnen (ein Klick auf den Text öffnet sonst den Editor)";
  const onMouseLeave = () => {
    hideTimer.current = window.setTimeout(() => setHovered(false), 140);
  };

  // Höhe der Werkzeugleiste messen, damit sie den Text nie verdeckt.
  useLayoutEffect(() => {
    if (!isEditing || !toolbarRef.current) return;
    const h = toolbarRef.current.offsetHeight;
    if (Math.abs(h - toolbarHeight) > 2) setToolbarHeight(h);
  });

  /** Unter dem Text, wenn Platz ist – sonst darüber; nie unter die Admin-Leiste. */
  const toolbarTop = (r: Rect) => {
    const below = r.bottom + 8;
    if (below + toolbarHeight <= window.innerHeight - 8) return below;
    const above = r.top - toolbarHeight - 8;
    const minTop = 64; // Admin-Leiste (56px) + Abstand
    if (above >= minTop) return above;
    return Math.max(minTop, window.innerHeight - toolbarHeight - 8);
  };

  const floating =
    showFloating && rect
      ? createPortal(
          isEditing ? (
            <div
              ref={toolbarRef}
              data-site-text-ui
              className="st-toolbar"
              style={{
                top: toolbarTop(rect),
                left: Math.max(8, Math.min(rect.left, window.innerWidth - 568)),
              }}
            >
              <div className="st-toolbar-row">
                <span className="st-key" title={def.key}>{labelOf(def)}</span>
                <button type="button" className="st-btn st-btn-primary" onClick={() => commit(warnings.length > 0)}>
                  <Check size={14} /> {warnings.length ? "Trotzdem übernehmen" : "Übernehmen"}
                </button>
                <button type="button" className="st-btn" onClick={close}>
                  <X size={14} /> Abbrechen
                </button>
                {interactive && (
                  <button type="button" className="st-btn" title={actionTitle} onClick={triggerElement}>
                    {interactive === "link" ? <ArrowUpRight size={14} /> : <MousePointerClick size={14} />} {actionLabel}
                  </button>
                )}
                {status.hasDraft && (
                  <button
                    type="button"
                    className="st-btn"
                    title="Entwurf löschen – es gilt wieder der veröffentlichte Text"
                    onClick={() => {
                      editor.discardDrafts([def.key]);
                      close();
                    }}
                  >
                    <Undo2 size={14} /> Entwurf verwerfen
                  </button>
                )}
                {(status.isOverridden || (status.hasDraft && !status.draftResets)) && (
                  <button
                    type="button"
                    className="st-btn"
                    title={`Original aus dem Code: „${def.text}“`}
                    onClick={() => {
                      editor.setDraft(def, null);
                      close();
                    }}
                  >
                    <RotateCcw size={14} /> Original
                  </button>
                )}
              </div>
              <VarChips
                def={def}
                onInsert={(token) => {
                  restoreSelection();
                  insertIntoEditable(token);
                }}
              />
              <FormatButtons
                format={def.format}
                onBold={() => {
                  restoreSelection();
                  insertIntoEditable(`**${selectedText() || "fett"}**`);
                }}
                onLink={(url) => {
                  restoreSelection();
                  insertIntoEditable(`[${selectedText() || "Linktext"}](${url})`);
                }}
              />
              <div className="st-hint">
                Enter = übernehmen{def.multiline ? " · Shift+Enter = neue Zeile" : ""} · Esc = abbrechen
                {status.hasDraft ? " · Entwurf – noch nicht veröffentlicht" : ""}
              </div>
              {status.codeChanged && (
                <div className="st-warning">
                  Der Original-Text im Code wurde seit dieser Änderung angepasst: „{def.text}“
                </div>
              )}
              {errors.map((msg) => (
                <div key={msg} className="st-error">{msg}</div>
              ))}
              {warnings.map((msg) => (
                <div key={msg} className="st-warning">{msg}</div>
              ))}
            </div>
          ) : (
            <>
              {interactive && (
                <button
                  type="button"
                  data-site-text-ui
                  className="st-use"
                  title={actionTitle}
                  // Über dem Text (verdeckt ihn nicht); oben am Rand darunter.
                  style={{
                    top: rect.top - 32 >= 64 ? rect.top - 32 : rect.bottom + 6,
                    left: Math.max(8, Math.min(rect.right - 12, window.innerWidth - 36) - 4),
                  }}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerElement();
                  }}
                >
                  {interactive === "link" ? <ArrowUpRight size={12} /> : <MousePointerClick size={12} />} {actionLabel}
                </button>
              )}
              <button
                type="button"
                data-site-text-ui
                className="st-pencil"
                aria-label={`Text bearbeiten: ${labelOf(def)}`}
                style={{ top: rect.top - 14, left: Math.min(rect.right - 12, window.innerWidth - 36) }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startEditing();
                }}
              >
                <Pencil size={13} />
              </button>
            </>
          ),
          document.body
        )
      : null;

  if (isEditing) {
    return (
      <>
        <span
          key="editing"
          ref={editRef}
          className="st-text st-editing"
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          spellCheck
          style={{ whiteSpace: "pre-wrap" }}
          // Klicks im Text dürfen keinen Button/Link darunter auslösen.
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            } else if (e.key === "Enter" && (!def.multiline || !e.shiftKey)) {
              e.preventDefault();
              commit(warnings.length > 0);
            }
          }}
          onKeyUp={(e) => {
            e.stopPropagation();
            // Chrome löst bei Leertaste-keyup den umgebenden <button> aus.
            if (e.key === " ") e.preventDefault();
          }}
          onInput={() => {
            setErrors([]);
            updateRect();
          }}
          onPaste={(e) => {
            // Nur reinen Text einfügen (Fallback für Browser ohne plaintext-only).
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            insertIntoEditable(def.multiline ? text : text.replace(/\s*\n\s*/g, " "));
          }}
        >
          {startValue}
        </span>
        {floating}
      </>
    );
  }

  const cls = [
    "st-text st-editable",
    status.hasDraft ? "st-dirty" : status.isOverridden ? "st-overridden" : "",
    hovered ? "st-hover" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <span
        ref={spanRef}
        data-site-text={def.key}
        className={cls}
        onMouseEnter={onMouseEnter}
        onMouseMove={hovered ? undefined : onMouseEnter}
        onMouseLeave={onMouseLeave}
        // Klick auf den Text öffnet den Editor (wichtig auf Touch-Geräten) –
        // Buttons und Links darunter lösen dabei nicht aus.
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEditing();
        }}
      >
        {children}
      </span>
      {floating}
    </>
  );
}
