/**
 * PostHog-Events vom Server – für Schritte, die nicht im Browser passieren
 * (Engel-Story wird erzeugt, E-Mail-Link, Stripe, Ablauf der Gratis-Tage).
 *
 * Läuft in Node und Edge (nur fetch + Web Crypto, keine Abhängigkeit).
 * Gesendet wird nur mit Einwilligung:
 *   - im Request: Cookie ps_consent=granted
 *   - ohne Request (Webhook, Cron): app_metadata.analytics_consent des Accounts,
 *     gesetzt über /api/analytics/consent
 *   - Engel-Flow: first_story_drafts.analytics_id (nur mit Einwilligung gesetzt)
 * Fehler beim Senden werden geschluckt – Analyse darf nie einen Ablauf stören.
 */

import { type FunnelEvent, type FunnelEventProps, safeValue, sanitizeEventProps } from './events';
import { CONSENT_COOKIE, parseConsent } from './consent';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
/** Server sendet direkt an die EU-Cloud (kein Umweg über /ingest). */
const HOST = (process.env.POSTHOG_HOST || 'https://eu.i.posthog.com').replace(/\/+$/, '');

const ANALYTICS_ID = /^[A-Za-z0-9_.:-]{1,200}$/;

export function isServerAnalyticsConfigured(): boolean {
  return !!KEY;
}

/** Prüft eine Kennung aus dem Browser (posthog.get_distinct_id()). */
export function validAnalyticsId(value: unknown): string | null {
  return typeof value === 'string' && ANALYTICS_ID.test(value) ? value : null;
}

/** Einwilligung aus dem Cookie des Requests. */
export function requestHasConsent(request: { cookies: { get(name: string): { value: string } | undefined } }): boolean {
  return parseConsent(request.cookies.get(CONSENT_COOKIE)?.value) === 'granted';
}

/** Einwilligung, die am Account gespeichert ist. */
export function userHasConsent(user: { app_metadata?: Record<string, unknown> | null } | null | undefined): boolean {
  return user?.app_metadata?.analytics_consent === 'granted';
}

/** Einwilligung eines Accounts ohne Request (Webhook, Cron) – über die Auth-Admin-API. */
export async function userIdHasConsent(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PRIVATE_SUPABASE_SERVICE_KEY;
  if (!KEY || !url || !serviceKey) return false;
  try {
    const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return false;
    return userHasConsent(await response.json());
  } catch {
    return false;
  }
}

/**
 * Stabile UUID aus einem Schlüssel. PostHog verwirft Events mit gleicher UUID,
 * gleichem Namen, gleicher distinct_id und gleichem Tag – so zählen doppelte
 * Webhooks oder wiederholte Cron-Läufe nur einmal.
 */
async function stableUuid(seed: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // Version 5 (namensbasiert)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function send(body: Record<string, unknown>) {
  if (!KEY) return;
  try {
    const response = await fetch(`${HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KEY, ...body }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) console.warn('[ProductAnalytics] PostHog antwortete', response.status);
  } catch (e) {
    console.warn('[ProductAnalytics] Event nicht gesendet:', e instanceof Error ? e.message : e);
  }
}

interface ServerEventOptions {
  /** Supabase-User-ID oder die Geräte-Kennung aus dem Browser. */
  distinctId: string;
  /** Zeitpunkt des eigentlichen Ereignisses (Standard: jetzt). */
  timestamp?: Date | string;
  /** Macht das Event idempotent, z.B. "subscription_started:<checkout-session>". */
  dedupeKey?: string;
  /** Personen-Eigenschaften (nur sichere Werte). */
  $set?: Record<string, string | number | boolean>;
}

export async function captureServerEvent<E extends FunnelEvent>(
  event: E,
  props: FunnelEventProps[E],
  { distinctId, timestamp, dedupeKey, $set }: ServerEventOptions
): Promise<void> {
  if (!KEY || !validAnalyticsId(distinctId)) return;
  const properties: Record<string, unknown> = { ...sanitizeEventProps(event, props), $lib: 'power-storys-server' };
  if ($set) {
    const safeSet: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries($set)) {
      const safe = safeValue(value);
      if (safe !== undefined) safeSet[key] = safe;
    }
    properties.$set = safeSet;
  }
  await send({
    event,
    distinct_id: distinctId,
    properties,
    timestamp: (timestamp ? new Date(timestamp) : new Date()).toISOString(),
    ...(dedupeKey ? { uuid: await stableUuid(dedupeKey) } : {}),
  });
}

/**
 * Führt die anonyme Geräte-Kennung mit dem Account zusammen – z.B. wenn der
 * E-Mail-Link auf einem anderen Gerät geöffnet wird als dem, auf dem die
 * Fragen beantwortet wurden.
 */
export async function identifyServer(userId: string, anonymousId: string | null, $set?: Record<string, string | number | boolean>) {
  if (!KEY || !validAnalyticsId(userId)) return;
  const anon = validAnalyticsId(anonymousId);
  await send({
    event: '$identify',
    distinct_id: userId,
    properties: {
      ...(anon && anon !== userId ? { $anon_distinct_id: anon } : {}),
      ...($set ? { $set } : {}),
      $lib: 'power-storys-server',
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Abo abgeschlossen (Stripe-Webhook). Es gibt mehrere Webhook-Routen – die
 * feste UUID aus der Checkout-Session sorgt dafür, dass es einmal zählt.
 */
export async function trackSubscriptionStarted(userId: string, checkoutSessionId: string, occurredAt: Date) {
  if (!KEY || !(await userIdHasConsent(userId))) return;
  await captureServerEvent('subscription_started', { plan: 'subscription' }, {
    distinctId: userId,
    timestamp: occurredAt,
    dedupeKey: `subscription_started:${checkoutSessionId}`,
    $set: { subscribed: true },
  });
}
