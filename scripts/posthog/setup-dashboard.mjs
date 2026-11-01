#!/usr/bin/env node
/**
 * Legt in PostHog das Dashboard "Power Storys – Funnel & 7 Tage" mit allen
 * Auswertungen an (Funnel, Aktivierung, Retention, Bezahl-Conversion).
 *
 * Ausführen, sobald das PostHog-Projekt existiert (und nach Änderungen hier):
 *
 *   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 node scripts/posthog/setup-dashboard.mjs
 *
 * Optional: POSTHOG_APP_HOST (Standard https://eu.posthog.com),
 *   --dry-run  nur anzeigen, nichts senden
 *   --check    jede Abfrage einmal in PostHog ausführen, nichts speichern
 *   --include-test  Test-Accounts/localhost mitzählen (nur für das Test-Projekt)
 * Der Personal API Key braucht die Scopes: dashboard:write, insight:write, query:read, project:read.
 *
 * Mehrfach ausführen ist ungefährlich. Geändert wird nur DIESES Dashboard:
 * Auswertungen auf ihm mit gleichem Namen werden aktualisiert, fehlende
 * angelegt, danach wird die Anordnung gesetzt. Vor dem Speichern läuft jede
 * Abfrage einmal zur Probe – eine fehlerhafte wird nicht gespeichert.
 * Keine Abhängigkeiten (nur fetch).
 */

const HOST = (process.env.POSTHOG_APP_HOST || 'https://eu.posthog.com').replace(/\/+$/, '');
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID || '301863';
const DRY_RUN = process.argv.includes('--dry-run');
const CHECK_ONLY = process.argv.includes('--check');
// Für das Test-Projekt: dort IST alles localhost/Test – ohne diesen Schalter bliebe es leer.
const FILTER_TEST_ACCOUNTS = !process.argv.includes('--include-test');

const DASHBOARD_NAME = 'Power Storys – Funnel & 7 Tage';
const DASHBOARD_DESCRIPTION =
  'Aktivierung, Retention und Bezahl-Conversion der Gratis-Story. Nur Verhaltensdaten – keine Antworten, Texte oder Audios. Events: src/lib/product-analytics/events.ts';

const ev = (event, name, properties) => ({ kind: 'EventsNode', event, name: event, custom_name: name, ...(properties ? { properties } : {}) });
const prop = (key, value, operator = 'exact') => ({ key, value, operator, type: 'event' });
const FREE_STORY = prop('access', ['trial', 'unsaved']);

// Waagerechte Balken: Bei bis zu 10 Schritten bleiben die Namen lesbar.
const funnel = (series, { windowDays = 14, dateFrom = '-90d', exclusions = [], layout = 'horizontal' } = {}) => ({
  kind: 'InsightVizNode',
  source: {
    kind: 'FunnelsQuery',
    series,
    dateRange: { date_from: dateFrom },
    filterTestAccounts: FILTER_TEST_ACCOUNTS,
    funnelsFilter: {
      funnelVizType: 'steps',
      funnelOrderType: 'ordered',
      funnelWindowInterval: windowDays,
      funnelWindowIntervalUnit: 'day',
      layout,
      exclusions,
    },
  },
});

// SQL-Auswertungen. {filters} blendet – wie bei den Funnels – Test-Accounts
// und localhost aus (filterTestAccounts), sonst zählen Entwickler-Klicks mit.
const sql = (query, display = 'ActionsTable', chartSettings) => ({
  kind: 'DataVisualizationNode',
  source: { kind: 'HogQLQuery', query, filters: { filterTestAccounts: FILTER_TEST_ACCOUNTS } },
  display,
  ...(chartSettings ? { chartSettings } : {}),
});
const kpi = (query, column) =>
  sql(query, 'BoldNumber', { yAxis: [{ column, settings: { formatting: { suffix: ' %', decimalPlaces: 1 } } }] });

/* ---------- Pro Person: erste Gratis-Story-Wiedergabe und was danach passiert ---------- */

// Basis für 7-Tage-Übersicht und Kennzahlen (eine Zeile pro Person).
const FREE_LISTENERS = `
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
    AND {filters}
  GROUP BY person_id
  HAVING length(plays) > 0 AND first_play > now() - INTERVAL 90 DAY`;

/* ---------- 7-Tage-Übersicht: alle Retention-Fragen als Liste mit Anteil ---------- */

