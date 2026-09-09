"use client";

/**
 * Gemeinsame Audio-Logik für alle Player.
 *
 * Vorher lagen Stimme, Hintergrundmusik, Wake Lock, Safari-Fallback und
 * Seeking dupliziert in DashboardAudioPlayer und StoryPlayerWithBLS – rund
 * 1.800 Zeilen, in denen dieselben 15 Funktionen zweimal existierten und
 * auseinandergelaufen sind. Fixes hier gelten ab jetzt für alle Player.
 *
 * Wichtig für die Stabilität: Das Audio-Element wird ausschließlich neu
 * aufgebaut, wenn sich die URL ändert. Callbacks und resource_figure liegen in
 * Refs – sonst zerstört jedes Re-Render des Dashboards die laufende Wiedergabe,
 * weil resource_figure als JSONB bei jedem Laden eine neue Objekt-Referenz ist.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { getBackgroundMusicUrl, DEFAULT_MUSIC_VOLUME } from "@/data/backgroundMusic";

export interface UseAudioPlayerOptions {
  audioUrl: string;
  storyId?: string;
  /** Bestimmt die Hintergrundmusik. Referenz-instabil – wird bewusst in einer Ref gehalten. */
  resourceFigure?: any;
  onEnded?: () => void;
}

export interface UseAudioPlayerResult {
  isPlaying: boolean;
  isLoading: boolean;
  isPreparingAudio: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  togglePlayPause: () => void;
  seekTo: (time: number, resumePlayback?: boolean) => void;
  skipBy: (seconds: number) => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  musicRef: React.MutableRefObject<HTMLAudioElement | null>;
}

/** "8:05" – auch bei NaN/Infinity stabil. */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** "2 Minuten 14 Sekunden" – für aria-valuetext, damit Screenreader nicht "2:14" buchstabieren. */
export function formatTimeSpoken(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0 Sekunden";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (mins > 0) parts.push(`${mins} ${mins === 1 ? "Minute" : "Minuten"}`);
  if (secs > 0 || mins === 0) parts.push(`${secs} ${secs === 1 ? "Sekunde" : "Sekunden"}`);
  return parts.join(" ");
}

function getAudioExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const idx = pathname.lastIndexOf(".");
    return idx >= 0 ? pathname.substring(idx) : "";
  } catch {
    const clean = (url || "").split("?")[0].toLowerCase();
    const idx = clean.lastIndexOf(".");
    return idx >= 0 ? clean.substring(idx) : "";
  }
}

function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR/i.test(ua);
}

/** Safari spielt WebM/OGG nicht zuverlässig – mp3/m4a schon. */
function isSafariCompatibleFormat(ext: string): boolean {
  return [".mp3", ".mp4", ".m4a", ""].includes(ext);
}

function getSafariFallbackCandidates(url: string): string[] {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    if (!pathname.match(/\.(webm|ogg)$/i)) return [];
    const withoutExt = pathname.replace(/\.(webm|ogg)$/i, "");
    return [
      `${parsed.origin}${withoutExt}_safari.mp3`,
      `${parsed.origin}${withoutExt}.mp3`,
      `${parsed.origin}${withoutExt}.m4a`,
    ];
  } catch {
    return [];
  }
}

