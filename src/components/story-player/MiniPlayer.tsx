"use client";

/**
 * Mini-Leiste unten im Dashboard: Die Story läuft weiter, während man durch
 * die eigenen Storys scrollt. Tippen öffnet den Vollbild-Player wieder,
 * ✕ hält an und blendet die Leiste aus.
 *
 * Per Portal im <body> (der Dashboard-Inhalt ist animiert – darin würde
 * position: fixed nicht am Bildschirm kleben). Solange sie sichtbar ist,
 * bekommt das Dashboard unten Platz (html[data-sp-mini]), damit nichts verdeckt wird.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Pause, Play, X } from "lucide-react";
import { TAPPING_POSTER_URL } from "./TappingVideo";
import "./story-player.css";
import { useTextFn } from "@/components/site-text/T";
import { player } from "@/content/texts/player";

interface MiniPlayerProps {
  title: string;
  subtitle?: string | null;
  playing: boolean;
  progress: number; // 0..1
  onToggle: () => void;
  onOpen: () => void;
  onDismiss: () => void;
}

export default function MiniPlayer({ title, subtitle, playing, progress, onToggle, onOpen, onDismiss }: MiniPlayerProps) {
  const [mounted, setMounted] = useState(false);
  const tx = useTextFn();
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.setAttribute("data-sp-mini", "");
    return () => document.documentElement.removeAttribute("data-sp-mini");
  }, []);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      className="sp-mini sp-root"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      role="region"
      aria-label={tx(player["mini.region"])}
    >
      <button type="button" className="sp-mini-open" onClick={onOpen} aria-label={tx(player["mini.open"], { title })}>
        <img src={TAPPING_POSTER_URL} alt="" />
        <span>
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </span>
      </button>
      <button type="button" className="sp-mini-btn" onClick={onToggle} aria-label={tx(playing ? player["controls.pause"] : player["controls.play"])}>
        {playing
          ? <Pause size={24} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          : <Play size={24} fill="currentColor" strokeWidth={0} className="sp-play-icon" aria-hidden="true" />}
      </button>
      <button type="button" className="sp-mini-btn sp-mini-btn--close" onClick={onDismiss} aria-label={tx(player["mini.dismiss"])}>
        <X size={18} aria-hidden="true" />
      </button>
      <span className="sp-mini-progress" style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }} aria-hidden="true" />
    </motion.div>,
    document.body
  );
}