const SEVEN_DAY_SUMMARY = `
SELECT
  ['Gratis-Story gehört', 'Nur einmal gehört', 'In 7 Tagen wiedergekommen', 'Story wiederholt',
   'Abo direkt nach dem ersten Hören', 'Abo erst nach Wiederholung', 'Gratiszeit abgelaufen ohne Abo'][i] AS Kennzahl,
  [gesamt, einmal, wiedergekommen, wiederholt, abo_direkt, abo_nach_wiederholung, abgelaufen][i] AS Personen,
  round(100 * Personen / greatest(gesamt, 1), 1) AS Anteil_Prozent
FROM (
  SELECT
    count() AS gesamt,
    countIf(plays_7d = 1) AS einmal,
    countIf(plays_7d >= 2) AS wiedergekommen,
    countIf(has_replay) AS wiederholt,
    countIf(sub_after_play AND (NOT has_replay OR first_sub < first_replay)) AS abo_direkt,
    countIf(sub_after_play AND has_replay AND first_sub >= first_replay) AS abo_nach_wiederholung,
    countIf(has_expired AND NOT has_sub) AS abgelaufen
  FROM (${FREE_LISTENERS})
)
ARRAY JOIN [1, 2, 3, 4, 5, 6, 7] AS i
ORDER BY i`.trim();

/* ---------- Tag der Wiederholung ----------
   Früher ein JOIN zweier Unterabfragen, die beide person_id liefern – das
   unqualifizierte person_id im count() war mehrdeutig, die Kachel brach ab.
   Jetzt eine Zeile pro Person wie in der 7-Tage-Übersicht, ohne JOIN. */

const RETURN_DAY = `
SELECT
  if(tag_nr >= 8, 'Tag 8+', concat('Tag ', toString(tag_nr))) AS Tag,
  count(DISTINCT person_id) AS Personen
FROM (
  SELECT
    person_id,
    arrayJoin(arrayDistinct(arrayMap(t -> dateDiff('day', first_play, t), replays))) AS tag_nr
  FROM (
    SELECT
      person_id,
      minIf(timestamp, event = 'story_play_started') AS first_play,
      groupArrayIf(timestamp, event = 'story_replayed') AS replays
    FROM events
    WHERE event IN ('story_play_started', 'story_replayed')
      AND properties.access IN ('trial', 'unsaved')
      AND timestamp > now() - INTERVAL 120 DAY
      AND {filters}
    GROUP BY person_id
    HAVING length(replays) > 0 AND first_play > now() - INTERVAL 90 DAY
  )
)
GROUP BY Tag
ORDER BY min(tag_nr)`.trim();

/* ---------- Kennzahlen: Aktivierung, Retention, Bezahl-Conversion getrennt ---------- */

const ACTIVATION_RATE = `
SELECT round(100 * countIf(completed) / greatest(count(), 1), 1) AS Aktivierung
FROM (
  SELECT
    person_id,
    minIf(timestamp, event = 'story_creation_started') AS started,
    groupArrayIf(timestamp, event = 'story_play_completed') AS completions,
    arrayExists(t -> t >= started AND t <= started + INTERVAL 7 DAY, completions) AS completed
  FROM events
  WHERE event IN ('story_creation_started', 'story_play_completed')
    AND timestamp > now() - INTERVAL 100 DAY
    AND {filters}
  GROUP BY person_id
  HAVING countIf(event = 'story_creation_started') > 0 AND started > now() - INTERVAL 90 DAY
)`.trim();

const RETENTION_RATE = `
SELECT round(100 * countIf(plays_7d >= 2) / greatest(count(), 1), 1) AS Retention
FROM (${FREE_LISTENERS})`.trim();

const PAID_CONVERSION_RATE = `
SELECT round(100 * countIf(sub_after_play) / greatest(count(), 1), 1) AS Bezahl_Conversion
FROM (${FREE_LISTENERS})`.trim();

/* ---------- Auswertungen ---------- */

