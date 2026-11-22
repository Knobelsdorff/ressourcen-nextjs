"use client";

import { createContext, useContext, type CSSProperties } from "react";
import type { TextDef } from "@/lib/site-texts/define";
import type { DraftRow, EditorStateResponse, PublishResponse, RevisionRow } from "@/lib/site-texts/api-types";
import type { TextVars } from "@/lib/site-texts/format";
import type { BlockClassNames } from "@/lib/site-texts/render";

/** Veröffentlichte Abweichungen (Schlüssel → Text). Für Besucher ändert sich das nie. */
export const PublishedTextsContext = createContext<Record<string, string>>({});

// ── Backend (echte API oder Demo mit localStorage) ──────────────────────────

export class SiteTextApiError extends Error {
  code?: string;
  details?: { key: string; errors: string[] }[];
  constructor(message: string, code?: string, details?: { key: string; errors: string[] }[]) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export interface SiteTextBackend {
  checkAdmin(): Promise<boolean>;
  load(): Promise<EditorStateResponse>;
  saveDrafts(set: { key: string; value: string | null }[], discard: string[]): Promise<EditorStateResponse>;
  publish(keys: string[]): Promise<PublishResponse>;
  history(key?: string, limit?: number): Promise<RevisionRow[]>;
}

// ── Editor-Zustand (nur für Admins; für alle anderen null) ─────────────────

export type LoadState = "idle" | "loading" | "ready" | "error" | "missing-table";

export interface BlockEditorTarget {
  def: TextDef;
  vars?: TextVars;
  /** Klassen der Seite – damit die Vorschau im Editor aussieht wie auf der Seite. */
  classNames?: BlockClassNames;
  className?: string;
  /** Geerbte Schrift des Blocks auf der Seite (Größe, Zeilenhöhe, Farbe …). */
  baseStyle?: CSSProperties;
}

export interface SiteTextEditor {
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  /** Vorschau: Entwürfe sichtbar wie für Besucher, ohne Bearbeitungsrahmen. */
  preview: boolean;
  setPreview: (on: boolean) => void;
  /** Entwürfe anzeigen (Bearbeitungsmodus oder Vorschau). */
  showDrafts: boolean;
  /** Seite ist vom Browser übersetzt – Bearbeiten ist dann gesperrt. */
  translated: boolean;
  /** E-Mail des angemeldeten Admins (für "meine Entwürfe"); null in der Demo. */
  currentUserEmail: string | null;

  /** Entwürfe inkl. noch nicht gespeicherter Änderungen. */
  drafts: Record<string, DraftRow>;
  /** Veröffentlichter Stand mit Zeitstempel und Prüfsumme. */
  publishedMeta: Record<string, { value: string; updatedAt: string; baseHash: string | null }>;
  loadState: LoadState;
  loadError: string | null;

  /** Anzahl Änderungen, die noch zum Server unterwegs sind oder fehlgeschlagen. */
  pendingCount: number;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;

  setDraft: (def: TextDef, value: string | null) => void;
  discardDrafts: (keys: string[]) => void;
  retrySave: () => void;
  /** Alles Offene sofort speichern (z. B. vor dem Verlassen der Seite). */
  saveNow: () => Promise<void>;
  publish: (keys: string[]) => Promise<{ ok: boolean; error?: string; details?: { key: string; errors: string[] }[] }>;
  reload: () => Promise<void>;
  history: (key?: string, limit?: number) => Promise<RevisionRow[]>;

  /** Welcher Text gerade an Ort und Stelle bearbeitet wird (Instanz-ID). */
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  /**
   * Der gerade offene Text meldet hier seine "Übernehmen"-Funktion an, damit
   * Moduswechsel und Links ihn vorher übernehmen statt die Eingabe zu verwerfen.
   */
  registerActiveEdit: (commit: (() => boolean) | null) => void;
  /** Offenen Text übernehmen. false = ungültig, bleibt offen (Wechsel abbrechen). */
  commitActiveEdit: () => boolean;

  blockEditor: BlockEditorTarget | null;
  openBlockEditor: (target: BlockEditorTarget | null) => void;
}

export const SiteTextEditorContext = createContext<SiteTextEditor | null>(null);

export function useSiteTextEditor() {
  return useContext(SiteTextEditorContext);
}

// ── Welche Texte stehen auf der aktuellen Seite? (für "Texte dieser Seite") ─

export interface TextRegistry {
  /** Meldet einen sichtbaren Schlüssel an; Rückgabe meldet ihn wieder ab. */
  add: (key: string) => () => void;
  subscribe: (listener: () => void) => () => void;
  /** Ändert sich bei jeder An-/Abmeldung (für useSyncExternalStore). */
  version: () => number;
  keys: () => string[];
}

export function createTextRegistry(): TextRegistry {
  const counts = new Map<string, number>();
  const listeners = new Set<() => void>();
  let version = 0;
  let scheduled = false;
  const notify = () => {
    // Viele Texte melden sich beim Seitenwechsel gleichzeitig an → gebündelt melden.
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      version++;
      listeners.forEach((l) => l());
    });
  };
  return {
    add(key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      notify();
      return () => {
        const n = (counts.get(key) ?? 1) - 1;
        if (n <= 0) counts.delete(key);
        else counts.set(key, n);
        notify();
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
    keys: () => Array.from(counts.keys()),
  };
}

export const TextRegistryContext = createContext<TextRegistry | null>(null);
