# PostHog funnel analytics

Status (25 Oct 2026): code complete on branch `Post-Hog-Implementation`, not committed. Nothing is sent anywhere until `NEXT_PUBLIC_POSTHOG_KEY` is set and a visitor accepts the consent banner.

- [1. Privacy review (for Andreas)](#1-privacy-review)
- [2. Go-live checklist](#2-go-live-checklist)
- [3. Events](#3-events)
- [4. Dashboard](#4-dashboard)
- [5. Draft text for the Datenschutzerklärung](#5-draft-text-for-the-datenschutzerklärung)
- [6. Code map](#6-code-map)

---

## 1. Privacy review

Short answer: PostHog is fine for this project if it runs on **PostHog EU Cloud**, **only after opt-in consent**, with **no autocapture and no session recording**, and with the settings below. That is how it is built. Final legal sign-off and the privacy-policy text are for Andreas / his data-protection advisor. This is a technical assessment, not legal advice.

### PostHog configuration for Germany / EU

| Setting | Value | Why |
|---|---|---|
| Region | EU Cloud (Frankfurt, `eu.posthog.com`) | Data stays in the EU, no third-country transfer for storage. |
| Ingestion | Through our own domain, `/ingest` (Next.js rewrite) | PostHog receives Vercel's IP instead of the visitor's IP. Ad blockers don't silently skew the funnel. |
| Project setting "Discard client IP data" | **ON** (set manually in PostHog) | Second safety net: no IPs stored, no GeoIP. |
| DPA | Accept PostHog's DPA in the org settings (PostHog acts as processor) | Art. 28 GDPR. PostHog Inc. is a US company: the data is stored in the EU, but the advisor should confirm the transfer basis (DPA/SCCs, or EU–US Data Privacy Framework if PostHog is certified). |
| Autocapture | OFF | Clicks would send button texts, and the answer buttons contain the personal answers. |
| Session recording, heatmaps, surveys, web experiments, toolbar scripts | OFF; no external scripts are loaded (`disable_external_dependency_loading`) | No screen content leaves the browser; smaller supply-chain surface. |
| Feature flags request | OFF | Fewer requests; not needed. |
| Person profiles | Only for logged-in users (`identified_only`), keyed by the Supabase user UUID | No e-mail or name is ever sent. |
| URLs | Hash removed; only harmless query params kept (`first`, `figure`, `welcome`, `payment`, `utm_*` …); token paths masked (`/willkommen/:token`, `/zugang/:token`) | Magic-link tokens and Supabase `#access_token` never reach PostHog. |
| Do-Not-Track | respected | Conservative default. |
| Data retention | Set in PostHog project settings (recommend 12–24 months) | Storage limitation. |

### Consent

Germany: § 25 TDDDG requires consent before storing or reading anything on the device that is not strictly necessary. PostHog's cookie/localStorage ID is not strictly necessary, so analytics runs **only after opt-in**.

What is implemented:

- New German consent banner. Non-blocking, with **"Ablehnen" and "Einverstanden" given equal weight** (as the DSK guidance requires). It can be reopened at any time via "Cookie-Einstellungen" in the footer.
- Before a choice is made, PostHog neither sends nor stores anything. This was verified against a local mock endpoint: 0 requests, no storage keys.
- Declining removes PostHog's stored data and stops capturing. It also removes `_ga` cookies.
- The choice is stored in the `ps_consent` cookie for 12 months, then the banner asks again. For logged-in users the choice is also stored server-side in `app_metadata.analytics_consent`, so server events with no browser request behind them (Stripe webhook, daily cron) also respect it.
- **Google Analytics** (`NEXT_PUBLIC_GOOGLE_TAG`) previously loaded **without consent** when the variable was set. It now loads only after consent too.
- Vercel Web Analytics stays as it is (cookieless, no consent banner needed).

Optional, off by default: `NEXT_PUBLIC_POSTHOG_COOKIELESS=on_reject` would still count people who decline, using a daily-rotating server-side hash with nothing stored on the device. That gives more complete numbers, but whether it is allowed after an explicit "no" is legally contested in Germany. Only enable it with the advisor's OK.

**Effect on numbers:** with opt-in only, the funnel shows the share of visitors who accept, typically 40–70 % in Germany. Conversion rates between steps stay meaningful. Absolute counts are lower than reality. Vercel Analytics still has the full pageview counts.

### What is transmitted

Per event: event name, timestamp, a random device ID (after login, the Supabase user UUID), the cleaned page URL and referrer, and browser/OS/screen size/language. Plus only these event properties, enforced by an allowlist in code:

`location`, `flow` (angel/regular), `figure_category`, `figure_id` (custom figures are always sent as `custom`, never their name), `question_number`, `question_count`, `custom_answer_count` (a number), `duration_seconds`, `gate`, `method`, `economy_mode`, `story_id` (random UUID), `access` (trial/subscription/always/unsaved), `days_since_created`, `play_number`, `is_replay`, `variant`, `plan`, `trial_days`.

Never sent: answers, free text, story text, therapeutic content, audio, names, e-mail addresses, IP addresses (proxy plus "discard IP"), or payment data.

There is a second safety net in code. Every text value must look like an identifier (letters, digits, `- _ . :`, at most 64 characters, no spaces). Even a sentence passed by mistake would be dropped. In the local test, a free-text answer ("Ich habe Angst verlassen zu werden") was typed into the questions, and it appeared in none of the captured payloads.

### Assessment

- Legal basis: consent (§ 25 (1) TDDDG, Art. 6 (1)(a) GDPR). Server-side events are only sent for people who consented.
- Health-related data (Art. 9): the content of the stories could be health-related, which is exactly why no content is transmitted. The fact that someone uses a wellbeing app is still a sensitive signal, which is another reason for opt-in, EU hosting and discarded IPs.
- Needed before go-live: PostHog DPA accepted; privacy-policy section added (draft in section 5); records of processing updated.

---

## 2. Go-live checklist

1. **PostHog**: create an organisation and project in **EU Cloud**. In the project settings:
   - Turn on "Discard client IP data".
   - Set data retention.
   - Configure "Filter out internal and test users". Localhost visits are already marked `$internal_or_test_user`; add Andreas' and the team's accounts.
   - Accept the DPA.
2. **Vercel env (Production + Preview):**
   - `NEXT_PUBLIC_POSTHOG_KEY=phc_…` (the project API key, public by design)
   - `CRON_SECRET=<random 32+ chars>`. Vercel sends it to the daily cron. Without it the cron route always returns 401.
   - Optional: `NEXT_PUBLIC_POSTHOG_HOST` (default `/ingest`), `POSTHOG_HOST` for server events (default `https://eu.i.posthog.com`).
3. **Supabase SQL**: run `supabase/migrations/20261025120000_first_story_analytics_id.sql`. It adds one nullable column. The app works without it; only the server-side Angel events are missing until it is applied. Rollback: `supabase/rollback/20261025120000_first_story_analytics_id_down.sql`.
4. **Privacy policy**: add the section from section 5 (after review).
5. **Deploy**, accept the banner once, and check *Activity → Live events* in PostHog.
6. **Dashboard**: create a personal API key (scopes `dashboard:write`, `insight:write`, `project:read`), then run:
   ```bash
   POSTHOG_PERSONAL_API_KEY=phx_… POSTHOG_PROJECT_ID=<id> node scripts/posthog/setup-dashboard.mjs
   ```
   `--dry-run` prints the definitions without calling the API.

`package-lock.json` is updated (posthog-js 1.438.7, pinned exactly). The repo also has an old `yarn.lock` (Jan 2026). Check which lockfile Vercel installs from. If it uses yarn, run `yarn install` once so `yarn.lock` contains posthog-js too.

---

## 3. Events

| Event | Trigger | Where |
|---|---|---|
| `creation_cta_clicked` | Any landing/header CTA with `data-analytics-cta="<location>"` | browser |
| `story_creation_started` | First question of a new creation (not when resuming) | browser |
| `personalization_question_completed` | Each question answered (number only), for drop-off per question | browser |
| `personalization_completed` | Last question answered (`personalization_completed: true`) | browser |
| `signup_viewed` | Angel: email gate shown. Regular flow: `/geschichte-speichern` | browser |
| `signup_completed` | New account (≤ 24 h old) on first login. Angel: also from the email link (`/willkommen`), deduplicated by a fixed event UUID | server |
| `story_generation_started` | Angel: draft created (server). Regular: generation starts (browser) | both |
| `story_generated` | Angel: text and audio ready (server). Regular: audio ready (browser) | both |
| `story_play_started` | Start of a listening session (not every resume; a reload within 30 min is the same session) | browser |
| `story_play_completed` | End of the voice reached (once per session) | browser |
| `soft_paywall_viewed` | `SubscriptionOffer` opened (`variant`: after-first-story / locked) | browser |
| `subscription_cta_clicked` | Subscribe button in the offer or the paywall | browser |
| `checkout_started` | `/api/checkout` created a Stripe session | server |
| `subscription_started` | Stripe webhook `checkout.session.completed`. Deduplicated across the 3 webhook routes | server |
| `story_replayed` | Same story played again ≥ 30 min after the last start on this device, or after the server's `first_completed_at` | browser |
| `free_access_expired` | Daily Vercel cron (06:15 UTC): trial ended within the last 3 days and no active subscription. Timestamp = trial end; deduplicated | server |

Pageviews (`$pageview`, `$pageleave`) are kept. Vercel Analytics is unchanged.

To track a new CTA, add `data-analytics-cta="some-location"` to the element. New events must be added to `src/lib/product-analytics/events.ts`, which is the only place that decides what may be sent.

---

## 4. Dashboard

`scripts/posthog/setup-dashboard.mjs` creates **"Power Storys – Funnel & 7 Tage"**. The funnel, retention and trend definitions were validated against PostHog's current query schema. The two HogQL tables are SQL, so check them once against real data.

| # | Insight | Answers |
|---|---|---|
| 1 | Gesamt-Funnel (10 steps, 30-day window) | CTA → Creation → Personalization → Signup → Generated → Play → Completed → Soft paywall → Checkout → Subscription |
| 2 | Aktivierung (7 days) | Activation, separately |
| 3 | Abbruch je Frage | Which question people drop at |
| 4 | **7-Tage-Übersicht** (table) | Listened only once · returned within 7 days · replayed · subscribed right after first listen · subscribed only after replay · free period ended without subscribing |
| 5 | Retention day 0–7 | Return behaviour (retention) |
| 6 | Replay day | On which day they come back |
| 7 / 8 | Subscription without / after replay | Paid conversion by path |
| 9 | Paid conversion (offer → subscription) | Paid conversion, separately |
| 10 | Free period ended without subscription per week | |
| 11 | CTA clicks by location | Which landing section converts |

---

## 5. Draft text for the Datenschutzerklärung

To review with the advisor, then add under "4. Verwendung externer Dienste":

> **PostHog (Produktanalyse)**
>
> Mit Ihrer Einwilligung nutzen wir PostHog, einen Dienst der PostHog Inc., 2261 Market St., San Francisco, USA, um zu verstehen, welche Schritte beim Erstellen und Anhören einer Power Story erreicht werden (z. B. „Fragen beantwortet“, „Story angehört“, „Abo abgeschlossen“). Die Daten werden ausschließlich auf Servern in der Europäischen Union (Frankfurt) verarbeitet. Die Übertragung erfolgt über unsere eigene Domain; Ihre IP-Adresse wird dabei nicht an PostHog weitergegeben und nicht gespeichert.
>
> Verarbeitet werden: eine zufällige Kennung (nach dem Login die interne Nutzer-ID, nie Name oder E-Mail-Adresse), aufgerufene Seiten, Zeitpunkte, Browser- und Gerätetyp sowie die genannten Schritte. **Ihre Antworten, Texte, Geschichten und Audios werden nie an PostHog übertragen.** Es findet keine Aufzeichnung Ihres Bildschirms statt.
>
> Rechtsgrundlage ist Ihre Einwilligung (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Sie können sie jederzeit über „Cookie-Einstellungen“ im Footer widerrufen. PostHog speichert dazu eine Kennung im Local Storage bzw. in einem Cookie Ihres Browsers. Mit PostHog besteht ein Vertrag zur Auftragsverarbeitung; da PostHog ein US-Unternehmen ist, ist ein Zugriff aus den USA nicht völlig auszuschließen – [Grundlage der Übermittlung, z. B. Standardvertragsklauseln, nach Prüfung ergänzen]. Speicherdauer: [12/24] Monate. Weitere Informationen: https://posthog.com/privacy
>
> **Google Analytics** (falls weiterhin genutzt) wird ebenfalls erst nach Ihrer Einwilligung geladen.

---

## 6. Code map

- `src/lib/product-analytics/events.ts`: event catalog, property allowlist, value check (browser and server)
- `src/lib/product-analytics/client.ts`: PostHog init and config, URL cleaning, `track`, `identifyUser`, consent
- `src/lib/product-analytics/consent.ts`: `ps_consent` cookie, open-settings event
- `src/lib/product-analytics/server.ts`: server capture via HTTP (Node and Edge, no SDK), consent checks, deduplication UUIDs
- `src/lib/product-analytics/story-plays.ts`: play / completed / replay logic
- `src/components/product-analytics/`: consent banner, `ProductAnalytics` (identify, signup, CTA listener, GA gate)
- `src/instrumentation-client.ts`: init before hydration
- `next.config.ts`: `/ingest` rewrites, `skipTrailingSlashRedirect`. `src/middleware.ts` keeps the `/page/` → `/page` redirect for everything else.
- `src/app/api/analytics/{consent,signup}`, `src/app/api/cron/free-access-expired`, `vercel.json` (cron)
- `scripts/posthog/setup-dashboard.mjs`
