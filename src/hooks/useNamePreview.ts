"use client";

/**
 * "Anhören" für Name & Aussprache: lässt den Namen so sprechen, wie er in
 * Power Storys klingt (/api/profile/name-preview). Beliebig oft nutzbar.
 * Genutzt in den Einstellungen und im Namens-Schritt von /create-story.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const FALLBACK_ERROR = "Die Hörprobe konnte nicht erstellt werden.";

export function useNamePreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [spokenAs, setSpokenAs] = useState<string | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  /** Spielt die Hörprobe ab. Gibt bei Fehlern den Text für die Anzeige zurück, sonst null. */
  const playPreview = useCallback(
    async (name: string, pronunciation: string, voiceId?: string | null): Promise<string | null> => {
      if (!name.trim() || previewing) return null;
      setPreviewing(true);
      try {
        const response = await fetch("/api/profile/name-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, pronunciation, ...(voiceId ? { voiceId } : {}) }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.audio) throw new Error(result.error || FALLBACK_ERROR);
        audioRef.current?.pause();
        audioRef.current = new Audio(result.audio);
        setSpokenAs(result.spoken ?? null);
        await audioRef.current.play();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : FALLBACK_ERROR;
      } finally {
        setPreviewing(false);
      }
    },
    [previewing]
  );

  const resetPreview = useCallback(() => setSpokenAs(null), []);

  return { playPreview, previewing, spokenAs, resetPreview };
}