export function useAudioPlayer({
  audioUrl,
  storyId,
  resourceFigure,
  onEnded,
}: UseAudioPlayerOptions): UseAudioPlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [effectiveAudioUrl, setEffectiveAudioUrl] = useState(audioUrl);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserPausingRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  // Referenz-instabile Werte in Refs spiegeln, damit sie den Audio-Effekt
  // unten NICHT neu auslösen. Genau hier lag der Abbruch-Bug.
  const onEndedRef = useRef(onEnded);
  const resourceFigureRef = useRef(resourceFigure);
  useEffect(() => {
    onEndedRef.current = onEnded;
    resourceFigureRef.current = resourceFigure;
  });

  // --- Safari-Fallback -----------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const ext = getAudioExtension(audioUrl);
      if (!isSafariBrowser() || isSafariCompatibleFormat(ext)) {
        setEffectiveAudioUrl(audioUrl);
        return;
      }

      setIsPreparingAudio(true);

      // Erst serverseitige Konvertierung anstoßen …
      if (storyId) {
        try {
          const res = await fetch("/api/audio/migrate-on-demand", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ storyId }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.audioUrl && !cancelled) {
            setEffectiveAudioUrl(data.audioUrl);
            setIsPreparingAudio(false);
            return;
          }
        } catch {
          /* weiter zum statischen Fallback */
        }
      }

      // … sonst nach einer bereits konvertierten Datei suchen.
      for (const candidate of getSafariFallbackCandidates(audioUrl)) {
        if (cancelled) return;
        try {
          const res = await fetch(candidate, { method: "HEAD", cache: "no-cache" });
          if (res.ok && !cancelled) {
            setEffectiveAudioUrl(candidate);
            setIsPreparingAudio(false);
            return;
          }
        } catch {
          /* nächster Kandidat */
        }
      }

      if (!cancelled) {
        setEffectiveAudioUrl(audioUrl);
        setIsPreparingAudio(false);
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [audioUrl, storyId]);

  // --- Wake Lock -----------------------------------------------------------

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
    } catch {
      /* z.B. Tab im Hintergrund – unkritisch */
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* bereits freigegeben */
    }
    wakeLockRef.current = null;
  }, []);

  useEffect(() => {
    if (isPlaying) void requestWakeLock();
    else void releaseWakeLock();
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && isPlaying) void requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isPlaying, requestWakeLock]);

  useEffect(() => () => void releaseWakeLock(), [releaseWakeLock]);

  // --- Audio-Elemente ------------------------------------------------------
  // Einzige Abhängigkeit: die URL. Alles andere läuft über Refs.

  useEffect(() => {
    const audio = new Audio(effectiveAudioUrl);
    audio.preload = "metadata";
    audioRef.current = audio;

    setIsLoading(true);
    setCurrentTime(0);

    const clearMusicTimer = () => {
      if (musicTimerRef.current) {
        clearInterval(musicTimerRef.current);
        musicTimerRef.current = null;
      }
    };

    // Hintergrundmusik passend zur Ressourcen-Figur laden
    void (async () => {
      try {
        const figure = resourceFigureRef.current;
        const figureId = figure?.id || figure?.name || figure;
        const url = await getBackgroundMusicUrl(figureId);
        if (!url) return;

        const music = new Audio(url);
        music.loop = true;
        music.volume = DEFAULT_MUSIC_VOLUME;
        music.preload = "auto";
        music.addEventListener("loadedmetadata", () => setMusicDuration(music.duration));
        music.load();
        musicRef.current = music;
      } catch (err) {
        console.warn("[useAudioPlayer] Hintergrundmusik konnte nicht geladen werden:", err);
      }
    })();

    /**
     * WebM-Aufnahmen aus dem MediaRecorder tragen keine Dauer im Header –
     * audio.duration ist dann Infinity, der Fortschrittsbalken hätte keinen
     * Maßstab und stünde still. Ein Sprung ans (vermeintliche) Ende zwingt den
     * Browser, die echte Dauer zu ermitteln; danach springen wir zurück.
     */
    const resolveInfiniteDuration = () => {
      const onSeeked = () => {
        audio.removeEventListener("seeked", onSeeked);
        if (isFinite(audio.duration) && audio.duration > 0) {
          setVoiceDuration(audio.duration);
        }
        audio.currentTime = 0;
        setCurrentTime(0);
      };
      audio.addEventListener("seeked", onSeeked);
      // 24h – groß genug für jede Aufnahme, der Browser klemmt auf die echte Dauer.
      audio.currentTime = 86_400;
    };

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setVoiceDuration(audio.duration);
      } else {
        resolveInfiniteDuration();
      }
      setIsLoading(false);
    };

    // Manche Browser melden die echte Dauer erst später nach.
    const handleDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setVoiceDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      // Während der Dauer-Ermittlung springt currentTime kurz ans Ende –
      // dieser Ausreißer darf nicht als Fortschritt angezeigt werden.
      if (!isFinite(audio.duration)) return;

      const music = musicRef.current;
      if (audio.currentTime < audio.duration) {
        setCurrentTime(audio.currentTime);
      } else if (music && isFinite(music.duration) && music.duration > audio.duration) {
        setCurrentTime(music.currentTime);
      }
    };

    const finish = () => {
      clearMusicTimer();
      setIsPlaying(false);
      setCurrentTime(0);
      const music = musicRef.current;
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
      onEndedRef.current?.();
    };

    const handleEnded = () => {
      const music = musicRef.current;
      const musicOutlastsVoice =
        music && !music.paused && !music.ended && music.duration > audio.duration;

      if (!musicOutlastsVoice) {
        finish();
        return;
      }

      // Stimme ist zu Ende, Musik läuft weiter – Zeit weiter mitschreiben.
      clearMusicTimer();
      musicTimerRef.current = setInterval(() => {
        const m = musicRef.current;
        if (!m) return clearMusicTimer();
        if (isUserPausingRef.current || m.paused) return clearMusicTimer();
        if (m.ended) return finish();
        setCurrentTime(m.currentTime);
      }, 250);
    };

    const handlePlay = () => setIsPlaying(true);

    const handlePause = () => {
      if (isUserPausingRef.current) return;
      // Pause direkt am Ende der Stimme, während Musik weiterläuft: kein echter Stopp.
      const voiceEnded = audio.currentTime >= audio.duration - 0.1;
      const music = musicRef.current;
      if (voiceEnded && music && music.duration > audio.duration) return;
      setIsPlaying(false);
    };

    const handleError = () => {
      console.error("[useAudioPlayer] Audio konnte nicht geladen werden:", {
        url: effectiveAudioUrl,
        code: audio.error?.code,
      });
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      clearMusicTimer();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.src = "";
        musicRef.current = null;
      }
    };
  }, [effectiveAudioUrl]);

  // --- Steuerung -----------------------------------------------------------

  const duration = Math.max(
    isFinite(voiceDuration) && voiceDuration > 0 ? voiceDuration : 0,
    isFinite(musicDuration) && musicDuration > 0 ? musicDuration : 0
  );

  const seekTo = useCallback(
    (newTime: number, resumePlayback: boolean = true) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Infinity abfangen: bei WebM ohne Header steht die Dauer kurzzeitig nicht fest.
      const safe = (v: number | undefined) => (isFinite(v ?? NaN) && (v as number) > 0 ? (v as number) : 0);
      const vDur = safe(audio.duration);
      const mDur = safe(musicRef.current?.duration);
      const maxDur = Math.max(vDur, mDur);

      // Solange keine Dauer bekannt ist, nicht springen – sonst landet man
      // versehentlich am Anfang.
      if (maxDur <= 0) return;

      const clamped = Math.max(0, Math.min(newTime, maxDur));

      audio.currentTime = Math.min(clamped, vDur);
      if (musicRef.current && mDur) {
        musicRef.current.currentTime = Math.min(clamped, mDur);
      }
      setCurrentTime(clamped);

      if (resumePlayback && isPlaying) {
        if (clamped < vDur && audio.paused) {
          audio.play().catch(() => {});
        }
        if (musicRef.current && clamped < mDur && musicRef.current.paused) {
          musicRef.current.play().catch(() => {});
        }
      }
    },
    [isPlaying]
  );

  const skipBy = useCallback(
    (seconds: number) => seekTo(currentTime + seconds),
    [currentTime, seekTo]
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const music = musicRef.current;

    if (isPlaying) {
      isUserPausingRef.current = true;
      audio.pause();
      music?.pause();
      setIsPlaying(false);
      // Kurz nachlaufen lassen, damit das pause-Event die Flagge noch sieht.
      setTimeout(() => {
        isUserPausingRef.current = false;
      }, 100);
      return;
    }

    isUserPausingRef.current = false;

    // Stimme und Musik gemeinsam starten, damit sie synchron bleiben.
    if (audio.currentTime < (audio.duration || Infinity)) {
      audio.play().catch((err) => console.warn("[useAudioPlayer] play() abgelehnt:", err));
    }
    if (music) {
      music.currentTime = Math.min(currentTime, music.duration || 0);
      music.play().catch(() => {});
    }
    setIsPlaying(true);
  }, [isPlaying, currentTime]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    isPlaying,
    isLoading,
    isPreparingAudio,
    currentTime,
    duration,
    progress,
    togglePlayPause,
    seekTo,
    skipBy,
    audioRef,
    musicRef,
  };
}