const INSIGHTS = [
  {
    name: 'A · Aktivierung',
    description: 'Anteil derer, die mit den Fragen beginnen und ihre Story innerhalb von 7 Tagen zu Ende hören. Letzte 90 Tage.',
    query: kpi(ACTIVATION_RATE, 'Aktivierung'),
  },
  {
    name: 'B · Retention (7 Tage)',
    description: 'Anteil der Hörenden der Gratis-Story, die sie innerhalb von 7 Tagen ein weiteres Mal starten. Letzte 90 Tage.',
    query: kpi(RETENTION_RATE, 'Retention'),
  },
  {
    name: 'C · Bezahl-Conversion',
    description: 'Anteil der Hörenden der Gratis-Story, die danach ein Abo abschließen. Letzte 90 Tage.',
    query: kpi(PAID_CONVERSION_RATE, 'Bezahl_Conversion'),
  },
  {
    name: '1 · Gesamt-Funnel: CTA → Abo',
    description: 'Der komplette Weg von der Landingpage bis zum Abo. Fenster 30 Tage (Gratiszeit 7 Tage + Entscheidung danach).',
    query: funnel(
      [
        ev('creation_cta_clicked', 'CTA geklickt'),
        ev('story_creation_started', 'Erstellung gestartet'),
        ev('personalization_completed', 'Fragen beantwortet'),
        // Nicht story_generated: Beim Engel-Weg entsteht die Story parallel zum
        // Klick auf den E-Mail-Link – mal davor, mal danach. Der Start der
        // Erstellung liegt immer vor dem Account (er läuft schon beim Absenden der E-Mail).
        ev('story_generation_started', 'Story wird erstellt'),
        ev('signup_completed', 'Account erstellt'),
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
        // Nicht story_generated: Beim Engel-Weg entsteht die Story parallel zum
        // Klick auf den E-Mail-Link – mal davor, mal danach. Der Start der
        // Erstellung liegt immer vor dem Account (er läuft schon beim Absenden der E-Mail).
        ev('story_generation_started', 'Story wird erstellt'),
        ev('signup_completed', 'Account erstellt'),
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
      { windowDays: 1, layout: 'vertical' }
    ),
  },
  {
    name: '4 · 7-Tage-Übersicht der Gratis-Story',
    description:
      'Pro Person ab dem ersten Hören: nur einmal gehört, in 7 Tagen wiedergekommen, Story wiederholt, Abo direkt nach dem ersten Hören vs. erst nach Wiederholung, Gratiszeit ohne Abo abgelaufen. Letzte 90 Tage.',
    query: sql(SEVEN_DAY_SUMMARY),
  },
  {
    name: '5 · Retention: Wiederkommen Tag 0–7',
    description: 'Anteil derer, die nach dem ersten Hören an Tag 1…7 wieder hören (Linie = Durchschnitt aller Tage, Tabelle darunter je Starttag).',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'RetentionQuery',
        dateRange: { date_from: '-60d' },
        filterTestAccounts: FILTER_TEST_ACCOUNTS,
        retentionFilter: {
          period: 'Day',
          totalIntervals: 8,
          retentionType: 'retention_first_time',
          display: 'ActionsLineGraph',
          meanRetentionCalculation: 'weighted',
          targetEntity: { id: 'story_play_started', name: 'story_play_started', type: 'events', kind: 'EventsNode', properties: [FREE_STORY] },
          returningEntity: { id: 'story_play_started', name: 'story_play_started', type: 'events', kind: 'EventsNode', properties: [FREE_STORY] },
        },
      },
    },
  },
  {
    name: '6 · An welchem Tag wird wiederholt?',
    description: 'Erneutes Hören der Gratis-Story nach Tagen seit dem ersten Hören.',
    query: sql(RETURN_DAY, 'ActionsBar', { xAxis: { column: 'Tag' }, yAxis: [{ column: 'Personen' }] }),
  },
  {
    name: '7 · Abo direkt nach dem ersten Hören',
    description: 'Zu Ende gehört → Abo, ohne dass die Story dazwischen wiederholt wurde.',
    query: funnel([ev('story_play_completed', 'Zu Ende gehört', [FREE_STORY]), ev('subscription_started', 'Abo abgeschlossen')], {
      windowDays: 30,
      layout: 'vertical',
      exclusions: [{ kind: 'EventsNode', event: 'story_replayed', name: 'story_replayed', funnelFromStep: 0, funnelToStep: 1 }],
    }),
  },
  {
    name: '8 · Abo nach Wiederholung',
    description: 'Story erneut gehört → Abo.',
    query: funnel([ev('story_replayed', 'Story wiederholt', [FREE_STORY]), ev('subscription_started', 'Abo abgeschlossen')], { windowDays: 30, layout: 'vertical' }),
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
        filterTestAccounts: FILTER_TEST_ACCOUNTS,
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
        filterTestAccounts: FILTER_TEST_ACCOUNTS,
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
  if (!dashboard && CHECK_ONLY) {
    dashboard = { id: null };
  } else if (!dashboard) {
    dashboard = await api('POST', '/dashboards/', { name: DASHBOARD_NAME, description: DASHBOARD_DESCRIPTION, pinned: true });
    console.log('Dashboard angelegt:', dashboard.id);
  } else {
    console.log('Dashboard vorhanden:', dashboard.id);
  }

  // Probelauf: Eine Abfrage, die PostHog ablehnt, wird nicht gespeichert.
  const failed = new Set();
  for (const insight of INSIGHTS) {
    try {
      await api('POST', '/query/', { query: insight.query.source });
      console.log('  Abfrage ok:', insight.name);
    } catch (error) {
      failed.add(insight.name);
      console.error('  Abfrage FEHLER:', insight.name, '\n   ', error.message);
    }
  }
  if (CHECK_ONLY) {
    console.log(failed.size ? `\n${failed.size} Abfrage(n) fehlerhaft.` : '\nAlle Abfragen ok.');
    process.exit(failed.size ? 1 : 0);
  }

  const detail = await api('GET', `/dashboards/${dashboard.id}/`);
  const tileByName = new Map(
    (detail.tiles ?? []).filter((tile) => tile.insight?.name && !tile.deleted).map((tile) => [tile.insight.name, tile])
  );

  for (const insight of INSIGHTS) {
    if (failed.has(insight.name)) {
      console.log('  übersprungen (Abfrage fehlerhaft):', insight.name);
      continue;
    }
    const tile = tileByName.get(insight.name);
    if (tile) {
      await api('PATCH', `/insights/${tile.insight.id}/`, { query: insight.query, description: insight.description });
      console.log('  aktualisiert:', insight.name);
    } else {
      await api('POST', '/insights/', { ...insight, dashboards: [dashboard.id], saved: true });
      console.log('  angelegt:', insight.name);
    }
  }

  await applyLayout(dashboard.id);
  console.log(`\nFertig: ${HOST}/project/${PROJECT}/dashboard/${dashboard.id}`);
}

