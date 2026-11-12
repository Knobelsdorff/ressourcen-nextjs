"use client";

/**
 * Sperrbildschirm / Benachrichtigung (iOS 15+, Android Chrome): Titel, Bild,
 * Play/Pause und ±15 s – wie bei Musik-Apps. Nur der aktive Player meldet sich
 * an; beim Abmelden werden die Aktionen wieder entfernt.
 * Ältere Browser ohne Media Session: still ignoriert.
 */

import { useEffect, useRef } from "react";
import { TAPPING_POSTER_URL } from "./TappingVideo";

interface MediaSessionOptions {
  active: boolean;
  title: string;
  subtitle?: string | null;
  playing: boolean;
  time: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSkip: (seconds: number) => void;
  onSeek: (seconds: number) => void;
}

const ACTIONS = ["play", "pause", "seekbackward", "seekforward", "seekto"] as const;

function getSession(): any {
  if (typeof navigator === "undefined") return null;
  return (navigator as any).mediaSession ?? null;
}

export function useMediaSession(options: MediaSessionOptions) {
  const ref = useRef(options);
  ref.current = options;
  const { active, title, subtitle, playing, time, duration } = options;

  useEffect(() => {
    const session = getSession();
    if (!session || !active) return;
    try {
      const Metadata = (window as any).MediaMetadata;
      if (Metadata) {
        session.metadata = new Metadata({
          title,
          artist: "Power Storys",
          album: subtitle || undefined,
          artwork: [{ src: TAPPING_POSTER_URL, sizes: "748x556", type: "image/jpeg" }],
        });
      }
    } catch { /* ältere Browser */ }

    const handlers: Record<(typeof ACTIONS)[number], (details: any) => void> = {
      play: () => ref.current.onPlay(),
      pause: () => ref.current.onPause(),
      seekbackward: () => ref.current.onSkip(-15),
      seekforward: () => ref.current.onSkip(15),
      seekto: (details) => {
        if (typeof details?.seekTime === "number") ref.current.onSeek(details.seekTime);
      },
    };
    for (const action of ACTIONS) {
      try { session.setActionHandler(action, handlers[action]); } catch { /* Aktion nicht unterstützt */ }
    }
    return () => {
      for (const action of ACTIONS) {
        try { session.setActionHandler(action, null); } catch { /* egal */ }
      }
    };
  }, [active, title, subtitle]);

  useEffect(() => {
    const session = getSession();
    if (!session || !active) return;
    try {
      session.playbackState = playing ? "playing" : "paused";
      if (duration > 0 && isFinite(duration) && session.setPositionState) {
        session.setPositionState({ duration, position: Math.min(Math.max(0, time), duration), playbackRate: 1 });
      }
    } catch { /* setPositionState wirft bei ungültigen Werten */ }
  }, [active, playing, time, duration]);
}
