"use client";

/**
 * Optionale Klopfübung (Butterfly Hug) als Lasche am rechten Bildschirmrand.
 *
 * Ersetzt den aufklappbaren Block unter jedem Player: Auf Wunsch von Andreas
 * gibt es den Hinweis nur noch einmal pro Seite statt auf jeder Story – im
 * Dashboard und im Player am Ende von /create-story.
 *
 * Normal nicht modal: Das Dashboard bleibt bedienbar, damit eine Story neben der
 * offenen Übung weiterlaufen kann. Beim Schließen wird das Video entfernt – damit
 * stoppt es zuverlässig; während die Karte zugleitet, bleibt das Standbild.
 *
 * Ausnahme `forced`: Beim allerersten Abspielen (useButterflyHugGate) öffnet sie
 * sich von selbst und modal; nur der OK-Button geht weiter und startet die Story.
 *
 * Gilt für alle, auch für Pro: Das frühere Pro-Video „Bilaterale
 * Stimulation" im Player ist auf Wunsch von Andreas entfallen.
 */

import { useEffect, useId, useRef, useState } from "react";
import { HandHeart, X } from "lucide-react";
import "./butterfly-drawer.css";

const BUTTERFLY_HUG_VIDEO_URL = "/videos/butterfly-hug.mp4";
// Standbild aus dem Video – statt einer leeren Fläche, bis das Video geladen ist.
const BUTTERFLY_HUG_POSTER_URL = "/videos/butterfly-hug-poster.jpg";

interface ButterflyHugDrawerProps {
  forced?: boolean;
  onConfirm?: () => void;
}

export default function ButterflyHugDrawer({ forced = false, onConfirm }: ButterflyHugDrawerProps) {
  const [open, setOpen] = useState(false);
  const isOpen = open || forced;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tabRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  // React setzt `muted` nicht zuverlässig als Attribut – ohne stummes Video
  // verweigern mobile Browser das automatische Abspielen.
  useEffect(() => {
    const video = videoRef.current;
    if (!isOpen || !video) return;
    video.muted = true;
    video.play().catch(() => {});
    return () => video.pause();
  }, [isOpen]);

  useEffect(() => {
    if (!open || forced) return;
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      tabRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, forced]);

  // Modal: Der Fokus bleibt auf OK (einziges Bedienelement) und kehrt danach
  // dorthin zurück, wo er vorher war – meist auf den Play-Button.
  useEffect(() => {
    if (!forced) return;
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      confirmRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus({ preventScroll: true });
    };
  }, [forced]);

  const close = () => {
    setOpen(false);
    tabRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
    {forced && <div className="butterfly-drawer-scrim" aria-hidden="true" />}
    <div className={`butterfly-drawer ${isOpen ? "is-open" : ""} ${forced ? "is-forced" : ""}`}>
      <button
        ref={tabRef}
        type="button"
        className="butterfly-drawer-tab"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <HandHeart size={20} aria-hidden="true" />
        <span>Klopfübung</span>
      </button>

      <aside
        id={panelId}
        className="butterfly-drawer-panel"
        aria-label="Klopfübung"
        role={forced ? "dialog" : undefined}
        aria-modal={forced || undefined}
      >
        <div className="butterfly-drawer-head">
          <h2>Durch sanftes Klopfen Effekt verstärken</h2>
          {!forced && (
            <button ref={closeRef} type="button" className="butterfly-drawer-close" onClick={close} aria-label="Klopfübung schließen">
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <p>Wenn du möchtest, kannst du deine Power Story mit einer einfachen Klopfübung begleiten.</p>

        {/* Seitenverhältnis des Videos (748×556), damit nichts abgeschnitten wird. */}
        <div className="butterfly-drawer-video">
          <img src={BUTTERFLY_HUG_POSTER_URL} alt="" loading="lazy" />
          {isOpen && (
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
            />
          )}
        </div>

        <p className="butterfly-drawer-note">
          Du kannst die Augen schließen, wenn es sich angenehm anfühlt, und jederzeit mit dem Klopfen aufhören.
        </p>

        {forced && (
          <button ref={confirmRef} type="button" className="butterfly-drawer-confirm" onClick={onConfirm}>
            OK, Story starten
          </button>
        )}
      </aside>
    </div>
    </>
  );
}
