"use client";

import { useEffect, useRef, useState } from "react";
import { type ConsentState, onConsentSettingsOpen } from "@/lib/product-analytics/consent";
import "./consent-banner.css";

interface ConsentBannerProps {
  /** Aktuelle Wahl – null = noch keine Entscheidung (Banner erscheint). */
  consent: ConsentState | null;
  onChoose: (state: ConsentState) => void;
  /** Google Analytics ist eingebunden – dann wird es im Text genannt. */
  withGoogleAnalytics: boolean;
}

/**
 * Einwilligung für Analyse. Nicht blockierend, "Ablehnen" gleichwertig zu
 * "Einverstanden" (Vorgabe der Datenschutzbehörden). Über den Footer-Link
 * "Cookie-Einstellungen" jederzeit wieder erreichbar.
 */
export default function ConsentBanner({ consent, onChoose, withGoogleAnalytics }: ConsentBannerProps) {
  const [reopened, setReopened] = useState(false);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => onConsentSettingsOpen(() => setReopened(true)), []);

  useEffect(() => {
    if (reopened) firstButtonRef.current?.focus();
  }, [reopened]);

  if (consent && !reopened) return null;

  const choose = (state: ConsentState) => {
    setReopened(false);
    onChoose(state);
  };

  const tools = withGoogleAnalytics ? "PostHog (Server in der EU) und Google Analytics" : "PostHog (Server in der EU)";

  return (
    <section className="consent-banner" role="region" aria-labelledby="consent-banner-title" aria-describedby="consent-banner-text">
      <h2 id="consent-banner-title">Hilfst du uns, Power Storys besser zu machen?</h2>
      <p id="consent-banner-text">
        Mit deiner Erlaubnis messen wir mit {tools}, welche Schritte beim Erstellen erreicht werden – nie deine Antworten,
        Texte oder Geschichten. Dafür speichern wir eine zufällige Kennung in deinem Browser.{" "}
        <a href="/Datenschutz">Mehr dazu</a>
      </p>
      {consent && (
        <p className="consent-banner-current">
          Aktuell: {consent === "granted" ? "Messung erlaubt" : "Messung abgelehnt"}. Du kannst das jederzeit ändern.
        </p>
      )}
      <div className="consent-banner-actions">
        <button ref={firstButtonRef} type="button" onClick={() => choose("denied")}>Ablehnen</button>
        <button type="button" onClick={() => choose("granted")}>Einverstanden</button>
      </div>
    </section>
  );
}
