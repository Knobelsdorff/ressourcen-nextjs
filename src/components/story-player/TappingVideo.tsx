"use client";

/**
 * Das Klopf-Video (Butterfly Hug): stumm, in Schleife, ohne Bedienelemente,
 * inline auch auf iOS.
 *
 * Fallback: Blockiert der Browser das Autoplay (iPhone-Stromsparmodus →
 * play() wirft NotAllowedError), läuft stattdessen eine leichte
 * CSS-Animation des Klopf-Rhythmus plus "Video ansehen" – ein Tippen erlaubt
 * das Abspielen auch dann. Vorher blieb hier ein eingefrorenes Standbild.
 *
 * Im Hintergrund (Tab gewechselt, Bildschirm aus) hält das Video an – spart
 * Akku. Das Audio der Story läuft davon unabhängig weiter.
 */

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

export const TAPPING_VIDEO_URL = "/videos/butterfly-hug.mp4";
export const TAPPING_POSTER_URL = "/videos/butterfly-hug-poster.jpg";

/** Klopf-Rhythmus als CSS/SVG: überkreuzte Arme, Hände klopfen abwechselnd (~1×/s je Seite). */
export function TapAnimation({ compact = false }: { compact?: boolean }) {
  return (
    <div className="sp-tap" data-compact={compact || undefined} role="img" aria-label="Animation: abwechselnd links und rechts klopfen">
      <svg viewBox="0 0 200 150" focusable="false" aria-hidden="true">
        <circle className="sp-tap-head" cx="100" cy="40" r="21" />
        <path className="sp-tap-body" d="M34 150C34 104 62 80 100 80C138 80 166 104 166 150Z" />
        <rect className="sp-tap-arm" x="56" y="106" width="92" height="17" rx="8.5" transform="rotate(-27 102 114)" />
        <rect className="sp-tap-arm sp-tap-arm--front" x="52" y="106" width="92" height="17" rx="8.5" transform="rotate(27 98 114)" />
        <circle className="sp-tap-ripple sp-tap-ripple--l" cx="62" cy="94" r="12" />
        <circle className="sp-tap-ripple sp-tap-ripple--r" cx="138" cy="94" r="12" />
        <circle className="sp-tap-hand sp-tap-hand--l" cx="62" cy="94" r="10" />
        <circle className="sp-tap-hand sp-tap-hand--r" cx="138" cy="94" r="10" />
      </svg>
      {!compact && (
        <p className="sp-tap-beat" aria-hidden="true">
          <span className="sp-tap-dot sp-tap-dot--l" /> links <span className="sp-tap-sep">·</span> rechts <span className="sp-tap-dot sp-tap-dot--r" />
        </p>
      )}
    </div>
  );
}

export default function TappingVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [userStarted, setUserStarted] = useState(false);
  const showFallback = autoplayBlocked && !userStarted;

  useEffect(() => {
    if (showFallback) return;
    const video = videoRef.current;
    if (!video) return;
    // React setzt `muted` nicht zuverlässig als Attribut – ohne stummes Video
    // verweigern mobile Browser das Autoplay.
    video.muted = true;
    const tryPlay = () => {
      video.play().catch((error: unknown) => {
        // Nur echtes Blockieren zählt – AbortError kommt z. B. vom pause() beim Aufräumen.
        if (!userStarted && error instanceof DOMException && error.name === "NotAllowedError") setAutoplayBlocked(true);
      });
    };
    tryPlay();
    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
      else video.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause();
    };
  }, [showFallback, userStarted]);

  return (
    <div className="sp-media">
      {showFallback ? (
        <>
          <TapAnimation />
          <button type="button" className="sp-media-play" onClick={() => setUserStarted(true)}>
            <Play size={14} aria-hidden="true" /> Video ansehen
          </button>
        </>
      ) : (
        <video
          ref={videoRef}
          src={TAPPING_VIDEO_URL}
          poster={TAPPING_POSTER_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-label="Video: Klopfen mit vor der Brust überkreuzten Armen, abwechselnd links und rechts"
        />
      )}
    </div>
  );
}
