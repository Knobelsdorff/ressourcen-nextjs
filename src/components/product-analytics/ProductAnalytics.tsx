"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { useAuth } from "@/components/providers/auth-provider";
import { type ConsentState, onConsentChange, readConsent, writeConsent } from "@/lib/product-analytics/consent";
import { analyticsStorageAllowed, applyConsent, identifyUser, isAnalyticsConfigured, resetIdentity, track } from "@/lib/product-analytics/client";
import ConsentBanner from "./ConsentBanner";

/** Neue Accounts: signup_completed, solange der Account jünger als das hier ist. */
const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;

function removeGoogleAnalyticsCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name.startsWith("_ga")) continue;
    const domains = ["", window.location.hostname, `.${window.location.hostname.replace(/^www\./, "")}`];
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

/**
 * Verbindet Einwilligung, Login und PostHog. Einmal im Root-Layout.
 *
 * - Banner und Google Analytics (nur mit Einwilligung)
 * - identify/reset bei Login/Logout (nur die Supabase-ID)
 * - Einwilligung zusätzlich am Account speichern, damit Server-Events ohne
 *   Request (Stripe-Webhook, Cron) sie kennen
 * - signup_completed für neue Accounts (serverseitig, idempotent)
 * - Klicks auf Elemente mit data-analytics-cta="<ort>" → creation_cta_clicked
 */
export default function ProductAnalytics({ gaId }: { gaId?: string }) {
  const { user } = useAuth();
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [mounted, setMounted] = useState(false);
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    setMounted(true);
    return onConsentChange((state) => {
      setConsent(state);
      applyConsent(state);
      if (state === "denied") removeGoogleAnalyticsCookies();
    });
  }, []);

  const choose = useCallback((state: ConsentState) => writeConsent(state), []);

  // Login / Logout
  useEffect(() => {
    if (!user) {
      if (identifiedRef.current) resetIdentity();
      identifiedRef.current = null;
      return;
    }
    if (consent !== "granted" || identifiedRef.current === user.id) return;
    identifiedRef.current = user.id;
    identifyUser(user.id, {
      signup_method: String(user.user_metadata?.signup_method || user.app_metadata?.provider || "email"),
    });
  }, [user, consent]);

  // Einwilligung am Account speichern (einmal pro Sitzung und Wahl).
  useEffect(() => {
    if (!user || !consent || user.app_metadata?.analytics_consent === consent) return;
    const key = `ps_consent_synced_${user.id}_${consent}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch { /* ohne Speicher wird höchstens doppelt gesendet */ }
    void fetch("/api/analytics/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: consent }),
    }).catch(() => {});
  }, [user, consent]);

  // Neuer Account → signup_completed (der Server prüft Alter und Einwilligung).
  useEffect(() => {
    if (!user || consent !== "granted" || !analyticsStorageAllowed()) return;
    const createdAt = new Date(user.created_at).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > NEW_ACCOUNT_WINDOW_MS) return;
    const key = `ps_signup_tracked_${user.id}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch { /* der Server entdoppelt ohnehin */ }
    void fetch("/api/analytics/signup", { method: "POST" }).catch(() => {});
  }, [user, consent]);

  // Haupt-CTAs der Landingpage: data-analytics-cta="hero" usw.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest?.("[data-analytics-cta]");
      const location = target?.getAttribute("data-analytics-cta");
      if (location) track("creation_cta_clicked", { location }, { beacon: true });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!mounted) return null;
  const hasTools = isAnalyticsConfigured() || !!gaId;

  return (
    <>
      {hasTools && <ConsentBanner consent={consent} onChoose={choose} withGoogleAnalytics={!!gaId} />}
      {gaId && consent === "granted" && <GoogleAnalytics gaId={gaId} />}
    </>
  );
}
