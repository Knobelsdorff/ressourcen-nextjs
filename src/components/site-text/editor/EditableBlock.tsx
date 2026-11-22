"use client";

/*
 * Langer Text (Impressum, Datenschutz) im Bearbeitungsmodus: Rahmen + Knopf.
 * Bearbeitet wird im Seitenpanel mit Vorschau – an Ort und Stelle tippen ist
 * bei Listen und Links zu fummelig.
 */

import type { ElementType, ReactNode } from "react";
import { Pencil } from "lucide-react";
import type { TextDef } from "@/lib/site-texts/define";
import type { TextVars } from "@/lib/site-texts/format";
import type { BlockClassNames } from "@/lib/site-texts/render";
import { useSiteTextEditor } from "../context";
import { labelOf, textStatus } from "./shared";
import "./site-text.css";

export default function EditableBlock({
  def,
  vars,
  className,
  classNames,
  as: Tag = "div",
  children,
}: {
  def: TextDef;
  vars?: TextVars;
  className?: string;
  classNames?: BlockClassNames;
  as?: ElementType;
  children: ReactNode;
}) {
  const editor = useSiteTextEditor()!;
  const status = textStatus(def, editor);
  const open = (el: HTMLElement) => {
    // Geerbte Schrift mitnehmen: Absätze ohne eigene Klasse sehen in der Vorschau dann gleich aus.
    const cs = window.getComputedStyle(el);
    const baseStyle = {
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      color: cs.color,
      letterSpacing: cs.letterSpacing,
    };
    editor.openBlockEditor({ def, vars, classNames, className, baseStyle });
  };

  return (
    <Tag
      data-site-text={def.key}
      className={[className, "st-block", status.hasDraft ? "st-dirty" : status.isOverridden ? "st-overridden" : ""].filter(Boolean).join(" ")}
      onClickCapture={(e: React.MouseEvent) => {
        // Links im Text sollen im Bearbeitungsmodus nicht wegnavigieren.
        e.preventDefault();
        e.stopPropagation();
        open(e.currentTarget as HTMLElement);
      }}
    >
      <button type="button" data-site-text-ui className="st-block-edit" aria-label={`Bearbeiten: ${labelOf(def)}`}>
        <Pencil size={12} /> Bearbeiten
      </button>
      {children}
    </Tag>
  );
}
