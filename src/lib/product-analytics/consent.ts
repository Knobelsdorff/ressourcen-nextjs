/**
 * Einwilligung in Produkt-Analyse (PostHog, Google Analytics).
 *
 * Gespeichert als Cookie, damit auch der Server sie lesen kann (z.B. beim
 * Start des Stripe-Checkouts). Ohne Entscheidung gilt: keine Analyse.
 * Die Wahl gilt 12 Monate, danach wird erneut gefragt.
 */

export const CONSENT_COOKIE = 'ps_consent';
export const CONSENT_MAX_AGE_DAYS = 365;

export type ConsentState = 'granted' | 'denied';

const CHANGE_EVENT = 'ps-consent-change';
const OPEN_EVENT = 'ps-consent-open';

export function parseConsent(value: string | null | undefined): ConsentState | null {
  return value === 'granted' || value === 'denied' ? value : null;
}

/* ---------- Browser ---------- */

export function readConsent(): ConsentState | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`));
  return parseConsent(match ? decodeURIComponent(match[1]) : null);
}

export function writeConsent(state: ConsentState) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${state}; Max-Age=${CONSENT_MAX_AGE_DAYS * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent<ConsentState>(CHANGE_EVENT, { detail: state }));
}

export function onConsentChange(listener: (state: ConsentState) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ConsentState>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/** Öffnet die Einstellungen erneut (Link im Footer). */
export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentSettingsOpen(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}
