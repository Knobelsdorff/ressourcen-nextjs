#!/usr/bin/env node
/**
 * Legt in PostHog das Dashboard "Power Storys – Funnel & 7 Tage" mit allen
 * Auswertungen an (Funnel, Aktivierung, Retention, Bezahl-Conversion).
 *
 * Einmalig ausführen, sobald das PostHog-Projekt existiert:
 *
 *   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 node scripts/posthog/setup-dashboard.mjs
 *
 * Optional: POSTHOG_APP_HOST (Standard https://eu.posthog.com), --dry-run (nur anzeigen).
 * Der Personal API Key braucht die Scopes: dashboard:write, insight:write, project:read.
 *
 * Mehrfach ausführen ist ungefährlich: Vorhandene Auswertungen mit gleichem
 * Namen auf dem Dashboard werden übersprungen. Keine Abhängigkeiten (nur fetch).
 */

const HOST = (process.env.POSTHOG_APP_HOST || 'https://eu.posthog.com').replace(/\/+$/, '');
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID || '301863';
const DRY_RUN = process.argv.includes('--dry-run');

const DASHBOARD_NAME = 'Power Storys – Funnel & 7 Tage';
const DASHBOARD_DESCRIPTION =
  'Aktivierung, Retention und Bezahl-Conversion der Gratis-Story. Nur Verhaltensdaten – keine Antworten, Texte oder Audios. Events: src/lib/product-analytics/events.ts';

const ev = (event, name, properties) => ({ kind: 'EventsNode', event, name: event, custom_name: name, ...(properties ? { properties } : {}) });
const prop = (key, value, operator = 'exact') => ({ key, value, operator, type: 'event' });
const FREE_STORY = prop('access', ['trial', 'unsaved']);

const funnel = (series, { windowDays = 14, dateFrom = '-90d', exclusions = [] } = {}) => ({
  kind: 'InsightVizNode',
  source: {
    kind: 'FunnelsQuery',
    series,
    dateRange: { date_from: dateFrom },
    filterTestAccounts: true,
    funnelsFilter: {
      funnelVizType: 'steps',
      funnelOrderType: 'ordered',
      funnelWindowInterval: windowDays,
      funnelWindowIntervalUnit: 'day',
      exclusions,
    },
  },
});

const hogql = (query) => ({ kind: 'DataTableNode', source: { kind: 'HogQLQuery', query } });

/* ---------- 7-Tage-Übersicht: beantwortet alle Retention-Fragen in einer Tabelle ---------- */

const SEVEN_DAY_SUMMARY = `
SELECT
  count() AS hoerende_gratis_story,
  countIf(plays_7d = 1) AS nur_einmal_gehoert,
  countIf(plays_7d >= 2) AS in_7_tagen_wiedergekommen,
  countIf(has_replay) AS story_wiederholt,
  countIf(sub_after_play AND (NOT has_replay OR first_sub < first_replay)) AS abo_direkt_nach_erstem_hoeren,
  countIf(sub_after_play AND has_replay AND first_sub >= first_replay) AS abo_erst_nach_wiederholung,
  countIf(has_expired AND NOT has_sub) AS gratiszeit_abgelaufen_ohne_abo
FROM (
  SELECT
    person_id,
    groupArrayIf(timestamp, event = 'story_play_started' AND properties.access IN ('trial', 'unsaved')) AS plays,
    arrayMin(plays) AS first_play,
    arrayCount(t -> t <= first_play + INTERVAL 7 DAY, plays) AS plays_7d,
    countIf(event = 'story_replayed' AND properties.access IN ('trial', 'unsaved')) > 0 AS has_replay,
    minIf(timestamp, event = 'story_replayed' AND properties.access IN ('trial', 'unsaved')) AS first_replay,
    countIf(event = 'subscription_started') > 0 AS has_sub,
    minIf(timestamp, event = 'subscription_started') AS first_sub,
    has_sub AND first_sub >= first_play AS sub_after_play,
    countIf(event = 'free_access_expired') > 0 AS has_expired
  FROM events
  WHERE event IN ('story_play_started', 'story_replayed', 'subscription_started', 'free_access_expired')
    AND timestamp > now() - INTERVAL 120 DAY
  GROUP BY person_id
  HAVING length(plays) > 0 AND first_play > now() - INTERVAL 90 DAY
)`.trim();

