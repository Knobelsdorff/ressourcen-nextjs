"use client";

/**
 * Erklärung zum Klopfen im Player: beim ersten Mal offen, danach eingeklappt
 * ("So geht's" klappt sie wieder auf). Kein Pflicht-Hinweis mehr vor dem
 * Abspielen – auf Wunsch des Kunden nach dem Usability-Test (2026-11).
 *
 * "Gesehen" gilt ab dem ersten Abspielen und wird wie bisher gemerkt: im
 * Profil (profiles.butterfly_hug_seen_at, gilt auf jedem Gerät) und im Browser
 * (derselbe Schlüssel wie der frühere Pflicht-Hinweis – wer den schon bestätigt
 * hat, gilt als "kennt es"). In der laufenden Sitzung bleibt die Erklärung so,
 * wie sie anfangs war; eingeklappt wird erst beim nächsten Besuch.
 *
 * Im Zweifel offen: lieber einmal zu oft erklärt als gar nicht.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ANONYMOUS = "anonymous";
const seenKey = (id: string) => `ps_butterfly_hug_seen_${id}`;

/** Für die ganze Seite: alle Player zeigen denselben Stand. */
let sessionOpen: boolean | null = null;
let sessionUser: string | null = null;
let pendingFor: string | null = null;
const listeners = new Set<(open: boolean) => void>();
const written = new Set<string>();

function setSessionOpen(open: boolean) {
  sessionOpen = open;
  listeners.forEach((listener) => listener(open));
}

function readLocalSeen(userId?: string): boolean {
  try {
    return [ANONYMOUS, userId].some((id) => id && localStorage.getItem(seenKey(id)) === "1");
  } catch {
    return false;
  }
}

export function useTappingIntro(userId?: string) {
  const [explainOpen, setExplainOpen] = useState<boolean>(() => sessionOpen ?? true);

  useEffect(() => {
    const listener = (open: boolean) => setExplainOpen(open);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const key = userId ?? ANONYMOUS;
    if (sessionUser !== key) {
      sessionUser = key;
      sessionOpen = null;
    }
    if (sessionOpen !== null) {
      setExplainOpen(sessionOpen);
      return;
    }
    if (readLocalSeen(userId)) {
      setSessionOpen(false);
      return;
    }
    if (!userId) {
      setSessionOpen(true);
      return;
    }
    // Mehrere Karten fragen gleichzeitig – nur eine Abfrage pro Nutzer.
    if (pendingFor !== userId) {
      pendingFor = userId;
      void (supabase as any)
        .from("profiles")
        .select("butterfly_hug_seen_at")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data, error }: { data: { butterfly_hug_seen_at?: string | null } | null; error: { message: string } | null }) => {
          if (sessionUser !== userId || sessionOpen !== null) return;
          if (error) console.warn("[Klopfen] Status nicht lesbar:", error.message);
          setSessionOpen(!data?.butterfly_hug_seen_at);
        });
    }
  }, [userId]);

  const toggleExplain = useCallback(() => {
    setSessionOpen(!(sessionOpen ?? explainOpen));
  }, [explainOpen]);

  /** Beim ersten Abspielen: für die nächsten Besuche als "gesehen" merken. */
  const markPlayed = useCallback(() => {
    const key = userId ?? ANONYMOUS;
    if (written.has(key)) return;
    written.add(key);
    try {
      localStorage.setItem(seenKey(key), "1");
    } catch { /* das Profil reicht */ }
    if (!userId) return;
    void (supabase as any)
      .from("profiles")
      .update({ butterfly_hug_seen_at: new Date().toISOString() })
      .eq("id", userId)
      .is("butterfly_hug_seen_at", null)
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.warn("[Klopfen] Status nicht gespeichert:", error.message);
      });
  }, [userId]);

  return { explainOpen, toggleExplain, markPlayed };
}
