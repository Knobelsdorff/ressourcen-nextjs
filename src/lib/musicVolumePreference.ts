"use client";

/**
 * Nutzer-eigene Lautstärke für Hintergrundmusik.
 *
 * Warum ein Faktor und kein Absolutwert: Die Admins pflegen pro Track eine
 * Lautstärke (background_music_tracks.volume), die auf den jeweiligen Track
 * abgestimmt ist. Klient:innen brauchen je nach Stimme und Track eine andere
 * Balance. Ein Faktor erhält die Admin-Abstimmung zwischen den Tracks und
 * verschiebt sie nur gemeinsam – ein Absolutwert würde sie einebnen.
 *
 * Speicherung doppelt: localStorage antwortet synchron (der Player braucht die
 * Lautstärke, bevor der erste Ton läuft), die Spalte profiles.music_volume_factor
 * trägt die Einstellung auf andere Geräte. localStorage gewinnt nie über einen
 * frisch geladenen DB-Wert – siehe syncMusicVolumeFactorFromDB.
 */

import { supabase } from "@/lib/supabase";

export const MUSIC_VOLUME_FACTOR_DEFAULT = 1;
export const MUSIC_VOLUME_FACTOR_MIN = 0;
export const MUSIC_VOLUME_FACTOR_MAX = 3;

const STORAGE_KEY = "ressourcen.musicVolumeFactor";
const EVENT_NAME = "ressourcen:music-volume-factor-changed";

/** Hält den Wert synchron verfügbar, auch wenn localStorage blockiert ist (Safari Private Mode). */
let cachedFactor: number | null = null;

export function clampMusicVolumeFactor(value: unknown): number {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (!isFinite(num)) return MUSIC_VOLUME_FACTOR_DEFAULT;
  return Math.min(MUSIC_VOLUME_FACTOR_MAX, Math.max(MUSIC_VOLUME_FACTOR_MIN, num));
}

/**
 * Effektive Lautstärke für ein Audio-Element.
 * Das Ergebnis wird auf 0..1 geklemmt – volume > 1 wirft in Browsern einen RangeError.
 */
export function applyMusicVolumeFactor(adminVolume: number, factor?: number): number {
  const base = isFinite(adminVolume) ? adminVolume : 0;
  const f = factor === undefined ? getMusicVolumeFactor() : clampMusicVolumeFactor(factor);
  return Math.min(1, Math.max(0, base * f));
}

/** Synchron – für Player, die die Lautstärke vor dem ersten play() brauchen. */
export function getMusicVolumeFactor(): number {
  if (cachedFactor !== null) return cachedFactor;
  if (typeof window === "undefined") return MUSIC_VOLUME_FACTOR_DEFAULT;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      cachedFactor = clampMusicVolumeFactor(raw);
      return cachedFactor;
    }
  } catch {
    // localStorage kann werfen (Private Mode, blockierte Cookies) – Default ist dann korrekt.
  }

  cachedFactor = MUSIC_VOLUME_FACTOR_DEFAULT;
  return cachedFactor;
}

/**
 * Setzt den Faktor lokal und benachrichtigt alle laufenden Player.
 * Schreibt NICHT in die Datenbank – das übernimmt persistMusicVolumeFactor,
 * damit das Ziehen am Slider nicht pro Pixel einen Request auslöst.
 */
export function setMusicVolumeFactor(value: number): number {
  const factor = clampMusicVolumeFactor(value);
  cachedFactor = factor;

  try {
    window.localStorage.setItem(STORAGE_KEY, String(factor));
  } catch {
    // Nicht kritisch: cachedFactor trägt den Wert für diese Session.
  }

  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: factor }));
  } catch {
    // Ältere Browser ohne CustomEvent-Konstruktor: Player bleiben beim alten Wert
    // bis zum nächsten Start. Kein Grund, den Slider scheitern zu lassen.
  }

  return factor;
}

/** Schreibt den Faktor ins Profil. Fehler sind nicht kritisch – lokal gilt der Wert bereits. */
export async function persistMusicVolumeFactor(userId: string, value: number): Promise<void> {
  const factor = clampMusicVolumeFactor(value);
  try {
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ music_volume_factor: factor })
      .eq("id", userId);
    if (error) {
      console.warn("[musicVolumePreference] Konnte Lautstärke nicht speichern:", error.message);
    }
  } catch (error: any) {
    console.warn("[musicVolumePreference] Konnte Lautstärke nicht speichern:", error?.message);
  }
}

/**
 * Holt den Wert aus dem Profil und übernimmt ihn lokal.
 * Beim Gerätewechsel ist der DB-Wert die Wahrheit, deshalb überschreibt er localStorage.
 */
export async function syncMusicVolumeFactorFromDB(userId: string): Promise<number> {
  try {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("music_volume_factor")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data || data.music_volume_factor == null) {
      return getMusicVolumeFactor();
    }

    return setMusicVolumeFactor(parseFloat(data.music_volume_factor));
  } catch {
    return getMusicVolumeFactor();
  }
}

/** Abonniert Änderungen – laufende Player regeln live nach. */
export function subscribeToMusicVolumeFactor(listener: (factor: number) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    listener(clampMusicVolumeFactor(detail));
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
