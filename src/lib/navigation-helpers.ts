"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * Zentrale Funktion für den Start-Flow (gleiche Logik wie primärer CTA)
 * Wenn User eingeloggt → Route zu "/" (Ressourcen-App)
 * Wenn nicht eingeloggt → öffnet AuthModal (wird von Komponente gehandhabt)
 */
export function useStartFlow() {
  const router = useRouter();
  const { user } = useAuth();

  const handleStartFlow = () => {
    if (user) {
      router.push("/");
    }
    // Wenn nicht eingeloggt, sollte die aufrufende Komponente das AuthModal öffnen
    return !user; // Gibt zurück, ob Modal geöffnet werden soll
  };

  return { handleStartFlow, user };
}

/**
 * Zentrale Funktion für Smooth-Scroll zu Anker
 */
export function scrollToAnchor(anchorId: string) {
  if (typeof window === "undefined") return;

  const element = document.getElementById(anchorId);
  if (!element) {
    console.warn(`Element with id "${anchorId}" not found`);
    return;
  }

  // Berechne Offset für sticky Header (ca. 80px auf Desktop)
  const headerOffset = window.innerWidth >= 1024 ? 80 : 0;
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

