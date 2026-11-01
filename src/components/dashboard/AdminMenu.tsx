"use client";

/**
 * Admin-Werkzeuge als ein Knopf mit Menü statt einer eigenen Leiste über den
 * Storys. Nur für Admins und Musik-Admins sichtbar; mobil nur das Schild-Icon.
 */

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronDown, Headphones, Music, Shield, Volume2 } from "lucide-react";

export default function AdminMenu({
  isAdmin,
  isMusicAdmin,
  onCreateClientResource,
}: {
  isAdmin: boolean;
  isMusicAdmin: boolean;
  onCreateClientResource: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isAdmin && !isMusicAdmin) return null;

  const close = () => setOpen(false);

  return (
    <div className="dashboard-admin" ref={rootRef}>
      <button
        type="button"
        className="dashboard-admin-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Admin-Werkzeuge"
        onClick={() => setOpen((value) => !value)}
      >
        <Shield className="h-5 w-5" aria-hidden="true" />
        <span className="dashboard-admin-label">Admin</span>
        <ChevronDown className={`dashboard-admin-chevron h-4 w-4 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} role="menu" className="dashboard-admin-menu">
          {isMusicAdmin && (
            <Link href="/admin/music" role="menuitem" onClick={close}>
              <Music aria-hidden="true" /> Musik verwalten
            </Link>
          )}
          {isAdmin && (
            <>
              <Link href="/admin/kostprobe" role="menuitem" onClick={close}>
                <Headphones aria-hidden="true" /> Kostprobe
              </Link>
              <Link href="/admin/analytics" role="menuitem" onClick={close}>
                <BarChart3 aria-hidden="true" /> Admin Analytics
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onCreateClientResource();
                }}
              >
                <Volume2 aria-hidden="true" /> Manuelle Ressource erstellen (Audio)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
