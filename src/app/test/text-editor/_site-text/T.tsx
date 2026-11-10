"use client";

/*
 * <T k="landing.hero.title">Original-Text</T>
 *
 * Die Kinder sind der Default (= heutiger Text im Code). Gibt es in der DB einen
 * überschriebenen Wert, wird der angezeigt. Im Bearbeitungsmodus (nur Admin)
 * zeigt Hover einen Stift; Klick macht den Text direkt an Ort und Stelle editierbar.
 *
 * Die umgebenden Elemente (motion.h1, Button, …) bleiben unverändert – <T>
 * ersetzt nur den Text darin. Dadurch ist die Migration ein reines Einwickeln.
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { interpolate, placeholdersOf, useSiteTextContext } from "./SiteTextProvider";

type Props = {
  /** Stabiler Schlüssel, z. B. "landing.hero.title". Nie aus dem Text ableiten. */
  k: string;
  children: string;
  /** Werte für {platzhalter} im Text, z. B. { name: "Anja" }. */
  vars?: Record<string, string | number>;
  /** Mehrzeilig erlauben (Shift+Enter = Zeilenumbruch). */
  multiline?: boolean;
};

type Rect = { top: number; left: number; right: number; bottom: number; width: number };

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width };
}

export function T({ k, children: defaultValue, vars, multiline = true }: Props) {
  const ctx = useSiteTextContext();
  const { editMode, activeKey, setActiveKey, register } = ctx;
  const instanceId = useId();
  const isEditing = editMode && activeKey === instanceId;

  const spanRef = useRef<HTMLSpanElement>(null);
  const editRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [editStartValue, setEditStartValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const value = ctx.resolve(k, defaultValue);
  const dirty = ctx.isDirty(k);
  const overridden = ctx.isOverridden(k);

  useEffect(() => {
    register({ key: k, defaultValue, kind: "inline" });
  }, [register, k, defaultValue]);

  // Position für Stift / Werkzeugleiste bei Scroll + Resize nachführen.
  const showFloating = editMode && (hovered || isEditing);
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

  // Beim Start: Fokus setzen und gesamten Text markieren.
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
  }, [isEditing, updateRect]);

  const startEditing = () => {
    setEditStartValue(value);
    setError(null);
    setActiveKey(instanceId);
  };

  const cancel = useCallback(() => {
    setError(null);
    setActiveKey(null);
  }, [setActiveKey]);

  const commit = useCallback(() => {
    const el = editRef.current;
    if (!el) return;
    const next = el.innerText.replace(/\n+$/, "").replace(/\r/g, "");
    if (next.trim() === "") {
      setError("Der Text darf nicht leer sein.");
      return;
    }
    const missing = placeholdersOf(defaultValue).filter((p) => !next.includes(p));
    if (missing.length > 0) {
      setError(`Platzhalter fehlt: ${missing.join(", ")} – wird automatisch ersetzt, bitte stehen lassen.`);
      return;
    }
    ctx.setDraftValue(k, next, defaultValue);
    setError(null);
    setActiveKey(null);
  }, [ctx, k, defaultValue, setActiveKey]);

  const resetToOriginal = () => {
    ctx.resetToDefault(k);
    setError(null);
    setActiveKey(null);
  };

  // Klick auf Rahmen außerhalb → übernehmen (wie bei Notion/Webflow).
  useEffect(() => {
    if (!isEditing) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (editRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-site-text-ui]")) return;
      commit();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isEditing, commit]);

  const onMouseEnter = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setHovered(true);
  };
  const onMouseLeave = () => {
    hideTimer.current = window.setTimeout(() => setHovered(false), 140);
  };

  // ── Normale Anzeige (Besucher, oder Admin ohne Bearbeitungsmodus) ──
  if (!editMode) {
    const shown = interpolate(value, vars);
    return <span style={shown.includes("\n") ? { whiteSpace: "pre-line" } : undefined}>{shown}</span>;
  }

  const floating =
    showFloating && rect
      ? createPortal(
          isEditing ? (
            <div
              data-site-text-ui
              className="st-toolbar"
              style={{
                top: Math.min(rect.bottom + 8, window.innerHeight - 120),
                left: Math.max(8, Math.min(rect.left, window.innerWidth - 340)),
              }}
            >
              <div className="st-toolbar-row">
                <code className="st-key">{k}</code>
                <button type="button" className="st-btn st-btn-primary" onClick={commit}>
                  <Check size={14} /> Übernehmen
                </button>
                <button type="button" className="st-btn" onClick={cancel}>
                  <X size={14} /> Abbrechen
                </button>
                {(overridden || dirty) && (
                  <button type="button" className="st-btn" onClick={resetToOriginal} title={`Original: „${defaultValue}“`}>
                    <RotateCcw size={14} /> Original
                  </button>
                )}
              </div>
              <div className="st-hint">
                Enter = übernehmen{multiline ? " · Shift+Enter = neue Zeile" : ""} · Esc = abbrechen
              </div>
              {error && <div className="st-error">{error}</div>}
            </div>
          ) : (
            <button
              type="button"
              data-site-text-ui
              className="st-pencil"
              aria-label={`Text bearbeiten: ${k}`}
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
              cancel();
            } else if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
              e.preventDefault();
              commit();
            }
          }}
          onKeyUp={(e) => {
            e.stopPropagation();
            // Chrome löst bei Leertaste-keyup den umgebenden <button> aus.
            if (e.key === " ") e.preventDefault();
          }}
          onInput={() => {
            setError(null);
            updateRect();
          }}
          onPaste={(e) => {
            // Nur reinen Text einfügen (Fallback für Browser ohne plaintext-only).
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, multiline ? text : text.replace(/\s*\n\s*/g, " "));
          }}
        >
          {editStartValue}
        </span>
        {floating}
      </>
    );
  }

  const shown = interpolate(value, vars);
  return (
    <>
      <span
        ref={spanRef}
        data-site-text={k}
        className={`st-text st-editable${dirty ? " st-dirty" : ""}${overridden && !dirty ? " st-overridden" : ""}${hovered ? " st-hover" : ""}`}
        style={shown.includes("\n") ? { whiteSpace: "pre-line" } : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        // Im Bearbeitungsmodus öffnet ein Klick auf den Text den Editor
        // (wichtig für Touch-Geräte ohne Hover) – Buttons/Links lösen nicht aus.
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEditing();
        }}
      >
        {shown}
      </span>
      {floating}
    </>
  );
}
