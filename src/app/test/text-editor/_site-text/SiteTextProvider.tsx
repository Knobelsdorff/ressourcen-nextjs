"use client";

/*
 * PROTOTYP – Inline-Texteditor (Demo unter /test/text-editor).
 *
 * Im echten Feature kommt `saved` aus Supabase (Tabelle site_texts, serverseitig
 * geladen und per Cache-Tag invalidiert). In dieser Demo spielt localStorage
 * die Datenbank, damit nichts an der echten DB geändert wird.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** null im Entwurf = "zurück auf den Original-Text aus dem Code". */
type Draft = Record<string, string | null>;

export type HistoryEntry = {
  key: string;
  oldValue: string | null;
  newValue: string | null;
  at: string;
};

type RegisteredText = { key: string; defaultValue: string; label?: string; kind: "inline" | "hidden" };

type SiteTextContextValue = {
  isAdmin: boolean;
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  /** Aktueller Anzeigewert: Entwurf → gespeichert → Default aus dem Code. */
  resolve: (key: string, defaultValue: string) => string;
  isOverridden: (key: string) => boolean;
  isDirty: (key: string) => boolean;
  setDraftValue: (key: string, value: string, defaultValue: string) => void;
  resetToDefault: (key: string) => void;
  undoDraft: (key: string) => void;
  draft: Draft;
  saved: Record<string, string>;
  history: HistoryEntry[];
  save: () => Promise<void>;
  discard: () => void;
  saving: boolean;
  lastSavedAt: number | null;
  registry: Map<string, RegisteredText>;
  register: (entry: RegisteredText) => void;
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
  resetDemo: () => void;
};

const SiteTextContext = createContext<SiteTextContextValue | null>(null);

const DB_KEY = "site-text-demo-db";
const HISTORY_KEY = "site-text-demo-history";
const DRAFT_KEY = "site-text-demo-draft";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* privater Modus o. ä. – Demo läuft trotzdem */
  }
}

