"use client";

/**
 * Slider für die Hintergrundmusik-Lautstärke.
 *
 * Bewusst direkt am Player und nicht in den Einstellungen: Die passende
 * Balance hört man nur, während die Stimme läuft. Ein Regler auf einer
 * Einstellungsseite würde raten–speichern–neu abspielen erzwingen.
 *
 * Der Wert ist ein Faktor auf die Admin-Lautstärke des Tracks, kein
 * Absolutwert – siehe lib/musicVolumePreference.
 */

import { useState, useEffect, useRef, useId } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  MUSIC_VOLUME_FACTOR_MIN,
  MUSIC_VOLUME_FACTOR_MAX,
  getMusicVolumeFactor,
  setMusicVolumeFactor,
  persistMusicVolumeFactor,
  syncMusicVolumeFactorFromDB,
  subscribeToMusicVolumeFactor,
} from "@/lib/musicVolumePreference";

/** Schreibt erst, wenn der Regler kurz ruhig ist – sonst ein Request pro Pixel. */
const PERSIST_DELAY_MS = 600;

interface MusicVolumeControlProps {
  compact?: boolean;
  className?: string;
}

export default function MusicVolumeControl({
  compact = false,
  className = "",
}: MusicVolumeControlProps) {
  const { user } = useAuth();
  const [factor, setFactor] = useState<number>(() => getMusicVolumeFactor());
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderId = useId();

  // Gespeicherten Wert vom Profil holen (Gerätewechsel).
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void syncMusicVolumeFactorFromDB(user.id).then((stored) => {
      if (!cancelled) setFactor(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Mehrere Player auf einer Seite zeigen denselben Stand.
  useEffect(() => {
    return subscribeToMusicVolumeFactor((next) => setFactor(next));
  }, []);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const handleChange = (value: number) => {
    // Sofort anwenden: Die laufende Musik soll dem Finger folgen.
    const applied = setMusicVolumeFactor(value);
    setFactor(applied);

    if (!user?.id) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      void persistMusicVolumeFactor(user.id, applied);
    }, PERSIST_DELAY_MS);
  };

  const isMuted = factor === 0;
  // Als Prozent der Admin-Vorgabe: 100 % = so, wie es eingestellt wurde.
  const percent = Math.round(factor * 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <label
        htmlFor={sliderId}
        className="flex shrink-0 items-center gap-1.5 text-secondary-600"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        )}
        <span className={compact ? "sr-only" : "text-xs"}>Musik</span>
      </label>

      <input
        id={sliderId}
        type="range"
        min={MUSIC_VOLUME_FACTOR_MIN}
        max={MUSIC_VOLUME_FACTOR_MAX}
        step={0.05}
        value={factor}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        aria-label="Lautstärke der Hintergrundmusik"
        aria-valuetext={isMuted ? "Musik aus" : `${percent} Prozent`}
        className="music-volume-slider h-1.5 w-full max-w-[9rem] cursor-pointer appearance-none rounded-full bg-secondary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
      />

      <span className="w-11 shrink-0 text-right text-xs tabular-nums text-secondary-500">
        {isMuted ? "Aus" : `${percent}%`}
      </span>
    </div>
  );
}