const RETURN_DAY = `
SELECT
  dateDiff('day', first_play, replay) AS tag_nach_erstem_hoeren,
  count(DISTINCT person_id) AS personen
FROM (
  SELECT person_id, timestamp AS replay
  FROM events
  WHERE event = 'story_replayed' AND properties.access IN ('trial', 'unsaved') AND timestamp > now() - INTERVAL 90 DAY
) AS r
JOIN (
  SELECT person_id, min(timestamp) AS first_play
  FROM events
  WHERE event = 'story_play_started' AND properties.access IN ('trial', 'unsaved') AND timestamp > now() - INTERVAL 120 DAY
  GROUP BY person_id
) AS f ON r.person_id = f.person_id
GROUP BY tag_nach_erstem_hoeren
ORDER BY tag_nach_erstem_hoeren`.trim();

/* ---------- Auswertungen ---------- */

const INSIGHTS = [
  {
    name: '1 · Gesamt-Funnel: CTA → Abo',
    description: 'Der komplette Weg von der Landingpage bis zum Abo. Fenster 30 Tage (Gratiszeit 7 Tage + Entscheidung danach).',
    query: funnel(
      [
        ev('creation_cta_clicked', 'CTA geklickt'),
        ev('story_creation_started', 'Erstellung gestartet'),
        ev('personalization_completed', 'Fragen beantwortet'),
        ev('signup_completed', 'Account erstellt'),
        ev('story_generated', 'Story erstellt'),
        ev('story_play_started', 'Wiedergabe gestartet'),
        ev('story_play_completed', 'Zu Ende gehört'),
        ev('soft_paywall_viewed', 'Abo-Angebot gesehen'),
        ev('checkout_started', 'Checkout gestartet'),
        ev('subscription_started', 'Abo abgeschlossen'),
      ],
      { windowDays: 30 }
    ),
  },
  {
    name: '2 · Aktivierung: Fragen → zu Ende gehört',
    description: 'Wie viele, die mit den Fragen beginnen, ihre Story bis zum Ende hören (7 Tage).',
    query: funnel(
      [
        ev('story_creation_started', 'Erstellung gestartet'),
        ev('personalization_completed', 'Fragen beantwortet'),
        ev('signup_viewed', 'Konto-Schritt gesehen'),
        ev('signup_completed', 'Account erstellt'),
        ev('story_generated', 'Story erstellt'),
        ev('story_play_started', 'Wiedergabe gestartet'),
        ev('story_play_completed', 'Zu Ende gehört'),
      ],
      { windowDays: 7 }
    ),
  },
  {
    name: '3 · Abbruch je Frage',
    description: 'An welcher der Fragen Menschen aussteigen (nur die Nummer der Frage, keine Antworten).',
    query: funnel(
      [1, 2, 3, 4, 5, 6].map((n) => ev('personalization_question_completed', `Frage ${n}`, [prop('question_number', n)])),
      { windowDays: 1 }
    ),
  },
  {
    name: '4 · 7-Tage-Übersicht der Gratis-Story',
    description:
      'Pro Person ab dem ersten Hören: nur einmal gehört, in 7 Tagen wiedergekommen, Story wiederholt, Abo direkt nach dem ersten Hören vs. erst nach Wiederholung, Gratiszeit ohne Abo abgelaufen. Letzte 90 Tage.',
    query: hogql(SEVEN_DAY_SUMMARY),
  },
  {
    name: '5 · Retention: Wiederkommen Tag 0–7',
    description: 'Anteil derer, die nach dem ersten Hören an Tag 1…7 wieder hören.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'RetentionQuery',
        dateRange: { date_from: '-90d' },
        filterTestAccounts: true,
        retentionFilter: {
          period: 'Day',
          totalIntervals: 8,
          retentionType: 'retention_first_time',
          targetEntity: { id: 'story_play_started', name: 'story_play_started', type: 'events', kind: 'EventsNode', properties: [FREE_STORY] },
          returningEntity: { id: 'story_play_started', name: 'story_play_started', type: 'events', kind: 'EventsNode', properties: [FREE_STORY] },
        },
      },
    },
  },
  {
    name: '6 · An welchem Tag wird wiederholt?',
    description: 'Erneutes Hören der Gratis-Story nach Tagen seit dem ersten Hören.',
    query: hogql(RETURN_DAY),
  },
  {
    name: '7 · Abo direkt nach dem ersten Hören',
    description: 'Zu Ende gehört → Abo, ohne dass die Story dazwischen wiederholt wurde.',
    query: funnel([ev('story_play_completed', 'Zu Ende gehört', [FREE_STORY]), ev('subscription_started', 'Abo abgeschlossen')], {
      windowDays: 30,
      exclusions: [{ kind: 'EventsNode', event: 'story_replayed', name: 'story_replayed', funnelFromStep: 0, funnelToStep: 1 }],
    }),
  },
  {
    name: '8 · Abo nach Wiederholung',
    description: 'Story erneut gehört → Abo.',
    query: funnel([ev('story_replayed', 'Story wiederholt', [FREE_STORY]), ev('subscription_started', 'Abo abgeschlossen')], { windowDays: 30 }),
  },
  {
    name: '9 · Bezahl-Conversion: Angebot → Abo',
    description: 'Vom Abo-Angebot (nach dem ersten Hören oder bei gesperrter Story) bis zum Abschluss.',
    query: funnel(
      [
        ev('soft_paywall_viewed', 'Abo-Angebot gesehen'),
        ev('subscription_cta_clicked', 'Abo-Button geklickt'),
        ev('checkout_started', 'Checkout gestartet'),
        ev('subscription_started', 'Abo abgeschlossen'),
      ],
      { windowDays: 14 }
    ),
  },
  {
    name: '10 · Gratiszeit abgelaufen ohne Abo (pro Woche)',
    description: 'Personen, deren 7 kostenlose Tage endeten, ohne dass ein Abo besteht.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{ ...ev('free_access_expired', 'Gratiszeit abgelaufen'), math: 'dau' }],
        interval: 'week',
        dateRange: { date_from: '-90d' },
        filterTestAccounts: true,
        trendsFilter: { display: 'ActionsBar' },
      },
    },
  },
  {
    name: '11 · Woher kommen die Klicks? (CTA nach Ort)',
    description: 'creation_cta_clicked nach Position auf der Landingpage.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [{ ...ev('creation_cta_clicked', 'CTA geklickt'), math: 'dau' }],
        interval: 'week',
        dateRange: { date_from: '-30d' },
        filterTestAccounts: true,
        breakdownFilter: { breakdown: 'location', breakdown_type: 'event' },
        trendsFilter: { display: 'ActionsBarValue' },
      },
    },
  },
];

