"use client";

/*
 * Stellt allen <T>-Texten die veröffentlichten Abweichungen bereit (vom Server
 * im Root-Layout geladen, gecacht) und – nur für Admins – den Editor-Zustand.
 *
 * Besucher: ein Context mit einem festen Objekt, keine Requests, kein
 * Editor-Code (der liegt in ./editor und wird erst für Admins geladen).
 *
 * Admins: Entwürfe werden beim Übernehmen automatisch auf dem Server
 * gespeichert (Warteschlange, bei Fehler bleibt die Änderung erhalten und kann
 * erneut gesendet werden). Sichtbar für Besucher wird erst "Veröffentlichen".
 */

import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import type { TextDef } from "@/lib/site-texts/define";
import type { DraftRow, EditorStateResponse } from "@/lib/site-texts/api-types";
import { apiBackend } from "./apiBackend";
import { isPageTranslated, setTranslationBlocked } from "./translation";
import {
  createTextRegistry,
  PublishedTextsContext,
  SiteTextApiError,
  SiteTextEditorContext,
  TextRegistryContext,
  type BlockEditorTarget,
  type LoadState,
  type SiteTextBackend,
  type SiteTextEditor,
} from "./context";

const EditorChrome = lazy(() => import("./editor/EditorChrome"));

/**
 * Verschachtelte Provider (Demo unter /test/text-editor im Root-Layout): Der
 * innere meldet sich beim äußeren, der äußere blendet dann seinen Editor aus –
 * sonst gäbe es zwei Leisten.
 */
const NestedProviderContext = createContext<((nested: boolean) => void) | null>(null);

type PendingOp = { kind: "set"; value: string | null } | { kind: "discard" };
type Mode = "off" | "edit" | "preview";

const MODE_STORAGE_KEY = "st:mode";
/** Letzter Entwurfsstand dieses Tabs: beim Neuladen sofort sichtbar, bis der Server antwortet. */
const STATE_STORAGE_KEY = "st:state";

type CachedState = { userId: string; drafts: DraftRow[]; published: EditorStateResponse["published"] };

