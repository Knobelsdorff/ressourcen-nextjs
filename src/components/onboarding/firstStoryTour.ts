/**
 * Einführung für neue Nutzer:innen, sobald ihre erste Power Story im
 * Dashboard liegt. Reihenfolge und Texte nur hier ändern.
 *
 * Die Anker (TOUR_ANCHORS) stehen als data-tour-Attribute im Markup:
 *   firstStory        – Karte der Erststory            (dashboard/page.tsx → StoryCard)
 *   firstStoryPlayer  – Player in dieser Karte          (StoryCard)
 *   firstStoryTrial   – "Noch X Tage kostenlos"-Badge   (StoryCard, nur in der Testphase)
 *   newStory          – "Neue Power Story"-Button       (dashboard/page.tsx)
 *   settings          – "Einstellungen"-Button          (dashboard/page.tsx)
 *   settingsName      – Name & Aussprache               (SettingsDialog)
 *   settingsPassword  – Passwort                        (SettingsDialog)
 *   settingsFeedback  – Feedback & Wünsche              (SettingsDialog)
 *   account           – Profil-Menü bzw. Mobil-Menü     (Header.tsx, derzeit ohne Schritt)
 *   startFirstStory   – "Erstelle deine erste Power Story" im leeren Dashboard (dashboard/page.tsx)
 *   arrivalSample     – Kostprobe "Zum Ankommen"         (ArrivalSample)
 *
 * Zwei Einführungen:
 *   FIRST_STORY_TOUR_STEPS  – Engel-Funnel: die Erststory liegt schon im Dashboard.
 *   NEW_ACCOUNT_TOUR_STEPS  – normale Registrierung: erster Besuch, noch keine Story.
 *
 * Fehlt ein Anker (z.B. keine Testphase), wird der Schritt übersprungen.
 * Beim Umbau des Dashboards nur die Attribute mitnehmen.
 */

import type { TourStep } from './SpotlightTour';

export const TOUR_ANCHORS = {
  firstStory: 'first-story',
  firstStoryPlayer: 'first-story-player',
  firstStoryTrial: 'first-story-trial',
  newStory: 'new-story',
  settings: 'settings',
  settingsName: 'settings-name',
  settingsPassword: 'settings-password',
  settingsFeedback: 'settings-feedback',
  account: 'account',
  startFirstStory: 'start-first-story',
  arrivalSample: 'arrival-sample',
} as const;

export const FIRST_STORY_TOUR_STEPS: TourStep[] = [
  {
    id: 'story',
    target: TOUR_ANCHORS.firstStory,
    title: 'Das ist deine Power Story',
    body: 'Dein Engel hat sie aus deinen Antworten nur für dich erstellt. Sie ist hier sicher gespeichert – du findest sie jederzeit wieder.',
  },
  {
    id: 'play',
    target: TOUR_ANCHORS.firstStoryPlayer,
    title: 'Einfach auf Play tippen',
    body: 'Setz am besten Kopfhörer auf und mach es dir bequem. Mit den Pfeilen springst du 15 Sekunden zurück oder vor.',
  },
  {
    id: 'trial',
    target: TOUR_ANCHORS.firstStoryTrial,
    title: '7 Tage kostenlos',
    body: 'Deine erste Power Story kannst du 7 Tage lang so oft anhören, wie du magst. Danach bleibt sie hier gespeichert und du kannst sie mit Power Storys jederzeit wieder freischalten.',
  },
  {
    id: 'new-story',
    target: TOUR_ANCHORS.newStory,
    title: 'Weitere Power Storys',
    body: 'Hier erstellst du neue Geschichten – mit anderen Figuren und Ressourcen für unterschiedliche Themen und Situationen.',
  },
  {
    id: 'settings',
    target: TOUR_ANCHORS.settings,
    title: 'Deine Einstellungen',
    body: 'Hier passt du deinen Namen an, legst ein Passwort fest und schreibst uns. Tippe auf „Einstellungen“.',
    clickToContinue: 'Einstellungen öffnen',
  },
  {
    id: 'settings-name',
    target: TOUR_ANCHORS.settingsName,
    title: 'Dein Name in den Geschichten',
    body: 'Trag deinen Namen ein und hör dir mit „Anhören“ an, wie er in deinen Power Storys klingt. Klingt er nicht richtig, schreib ihn so, wie er klingen soll.',
  },
  {
    id: 'settings-password',
    target: TOUR_ANCHORS.settingsPassword,
    title: 'Passwort – wenn du magst',
    body: 'Mit einem Passwort meldest du dich auch ohne Link aus der E-Mail an.',
  },
  {
    id: 'settings-feedback',
    target: TOUR_ANCHORS.settingsFeedback,
    title: 'Feedback & Wünsche',
    body: 'Fehlt dir eine Figur oder ein Thema? Schreib uns – wir lesen jede Nachricht.',
  },
];

const settingsSteps = (ids: string[]) => FIRST_STORY_TOUR_STEPS.filter((step) => ids.includes(step.id));

/** Erster Besuch nach normaler Registrierung (ohne Engel-Funnel), noch keine Story. */
export const NEW_ACCOUNT_TOUR_STEPS: TourStep[] = [
  {
    id: 'start-first-story',
    target: TOUR_ANCHORS.startFirstStory,
    title: 'Willkommen in deinem Raum',
    body: 'Hier beginnt deine erste Power Story: Du wählst eine Figur, beantwortest ein paar Fragen und suchst dir eine Stimme aus. In 2–3 Minuten ist sie fertig.',
  },
  {
    id: 'first-story-free',
    target: TOUR_ANCHORS.startFirstStory,
    title: 'Deine erste Power Story ist kostenlos',
    body: 'Du kannst sie 7 Tage lang so oft anhören, wie du magst. Danach bleibt sie hier gespeichert und du kannst sie mit Power Storys jederzeit wieder freischalten.',
  },
  {
    id: 'arrival-sample',
    target: TOUR_ANCHORS.arrivalSample,
    title: 'Erst einmal reinhören?',
    body: 'Diese kurze Power Story ist immer kostenlos. Setz Kopfhörer auf und hör hinein – so bekommst du ein Gefühl dafür, wie sich Power Storys anfühlen.',
  },
  ...settingsSteps(['settings', 'settings-name']),
  {
    id: 'settings-password',
    target: TOUR_ANCHORS.settingsPassword,
    title: 'Dein Passwort',
    body: 'Hier legst du ein Passwort fest oder änderst es.',
  },
  ...settingsSteps(['settings-feedback']),
];
