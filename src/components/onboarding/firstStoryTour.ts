/**
 * Einführung für neue Nutzer:innen, sobald ihre erste Power Story im
 * Dashboard liegt. Reihenfolge und Texte nur hier ändern.
 *
 * Die Anker (TOUR_ANCHORS) stehen als data-tour-Attribute im Markup:
 *   firstStory        – Karte der Erststory            (dashboard/page.tsx → StoryCard)
 *   firstStoryPlayer  – Player in dieser Karte          (StoryCard)
 *   firstStoryTrial   – "Noch X Tage kostenlos"-Badge   (StoryCard, nur in der Testphase)
 *   newStory          – "Neue Power Story"-Button       (dashboard/page.tsx)
 *   account           – Profil-Menü bzw. Mobil-Menü     (Header.tsx)
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
  account: 'account',
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
    id: 'account',
    target: TOUR_ANCHORS.account,
    title: 'Dein Bereich',
    body: 'Hier findest du dein Profil, deine Einstellungen und – wenn du magst – dein Abo.',
  },
];
