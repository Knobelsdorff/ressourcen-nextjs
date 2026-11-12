"use client";

/**
 * Welche Story im Dashboard gerade "dran" ist (läuft oder zuletzt lief).
 * Startet eine andere Story, halten alle übrigen an – vorher konnten zwei
 * Storys gleichzeitig laufen. Nur die aktive Story zeigt die Mini-Leiste und
 * meldet sich am Sperrbildschirm an.
 */

import { useSyncExternalStore } from "react";

let activeId: string | null = null;
const listeners = new Set<() => void>();

export function getActiveStory(): string | null {
  return activeId;
}

export function setActiveStory(id: string | null) {
  if (activeId === id) return;
  activeId = id;
  listeners.forEach((listener) => listener());
}

export function useActiveStory(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => activeId,
    () => null
  );
}
