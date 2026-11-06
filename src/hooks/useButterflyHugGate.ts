import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const seenKey = (userId: string) => `ps_butterfly_hug_seen_${userId}`;

/**
 * Pflicht-Hinweis beim allerersten Abspielen eines Accounts: Die Story startet
 * erst, nachdem die Klopfübung mit OK bestätigt wurde. Danach nie wieder.
 *
 * Gemerkt wird am Account (profiles.butterfly_hug_seen_at), damit es auch auf
 * dem nächsten Gerät nur einmal kommt – und im Browser, damit es bei fehlender
 * Spalte oder Verbindung nicht bei jedem Abspielen erneut erscheint.
 *
 * Im Zweifel erscheint der Hinweis: Lieber einmal zu oft als gar nicht. Während
 * das Profil lädt oder wenn es nicht lesbar ist, gilt er also als nicht gesehen.
 */
export function useButterflyHugGate(userId?: string) {
  const [pending, setPending] = useState(false);
  const seenRef = useRef(false);
  const proceedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    seenRef.current = false;
    if (!userId) return;

    try {
      if (localStorage.getItem(seenKey(userId)) === "1") seenRef.current = true;
    } catch { /* Ohne Storage zählt nur das Profil. */ }

    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("butterfly_hug_seen_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.warn("[Klopfübung] Status nicht lesbar (Migration eingespielt?):", error.message);
        return;
      }
      if (!cancelled && data?.butterfly_hug_seen_at) seenRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Für AudioPlayer.playGate: true heißt, der Start läuft später über `proceed`. */
  const gate = useCallback((proceed: () => void) => {
    if (seenRef.current) return false;
    proceedRef.current = proceed;
    setPending(true);
    return true;
  }, []);

  const confirm = useCallback(() => {
    seenRef.current = true;
    setPending(false);

    // Zuerst abspielen – noch innerhalb der Klick-Geste (sonst blockiert iOS).
    proceedRef.current?.();
    proceedRef.current = null;

    if (!userId) return;
    try {
      localStorage.setItem(seenKey(userId), "1");
    } catch { /* Das Profil reicht. */ }
    (supabase as any)
      .from("profiles")
      .update({ butterfly_hug_seen_at: new Date().toISOString() })
      .eq("id", userId)
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.warn("[Klopfübung] Status nicht gespeichert (Migration eingespielt?):", error.message);
      });
  }, [userId]);

  return { pending, gate, confirm };
}