export function SiteTextProvider({ children, isAdmin }: { children: ReactNode; isAdmin: boolean }) {
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editMode, setEditModeState] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [registryVersion, setRegistryVersion] = useState(0);
  const registryRef = useRef(new Map<string, RegisteredText>());
  const defaultsRef = useRef(new Map<string, string>());

  // "Datenbank" + nicht gespeicherter Entwurf laden (Entwurf überlebt Seitenwechsel).
  useEffect(() => {
    setSaved(readJson(DB_KEY, {}));
    setHistory(readJson(HISTORY_KEY, []));
    const storedDraft = readJson<Draft>(DRAFT_KEY, {});
    setDraft(storedDraft);
    if (Object.keys(storedDraft).length > 0) setEditModeState(true);
  }, []);

  useEffect(() => {
    writeJson(DRAFT_KEY, draft);
  }, [draft]);

  const dirtyCount = Object.keys(draft).length;

  // Warnung beim Verlassen mit ungespeicherten Änderungen.
  useEffect(() => {
    if (dirtyCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyCount]);

  const register = useCallback((entry: RegisteredText) => {
    defaultsRef.current.set(entry.key, entry.defaultValue);
    const existing = registryRef.current.get(entry.key);
    if (!existing || existing.defaultValue !== entry.defaultValue || existing.label !== entry.label) {
      registryRef.current.set(entry.key, entry);
      setRegistryVersion((v) => v + 1);
    }
  }, []);

  const resolve = useCallback(
    (key: string, defaultValue: string) => {
      if (key in draft) return draft[key] ?? defaultValue;
      return saved[key] ?? defaultValue;
    },
    [draft, saved]
  );

  const setDraftValue = useCallback(
    (key: string, value: string, defaultValue: string) => {
      setDraft((prev) => {
        const next = { ...prev };
        const savedValue = saved[key];
        // Wieder auf dem gespeicherten Stand → kein Entwurf mehr nötig.
        if ((savedValue ?? defaultValue) === value) {
          delete next[key];
        } else if (value === defaultValue && savedValue !== undefined) {
          next[key] = null; // Override entfernen statt Default zu duplizieren
        } else {
          next[key] = value;
        }
        return next;
      });
    },
    [saved]
  );

  const resetToDefault = useCallback(
    (key: string) => {
      setDraft((prev) => {
        const next = { ...prev };
        if (saved[key] !== undefined) next[key] = null;
        else delete next[key];
        return next;
      });
    },
    [saved]
  );

  const undoDraft = useCallback((key: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (Object.keys(draft).length === 0) return;
    setSaving(true);
    // Echte Version: POST /api/admin/site-texts { changes: draft } → upsert + revalidateTag.
    await new Promise((r) => setTimeout(r, 450));
    const nextSaved = { ...saved };
    const at = new Date().toISOString();
    const entries: HistoryEntry[] = [];
    for (const [key, value] of Object.entries(draft)) {
      entries.push({ key, oldValue: saved[key] ?? null, newValue: value, at });
      if (value === null) delete nextSaved[key];
      else nextSaved[key] = value;
    }
    const nextHistory = [...entries, ...history].slice(0, 100);
    setSaved(nextSaved);
    setHistory(nextHistory);
    setDraft({});
    writeJson(DB_KEY, nextSaved);
    writeJson(HISTORY_KEY, nextHistory);
    setSaving(false);
    setLastSavedAt(Date.now());
  }, [draft, saved, history]);

  const discard = useCallback(() => {
    setDraft({});
    setActiveKey(null);
  }, []);

  const setEditMode = useCallback((on: boolean) => {
    setEditModeState(on);
    if (!on) setActiveKey(null);
  }, []);

  const resetDemo = useCallback(() => {
    setSaved({});
    setDraft({});
    setHistory([]);
    writeJson(DB_KEY, {});
    writeJson(HISTORY_KEY, []);
    writeJson(DRAFT_KEY, {});
  }, []);

  const value = useMemo<SiteTextContextValue>(
    () => ({
      isAdmin,
      editMode: isAdmin && editMode,
      setEditMode,
      resolve,
      isOverridden: (key) => (key in draft ? draft[key] !== null : saved[key] !== undefined),
      isDirty: (key) => key in draft,
      setDraftValue,
      resetToDefault,
      undoDraft,
      draft,
      saved,
      history,
      save,
      discard,
      saving,
      lastSavedAt,
      registry: registryRef.current,
      register,
      activeKey,
      setActiveKey,
      resetDemo,
    }),
    // registryVersion: Panel neu rendern, wenn sich Texte registrieren
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, editMode, setEditMode, resolve, draft, saved, history, save, discard, saving, lastSavedAt, register, activeKey, resetDemo, registryVersion, setDraftValue, resetToDefault, undoDraft]
  );

  return <SiteTextContext.Provider value={value}>{children}</SiteTextContext.Provider>;
}

export function useSiteTextContext() {
  const ctx = useContext(SiteTextContext);
  if (!ctx) throw new Error("useSiteTextContext must be used inside <SiteTextProvider>");
  return ctx;
}

/** Ersetzt {name}-Platzhalter. Fehlende Werte bleiben sichtbar stehen. */
export function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function placeholdersOf(text: string) {
  return Array.from(new Set(text.match(/\{\w+\}/g) ?? []));
}

/**
 * Für Texte ohne sichtbaren Platz im Layout (Platzhalter, Fehlermeldungen,
 * Toasts, aria-labels). Sie erscheinen im Panel "Weitere Texte dieser Seite".
 */
export function useSiteText(key: string, defaultValue: string, opts?: { label?: string; vars?: Record<string, string | number> }) {
  const ctx = useSiteTextContext();
  const { register } = ctx;
  useEffect(() => {
    register({ key, defaultValue, label: opts?.label, kind: "hidden" });
  }, [register, key, defaultValue, opts?.label]);
  return interpolate(ctx.resolve(key, defaultValue), opts?.vars);
}
