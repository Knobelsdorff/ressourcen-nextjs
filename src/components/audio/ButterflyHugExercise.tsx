"use client";

/**
 * Optionale Klopfübung (Butterfly Hug) unter dem Player einer Power Story.
 *
 * Eingeklappt nur Titel und ein Satz. Aufgeklappt läuft das kurze Video
 * stumm in Schleife, ohne Bedienelemente und inline (auch auf iOS). Beim
 * Zuklappen wird das Video entfernt – damit stoppt es zuverlässig.
 *
 * Gilt für alle, auch für Pro: Das frühere Pro-Video „Bilaterale
 * Stimulation" im Player ist auf Wunsch von Andreas entfallen.
 */

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const BUTTERFLY_HUG_VIDEO_URL = "/videos/butterfly-hug.mp4";
// Standbild aus dem Video – statt einer leeren Fläche, bis das Video geladen ist.
const BUTTERFLY_HUG_POSTER_URL = "/videos/butterfly-hug-poster.jpg";

export default function ButterflyHugExercise({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const panelId = useId();

  // React setzt `muted` nicht zuverlässig als Attribut – ohne stummes Video
  // verweigern mobile Browser das automatische Abspielen.
  useEffect(() => {
    const video = videoRef.current;
    if (!open || !video) return;
    video.muted = true;
    video.play().catch(() => {});
    return () => video.pause();
  }, [open]);

  return (
    <div className={`rounded-2xl border border-secondary-200 bg-secondary-50/60 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-secondary-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-secondary-900">
            Durch sanftes Klopfen Effekt verstärken
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-secondary-600">
            Wenn du möchtest, kannst du deine Power Story mit einer einfachen Klopfübung begleiten.
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-secondary-500 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="px-4 pb-4">
          {/* Seitenverhältnis des Videos (748×556), damit nichts abgeschnitten wird. */}
          <div className="mx-auto aspect-[748/556] w-full max-w-sm overflow-hidden rounded-xl bg-secondary-100">
            <video
              ref={videoRef}
              src={BUTTERFLY_HUG_VIDEO_URL}
              poster={BUTTERFLY_HUG_POSTER_URL}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              aria-label="Video: Klopfübung mit vor der Brust überkreuzten Armen"
              className="pointer-events-none h-full w-full object-cover"
            />
          </div>
          <p className="mx-auto mt-3 max-w-sm text-center text-sm italic leading-relaxed text-secondary-600">
            Du kannst die Augen schließen, wenn es sich angenehm anfühlt, und jederzeit mit dem Klopfen aufhören.
          </p>
        </div>
      )}
    </div>
  );
}