/* ---------- API ---------- */

async function api(method, path, body) {
  const response = await fetch(`${HOST}/api/projects/${PROJECT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  if (DRY_RUN) {
    console.log(JSON.stringify({ dashboard: DASHBOARD_NAME, insights: INSIGHTS }, null, 2));
    return;
  }
  if (!KEY || !PROJECT) {
    console.error('POSTHOG_PERSONAL_API_KEY und POSTHOG_PROJECT_ID setzen (siehe Kopf dieser Datei).');
    process.exit(1);
  }

  const dashboards = await api('GET', `/dashboards/?search=${encodeURIComponent(DASHBOARD_NAME)}`);
  let dashboard = dashboards.results?.find((d) => d.name === DASHBOARD_NAME && !d.deleted);
  if (!dashboard) {
    dashboard = await api('POST', '/dashboards/', { name: DASHBOARD_NAME, description: DASHBOARD_DESCRIPTION, pinned: true });
    console.log('Dashboard angelegt:', dashboard.id);
  } else {
    console.log('Dashboard vorhanden:', dashboard.id);
  }

  const detail = await api('GET', `/dashboards/${dashboard.id}/`);
  const existing = new Set((detail.tiles ?? []).map((tile) => tile.insight?.name).filter(Boolean));

  for (const insight of INSIGHTS) {
    if (existing.has(insight.name)) {
      console.log('  übersprungen (vorhanden):', insight.name);
      continue;
    }
    await api('POST', '/insights/', { ...insight, dashboards: [dashboard.id], saved: true });
    console.log('  angelegt:', insight.name);
  }

  console.log(`\nFertig: ${HOST}/project/${PROJECT}/dashboard/${dashboard.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
