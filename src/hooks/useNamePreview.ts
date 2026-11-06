"use client";

/**
 * Hörprobe für Name & Aussprache (/api/profile/name-preview). Genutzt von
 * NamePreviewPlayer in den Einstellungen und im Namens-Schritt von /create-story.
 *
 * Die Hörprobe gehört zu genau einer Eingabe (Name, Aussprache, Stimme). Ändert
 * sich die Eingabe, stoppt sie und gilt als veraltet. Jede Variante wird nur
 * einmal erzeugt: Nochmal hören oder Zurückändern kostet nichts.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const FALLBACK_ERROR = "Die Hörprobe konnte nicht erstellt werden.";

export type NamePreviewStatus = "idle" | "loading" | "playing" | "paused" | "ended";

interface Sample {
  src: string;
  sentence: string;
}

export function useNamePreview(name: string, pronunciation: string, voiceId?: string | null) {
  const [status, setStatus] = useState<NamePreviewStatus>("idle");
  const [sentence, setSentence] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const samplesRef = useRef(new Map<string, Sample>());
  const loadedKeyRef = useRef<string | null>(null);

  const key = JSON.stringify([name.trim(), pronunciation.trim(), voiceId ?? ""]);

  const stopAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    loadedKeyRef.current = null;
  }, []);

  useEffect(() => stopAudio, [stopAudio]);

  // Eingabe geändert: Die laufende Probe passt nicht mehr zu dem, was dasteht.
  useEffect(() => {
    if (!loadedKeyRef.current && !abortRef.current) return;
    if (loadedKeyRef.current === key) return;
    stopAudio();
    setStatus("idle");
    setProgress(0);
    setStale(true);
  }, [key, stopAudio]);

  const play = useCallback(async (audio: HTMLAudioElement) => {
    try {
      await audio.play();
      if (audioRef.current === audio) setStatus("playing");
    } catch (e) {
      if (audioRef.current !== audio) return;
      // iOS erlaubt nach dem Laden oft kein automatisches Abspielen mehr – die
      // Hörprobe liegt dann bereit und startet beim nächsten Tippen.
      if ((e as DOMException)?.name === "NotAllowedError") {
        setStatus("paused");
      } else {
        setStatus("idle");
        setError(FALLBACK_ERROR);
      }
    }
  }, []);

  const loadSample = useCallback(async (): Promise<Sample | null> => {
    const known = samplesRef.current.get(key);
    if (known) return known;

    const controller = new AbortController();
    abortRef.current = controller;
    const response = await fetch("/api/profile/name-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, pronunciation, ...(voiceId ? { voiceId } : {}) }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (controller.signal.aborted) return null;
    abortRef.current = null;
    if (!response.ok || !result.audio) throw new Error(result.error || FALLBACK_ERROR);

    const sample = { src: result.audio as string, sentence: result.text as string };
    samplesRef.current.set(key, sample);
    return sample;
  }, [key, name, pronunciation, voiceId]);

  const start = useCallback(async () => {
    stopAudio();
    setError(null);
    setStale(false);
    setProgress(0);
    setStatus("loading");

    try {
      const sample = await loadSample();
      if (!sample) return;

      const audio = new Audio(sample.src);
      audio.addEventListener("timeupdate", () => {
        // Nach dem Stoppen kommt oft noch ein letztes Update – das darf nicht mehr zählen.
        if (audioRef.current === audio && audio.duration > 0) setProgress(audio.currentTime / audio.duration);
      });
      audio.addEventListener("ended", () => {
        if (audioRef.current !== audio) return;
        setProgress(1);
        setStatus("ended");
      });
      audioRef.current = audio;
      loadedKeyRef.current = key;
      setSentence(sample.sentence);
      await play(audio);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setStatus("idle");
      setError(e instanceof Error ? e.message : FALLBACK_ERROR);
    }
  }, [key, loadSample, play, stopAudio]);

  /** Der eine Knopf: Abspielen, Pausieren, Fortsetzen, von vorn, Laden abbrechen. */
  const toggle = useCallback(() => {
    if (!name.trim()) return;

    if (status === "loading") {
      stopAudio();
      setStatus("idle");
      return;
    }

    const audio = audioRef.current;
    if (!audio || loadedKeyRef.current !== key) {
      void start();
      return;
    }
    if (status === "playing") {
      audio.pause();
      setStatus("paused");
      return;
    }
    if (status === "ended") {
      audio.currentTime = 0;
      setProgress(0);
    }
    void play(audio);
  }, [key, name, play, start, status, stopAudio]);

  return { status, sentence, progress, error, stale, toggle };
}