/* ---------- Anordnung (12-Spalten-Raster) ---------- */

// Oben die drei Kennzahlen, dann der Gesamt-Funnel, danach paarweise.
const LAYOUT = [
  ['A · Aktivierung', 0, 0, 4, 3],
  ['B · Retention (7 Tage)', 4, 0, 4, 3],
  ['C · Bezahl-Conversion', 8, 0, 4, 3],
  ['1 · Gesamt-Funnel: CTA → Abo', 0, 3, 12, 7],
  ['2 · Aktivierung: Fragen → zu Ende gehört', 0, 10, 6, 6],
  ['9 · Bezahl-Conversion: Angebot → Abo', 6, 10, 6, 6],
  ['4 · 7-Tage-Übersicht der Gratis-Story', 0, 16, 6, 6],
  ['6 · An welchem Tag wird wiederholt?', 6, 16, 6, 6],
  ['5 · Retention: Wiederkommen Tag 0–7', 0, 22, 12, 7],
  ['7 · Abo direkt nach dem ersten Hören', 0, 29, 6, 5],
  ['8 · Abo nach Wiederholung', 6, 29, 6, 5],
  ['3 · Abbruch je Frage', 0, 34, 6, 6],
  ['10 · Gratiszeit abgelaufen ohne Abo (pro Woche)', 6, 34, 6, 6],
  ['11 · Woher kommen die Klicks? (CTA nach Ort)', 0, 40, 12, 5],
];

async function applyLayout(dashboardId) {
  const detail = await api('GET', `/dashboards/${dashboardId}/`);
  const tiles = (detail.tiles ?? []).filter((tile) => tile.insight?.name && !tile.deleted);
  const position = new Map(LAYOUT.map(([name, x, y, w, h]) => [name, { x, y, w, h }]));
  let mobileY = 0;
  const updates = LAYOUT.flatMap(([name]) => {
    const tile = tiles.find((t) => t.insight.name === name);
    if (!tile) return [];
    const sm = position.get(name);
    const xs = { x: 0, y: mobileY, w: 1, h: sm.h };
    mobileY += sm.h;
    return [{ id: tile.id, layouts: { sm, xs } }];
  });
  try {
    await api('PATCH', `/dashboards/${dashboardId}/`, { tiles: updates });
    console.log('  Anordnung gesetzt');
  } catch (error) {
    // Nur Optik – die Auswertungen selbst sind gespeichert.
    console.warn('  Anordnung konnte nicht gesetzt werden:', error.message);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
