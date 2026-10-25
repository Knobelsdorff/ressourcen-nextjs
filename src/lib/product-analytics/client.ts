/**
 * PostHog im Browser – Funnel-Analyse mit Datenschutz als Voreinstellung.
 *
 * - EU-Cloud (Frankfurt), Anfragen laufen über /ingest auf unserer eigenen
 *   Domain (Rewrite in next.config.ts). PostHog sieht dadurch nicht die IP der
 *   Person, sondern die von Vercel.
 * - Erst nach Einwilligung (Cookie-Banner) wird gesendet oder etwas im Browser
 *   gespeichert. Ohne Projekt-Schlüssel passiert gar nichts.
 * - Kein Autocapture (Klicks würden Antworttexte der Fragen mitsenden), keine
 *   Session-Aufzeichnung, keine Heatmaps, keine Umfragen, keine nachgeladenen
 *   Skripte. Gesendet werden nur Seitenaufrufe und die Events aus ./events.ts.
 * - URLs werden vor dem Senden bereinigt: ohne #Fragment, ohne Tokens und
 *   unbekannte Parameter.
 */

import posthog from 'posthog-js';
import { type FunnelEvent, type FunnelEventProps, sanitizeEventProps } from './events';
import { type ConsentState, readConsent } from './consent';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const API_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest';
const UI_HOST = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://eu.posthog.com';
/**
 * Optional: Wer ablehnt, wird trotzdem cookielos gezählt (Hash auf dem
 * PostHog-Server, nichts im Browser). Rechtlich nicht eindeutig – nur nach
 * Freigabe durch Datenschutz-Beratung einschalten (NEXT_PUBLIC_POSTHOG_COOKIELESS=on_reject)
 * und dann in PostHog "Cookieless server hash mode" aktivieren.
 */
const COOKIELESS = process.env.NEXT_PUBLIC_POSTHOG_COOKIELESS === 'on_reject' ? 'on_reject' : undefined;

/** Diese Query-Parameter sind harmlos und für die Auswertung nützlich – alle anderen fallen weg. */
const KEPT_QUERY_PARAMS = new Set([
  'first', 'figure', 'welcome', 'payment', 'confirmed', 'linkError', 'fehler',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
]);

/** Pfade, die einen geheimen Token enthalten. */
const TOKEN_PATHS = /^\/(willkommen|zugang|auth\/confirm)\/[^/]+/;

let initialized = false;

function sanitizePath(path: string): string {
  return path.replace(TOKEN_PATHS, (_match, base) => `/${base}/:token`);
}

export function sanitizeUrl(value: string): string {
  try {
    const isAbsolute = /^https?:\/\//i.test(value);
    const url = new URL(value, isAbsolute ? undefined : window.location.origin);
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (!KEPT_QUERY_PARAMS.has(key)) url.searchParams.delete(key);
    }
    url.pathname = sanitizePath(url.pathname);
    return isAbsolute ? url.toString() : `${url.pathname}${url.search}`;
  } catch {
    return '';
  }
}

const URL_PROPERTY = /url|referrer|pathname/i;

function sanitizeUrlProps(props: Record<string, unknown> | undefined) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && URL_PROPERTY.test(key) && value !== '$direct') {
      props[key] = key.toLowerCase().includes('pathname') ? sanitizePath(value.split(/[?#]/)[0]) : sanitizeUrl(value);
    }
  }
}

export function isAnalyticsConfigured(): boolean {
  return !!KEY;
}

/** Einmal beim Laden der App (src/instrumentation-client.ts). */
export function initProductAnalytics() {
  if (initialized || !KEY || typeof window === 'undefined') return;
  initialized = true;

  posthog.init(KEY, {
    api_host: API_HOST,
    ui_host: UI_HOST,
    defaults: '2026-08-30',
    person_profiles: 'identified_only',

    // Einwilligung zuerst: ohne Zustimmung weder senden noch speichern.
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    opt_out_capturing_persistence_type: 'cookie',
    consent_persistence_name: 'ps_posthog_optin',
    cookieless_mode: COOKIELESS,
    respect_dnt: true,

    // Nur Seitenaufrufe und eigene Events.
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    mask_personal_data_properties: true,
    custom_personal_data_properties: ['email', 'token', 'code', 'key', 'session_id', 'access_token', 'refresh_token', 'resource'],

    before_send: (event) => {
      if (!event) return event;
      sanitizeUrlProps(event.properties);
      sanitizeUrlProps(event.$set as Record<string, unknown> | undefined);
      sanitizeUrlProps(event.$set_once as Record<string, unknown> | undefined);
      return event;
    },
  });

  applyConsent(readConsent(), { capturePageview: false });
}

/** Einwilligung auf PostHog anwenden. Ohne Entscheidung bleibt alles aus. */
export function applyConsent(state: ConsentState | null, { capturePageview = true } = {}) {
  if (!initialized) return;
  if (state === 'granted') {
    if (posthog.has_opted_in_capturing()) return;
    posthog.opt_in_capturing({ captureEventName: null });
    // Der aktuelle Seitenaufruf lief vor der Zustimmung – jetzt nachholen.
    if (capturePageview) posthog.capture('$pageview');
  } else if (state === 'denied') {
    posthog.opt_out_capturing();
  }
}

function capturing(): boolean {
  return initialized && posthog.has_opted_in_capturing();
}

export function track<E extends FunnelEvent>(event: E, props: FunnelEventProps[E], options?: { $set?: Record<string, string | number | boolean>; beacon?: boolean }) {
  if (!capturing()) return;
  posthog.capture(event, sanitizeEventProps(event, props), {
    ...(options?.$set ? { $set: options.$set } : {}),
    ...(options?.beacon ? { transport: 'sendBeacon' as const } : {}),
  });
}

/** Verknüpft das Gerät mit dem Account – nur über die Supabase-ID, nie über E-Mail oder Name. */
export function identifyUser(userId: string, personProps: Record<string, string | number | boolean>) {
  if (!capturing() || posthog.get_distinct_id() === userId) return;
  posthog.identify(userId, personProps);
}

/** Nach dem Abmelden: neue anonyme Kennung, Einwilligung bleibt bestehen. */
export function resetIdentity() {
  if (!initialized) return;
  const consent = readConsent();
  posthog.reset();
  // reset() löscht auch die gespeicherte Zustimmung – wieder anwenden.
  if (consent === 'granted') posthog.opt_in_capturing({ captureEventName: null });
}

/**
 * Kennung dieses Geräts für Server-Events (Engel-Flow). Null ohne Einwilligung –
 * dann sendet auch der Server nichts zu diesem Ablauf.
 */
export function getAnalyticsId(): string | null {
  return capturing() ? posthog.get_distinct_id() : null;
}

/** Nur für Analyse-Speicher im Browser (z.B. Wiedergabe-Historie): ohne Einwilligung nichts speichern. */
export function analyticsStorageAllowed(): boolean {
  return capturing();
}
