"use client";

import { useEffect, useRef, useState } from "react";
import { type ConsentState, onConsentSettingsOpen } from "@/lib/product-analytics/consent";
import { T, useTextFn } from "@/components/site-text/T";
import { common } from "@/content/texts/common";
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
  const tx = useTextFn();
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

  const tools = tx(withGoogleAnalytics ? common["consent.toolsWithGa"] : common["consent.toolsPosthog"]);

  return (
    <section className="consent-banner" role="region" aria-labelledby="consent-banner-title" aria-describedby="consent-banner-text">
      <h2 id="consent-banner-title"><T t={common["consent.title"]} /></h2>
      <p id="consent-banner-text">
        <T t={common["consent.text"]} vars={{ tools }} />
      </p>
      {consent && (
        <p className="consent-banner-current">
          <T t={consent === "granted" ? common["consent.currentGranted"] : common["consent.currentDenied"]} />
        </p>
      )}
      <div className="consent-banner-actions">
        <button ref={firstButtonRef} type="button" onClick={() => choose("denied")}><T t={common["consent.deny"]} /></button>
        <button type="button" onClick={() => choose("granted")}><T t={common["consent.accept"]} /></button>
      </div>
    </section>
  );
}