function readCachedState(userId: string): CachedState | null {
  try {
    const raw = window.sessionStorage.getItem(STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedState;
    if (parsed && parsed.userId === userId && Array.isArray(parsed.drafts) && Array.isArray(parsed.published)) return parsed;
    window.sessionStorage.removeItem(STATE_STORAGE_KEY); // anderer Nutzer/alt
    return null;
  } catch {
    return null;
  }
}

function adminHintList(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

interface Props {
  /** Veröffentlichte Abweichungen vom Server (Root-Layout). */
  published: Record<string, string>;
  children: ReactNode;
  /** Nur für die Demo unter /test/text-editor. */
  backend?: SiteTextBackend;
  /** Demo: ohne Anmeldung als Admin behandeln. */
  forceAdmin?: boolean;
}

export function SiteTextProvider({ published, children, backend = apiBackend, forceAdmin = false }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdminChecked, setIsAdmin] = useState(false);

  const registerWithOuter = useContext(NestedProviderContext);
  const [hasNestedProvider, setHasNestedProvider] = useState(false);
  useEffect(() => {
    if (!registerWithOuter) return;
    registerWithOuter(true);
    return () => registerWithOuter(false);
  }, [registerWithOuter]);
  const isAdmin = isAdminChecked && !hasNestedProvider;

  // ── Admin? (Server entscheidet; die öffentliche Liste spart Nicht-Admins den Request) ──
  const userId = user?.id;
  const userEmail = user?.email?.toLowerCase();
  useEffect(() => {
    if (forceAdmin) {
      setIsAdmin(true);
      return;
    }
    if (!userId || !userEmail) {
      setIsAdmin(false);
      return;
    }
    const hint = adminHintList();
    if (hint.length && !hint.includes(userEmail)) {
      setIsAdmin(false);
      return;
    }
    const cacheKey = `st:admin:${userId}`;
    try {
      if (window.sessionStorage.getItem(cacheKey) === "1") {
        setIsAdmin(true);
        return;
      }
    } catch {
      /* privater Modus */
    }
    let cancelled = false;
    backend.checkAdmin().then((ok) => {
      if (cancelled) return;
      setIsAdmin(ok);
      if (ok) {
        try {
          window.sessionStorage.setItem(cacheKey, "1");
        } catch {
          /* egal */
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, userEmail, forceAdmin, backend]);

  // ── Editor-Zustand ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("off");
  const [serverDrafts, setServerDrafts] = useState<Record<string, DraftRow>>({});
  const [publishedMeta, setPublishedMeta] = useState<SiteTextEditor["publishedMeta"]>({});
  const [adminPublished, setAdminPublished] = useState<Record<string, string> | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, PendingOp>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [blockEditor, setBlockEditor] = useState<BlockEditorTarget | null>(null);
  const [translated, setTranslated] = useState(false);

  const activeEditRef = useRef<(() => boolean) | null>(null);
  const registerActiveEdit = useCallback((commit: (() => boolean) | null) => {
    activeEditRef.current = commit;
  }, []);
  /** Offenen Text übernehmen, bevor Modus oder Seite wechseln. */
  const commitActiveEdit = useCallback(() => (activeEditRef.current ? activeEditRef.current() : true), []);

  // Ref ist die maßgebliche Quelle (sofort aktuell, z. B. für "übernehmen + gleich speichern"),
  // der State löst nur das Neuzeichnen aus.
  const pendingRef = useRef(pending);
  const updatePending = useCallback((fn: (prev: Record<string, PendingOp>) => Record<string, PendingOp>) => {
    const next = fn(pendingRef.current);
    pendingRef.current = next;
    setPending(next);
  }, []);
  const flushPromise = useRef<Promise<void> | null>(null);

  // Für den Tab-Cache (nur echte Anmeldung, nicht die Demo).
  const cacheUserRef = useRef<string | null>(null);
  cacheUserRef.current = forceAdmin ? null : userId ?? null;

  const applyDraftsAndMeta = useCallback((state: Pick<EditorStateResponse, "drafts" | "published">) => {
    const drafts: Record<string, DraftRow> = {};
    for (const d of state.drafts) drafts[d.key] = d;
    const meta: SiteTextEditor["publishedMeta"] = {};
    for (const p of state.published) meta[p.key] = { value: p.value, updatedAt: p.updatedAt, baseHash: p.baseHash };
    setServerDrafts(drafts);
    setPublishedMeta(meta);
  }, []);

  const applyState = useCallback(
    (state: EditorStateResponse) => {
      applyDraftsAndMeta(state);
      const values: Record<string, string> = {};
      for (const p of state.published) values[p.key] = p.value;
      setAdminPublished(values);
      const cacheUser = cacheUserRef.current;
      if (cacheUser) {
        try {
          const cached: CachedState = { userId: cacheUser, drafts: state.drafts, published: state.published };
          window.sessionStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(cached));
        } catch {
          /* voll/privat – dann eben ohne Cache */
        }
      }
    },
    [applyDraftsAndMeta]
  );

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoadState("loading");
      try {
        applyState(await backend.load());
        setLoadState("ready");
        setLoadError(null);
      } catch (e) {
        const err = e as SiteTextApiError;
        if (err.code === "missing-table") setLoadState("missing-table");
        else if (!quiet) setLoadState("error");
        setLoadError(err.message);
      }
    },
    [backend, applyState]
  );

  useEffect(() => {
    // Hinweis: Den Cache hier NICHT löschen – beim ersten Rendern ist isAdmin
    // immer false (Prüfung läuft noch). Fremde Caches verwirft readCachedState.
    if (!isAdmin) {
      setMode("off");
      return;
    }
    // Entwürfe aus dem letzten Stand dieses Tabs sofort zeigen (kein Springen von
    // veröffentlicht → Entwurf); die veröffentlichten Texte kommen frisch vom Server.
    const cached = cacheUserRef.current ? readCachedState(cacheUserRef.current) : null;
    if (cached) applyDraftsAndMeta(cached);
    void load();
    try {
      const stored = window.sessionStorage.getItem(MODE_STORAGE_KEY);
      // Übersetzte Seite: nicht automatisch in den Bearbeitungsmodus (Text würde doppelt/übersetzt).
      if ((stored === "edit" || stored === "preview") && !isPageTranslated()) setMode(stored);
    } catch {
      /* egal */
    }
  }, [isAdmin, load, applyDraftsAndMeta]);

  // ── Browser-Übersetzung erkennen (nur für Admins) ──────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setTranslated(isPageTranslated()));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "lang"], childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [isAdmin]);

  // Während Bearbeiten/Vorschau darf der Browser die Seite nicht übersetzen.
  // (Nur der aktive Provider – ein ausgeblendeter äußerer darf das nicht zurücksetzen.)
  useEffect(() => {
    if (!isAdmin || mode === "off") return;
    setTranslationBlocked(true);
    return () => setTranslationBlocked(false);
  }, [isAdmin, mode]);

  const changeMode = useCallback((next: Mode) => {
    // Auf einer übersetzten Seite würde jeder Wechsel Texte verdoppeln.
    if (next !== "off" && isPageTranslated()) {
      setTranslated(true);
      return;
    }
    // Offene Eingabe zuerst übernehmen – sonst ginge sie verloren.
    if (!commitActiveEdit()) return;
    setMode(next);
    if (next !== "edit") {
      setActiveId(null);
      setBlockEditor(null);
    }
    try {
      window.sessionStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      /* egal */
    }
  }, [commitActiveEdit]);

  // ── Speichern (Warteschlange) ────────────────────────────────────────────
  const flush = useCallback((): Promise<void> => {
    if (flushPromise.current) {
      // Läuft schon: danach erneut prüfen, ob neue Änderungen dazukamen.
      return flushPromise.current.then(() => (Object.keys(pendingRef.current).length ? flush() : undefined));
    }
    const ops = pendingRef.current;
    const keys = Object.keys(ops);
    if (keys.length === 0) return Promise.resolve();

    const set: { key: string; value: string | null }[] = [];
    const discard: string[] = [];
    for (const key of keys) {
      const op = ops[key];
      if (op.kind === "set") set.push({ key, value: op.value });
      else discard.push(key);
    }

    setSaving(true);
    const run = (async () => {
      try {
        applyState(await backend.saveDrafts(set, discard));
        updatePending((prev) => {
          const next = { ...prev };
          for (const key of keys) if (next[key] === ops[key]) delete next[key];
          return next;
        });
        setSaveError(null);
        setLastSavedAt(Date.now());
      } catch (e) {
        const err = e as SiteTextApiError;
        if (err.code === "validation" && err.details?.length) {
          // Ungültige Änderungen verwerfen (der Server hätte sie nie angenommen), Rest behalten.
          const bad = new Set(err.details.map((d) => d.key));
          updatePending((prev) => {
            const next = { ...prev };
            for (const key of bad) if (next[key] === ops[key]) delete next[key];
            return next;
          });
          setSaveError(err.details.map((d) => `${d.key}: ${d.errors.join(" ")}`).join("\n"));
        } else {
          setSaveError(err.message || "Speichern fehlgeschlagen.");
        }
        if (err.code === "missing-table") setLoadState("missing-table");
      } finally {
        setSaving(false);
        flushPromise.current = null;
      }
    })();
    flushPromise.current = run;
    return run;
  }, [backend, applyState, updatePending]);

  // Neue Änderungen kurz sammeln, dann senden.
  useEffect(() => {
    if (Object.keys(pending).length === 0) return;
    const t = window.setTimeout(() => void flush(), 350);
    return () => window.clearTimeout(t);
  }, [pending, flush]);

  // Warnen, solange etwas nicht beim Server angekommen ist.
  const pendingCount = Object.keys(pending).length;
  useEffect(() => {
    if (pendingCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingCount]);

  // Zurück im Tab: Entwürfe anderer Admins nachladen.
  useEffect(() => {
    if (!isAdmin || mode === "off") return;
    const onFocus = () => {
      if (Object.keys(pendingRef.current).length === 0 && !flushPromise.current) void load(true);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAdmin, mode, load]);

  const effectivePublished = adminPublished ?? published;

  const setDraft = useCallback(
    (def: TextDef, value: string | null) => {
      const current = effectivePublished[def.key];
      let op: PendingOp;
      if (value === null) op = current === undefined ? { kind: "discard" } : { kind: "set", value: null };
      else if (value === (current ?? def.text)) op = { kind: "discard" };
      else if (value === def.text && current !== undefined) op = { kind: "set", value: null };
      else op = { kind: "set", value };
      updatePending((prev) => ({ ...prev, [def.key]: op }));
    },
    [effectivePublished, updatePending]
  );

  const discardDrafts = useCallback((keys: string[]) => {
    updatePending((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = { kind: "discard" };
      return next;
    });
  }, [updatePending]);

  const publish = useCallback<SiteTextEditor["publish"]>(
    async (keys) => {
      await flush();
      if (Object.keys(pendingRef.current).length) {
        return { ok: false, error: "Einige Änderungen sind noch nicht gespeichert. Bitte zuerst erneut speichern." };
      }
      try {
        applyState(await backend.publish(keys));
        // Server-Komponenten (Root-Layout) mit den neuen Texten neu laden.
        router.refresh();
        return { ok: true };
      } catch (e) {
        const err = e as SiteTextApiError;
        return { ok: false, error: err.message, details: err.details };
      }
    },
    [flush, backend, applyState, router]
  );

  // Entwürfe = Server-Stand + noch nicht gesendete Änderungen.
  const drafts = useMemo(() => {
    if (pendingCount === 0) return serverDrafts;
    const next = { ...serverDrafts };
    const now = new Date().toISOString();
    for (const [key, op] of Object.entries(pending)) {
      if (op.kind === "discard") delete next[key];
      else next[key] = { key, value: op.value, updatedAt: now, baseHash: serverDrafts[key]?.baseHash ?? null, updatedBy: userEmail ?? null };
    }
    return next;
  }, [serverDrafts, pending, pendingCount, userEmail]);

  const editor = useMemo<SiteTextEditor | null>(() => {
    if (!isAdmin) return null;
    return {
      editMode: mode === "edit",
      setEditMode: (on) => changeMode(on ? "edit" : "off"),
      preview: mode === "preview",
      setPreview: (on) => changeMode(on ? "preview" : "edit"),
      showDrafts: mode !== "off",
      translated,
      currentUserEmail: forceAdmin ? null : userEmail ?? null,
      drafts,
      publishedMeta,
      loadState,
      loadError,
      pendingCount,
      saving,
      saveError,
      lastSavedAt,
      setDraft,
      discardDrafts,
      retrySave: () => void flush(),
      saveNow: () => flush(),
      publish,
      reload: () => load(),
      history: (key, limit) => backend.history(key, limit),
      activeId,
      setActiveId,
      registerActiveEdit,
      commitActiveEdit,
      blockEditor,
      openBlockEditor: setBlockEditor,
    };
  }, [isAdmin, mode, changeMode, translated, forceAdmin, userEmail, drafts, publishedMeta, loadState, loadError, pendingCount, saving, saveError, lastSavedAt, setDraft, discardDrafts, flush, publish, load, backend, activeId, registerActiveEdit, commitActiveEdit, blockEditor]);

  const registry = useMemo(() => createTextRegistry(), []);

  return (
    <NestedProviderContext.Provider value={setHasNestedProvider}>
    <PublishedTextsContext.Provider value={effectivePublished}>
      <SiteTextEditorContext.Provider value={editor}>
        <TextRegistryContext.Provider value={isAdmin ? registry : null}>
          {children}
          {isAdmin && (
            <Suspense fallback={null}>
              <EditorChrome />
            </Suspense>
          )}
        </TextRegistryContext.Provider>
      </SiteTextEditorContext.Provider>
    </PublishedTextsContext.Provider>
    </NestedProviderContext.Provider>
  );
}
