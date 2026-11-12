"use client";

/**
 * Nutzer-Lautstärke der Hintergrundmusik – dieselbe Logik wie in
 * MusicVolumeControl (gleicher Speicher, gleiches Profilfeld, gleiche
 * Benachrichtigung an alle Player). Die laufende Musik folgt sofort, weil
 * useAudioPlayer bzw. AudioPlayback subscribeToMusicVolumeFactor hören und
 * die Lautstärke über musicOutput setzen (wirkt auch auf dem iPhone).
 *
 * Wert = Faktor auf die Admin-Lautstärke des Tracks (1 = wie eingestellt).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  MUSIC_VOLUME_FACTOR_DEFAULT,
  MUSIC_VOLUME_FACTOR_MAX,
  getMusicVolumeFactor,
  persistMusicVolumeFactor,
  setMusicVolumeFactor,
  subscribeToMusicVolumeFactor,
  syncMusicVolumeFactorFromDB,
} from "@/lib/musicVolumePreference";

/** Schreibt erst, wenn der Regler kurz ruhig ist – sonst ein Request pro Pixel. */
const PERSIST_DELAY_MS = 600;

export function useMusicVolumeFactor() {
  const { user } = useAuth();
  const userId = user?.id;
  const [factor, setFactor] = useState<number>(() => getMusicVolumeFactor());
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Wohin "Musik an" zurückkehrt – der letzte hörbare Wert, nicht pauschal 100 %. */
  const lastAudibleRef = useRef<number>(factor > 0 ? factor : MUSIC_VOLUME_FACTOR_DEFAULT);

  useEffect(() => {
    if (factor > 0) lastAudibleRef.current = factor;
  }, [factor]);

  // Gespeicherten Wert vom Profil holen (Gerätewechsel).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void syncMusicVolumeFactorFromDB(userId).then((stored) => {
      if (!cancelled) setFactor(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Andere Regler auf der Seite zeigen denselben Stand.
  useEffect(() => subscribeToMusicVolumeFactor((next) => setFactor(next)), []);

  useEffect(() => () => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
  }, []);

  const change = useCallback((value: number) => {
    const applied = setMusicVolumeFactor(value);
    setFactor(applied);
    if (!userId) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      void persistMusicVolumeFactor(userId, applied);
    }, PERSIST_DELAY_MS);
  }, [userId]);

  const toggleMute = useCallback(() => {
    change(factor === 0 ? lastAudibleRef.current : 0);
  }, [change, factor]);

  return { factor, max: MUSIC_VOLUME_FACTOR_MAX, muted: factor === 0, change, toggleMute };
}
