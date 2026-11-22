import { defineTexts } from "@/lib/site-texts/define";

/** Kopfzeile, Menü und Fußzeile – auf allen Seiten. */
export const common = defineTexts("common", {
  // Kopfzeile
  "header.logoAlt": { text: "Power Storys Logo", label: "Logo: Alternativtext", multiline: false },
  "header.myRoom": { text: "Mein Raum", label: "Menü: Link zum Dashboard", multiline: false },
  "header.createNew": { text: "Neue Power Story erstellen", label: "Menü: neue Story (Profil-Menü, mobil)", multiline: false },
  "header.createNewButton": { text: "+ Neue Power Story erstellen", label: "Kopfzeile: Button neue Story (Desktop)", multiline: false },
  "header.unlockMore": { text: "Weitere Power Storys freischalten", label: "Menü: Button, wenn keine Story mehr frei ist", multiline: false },
  "header.settings": { text: "Einstellungen", label: "Menü: Einstellungen", multiline: false },
  "header.logout": { text: "Abmelden", label: "Menü: Abmelden", multiline: false },
  "header.whatIs": { text: "Was ist eine Power Story?", label: "Kopfzeile (abgemeldet): Erklär-Link", multiline: false },
  "header.discover": { text: "Eine Power Story entdecken", label: "Kopfzeile (abgemeldet): Haupt-Button", multiline: false },
  "header.access": { text: "Mein Zugang", label: "Kopfzeile (abgemeldet): Link zum Zugang / Ersatzname im Profil", multiline: false },
  "header.menuOpen": { text: "Menü öffnen", label: "Menü-Knopf: Screenreader-Text", multiline: false },
  "header.menuClose": { text: "Menü schließen", label: "Menü schließen: Screenreader-Text", multiline: false },
  "header.menuLabel": { text: "Menü", label: "Mobiles Menü: Screenreader-Titel", multiline: false },
  "header.mainNav": { text: "Hauptnavigation", label: "Navigation: Screenreader-Titel", multiline: false },

  // Fußzeile
  "footer.tagline": { text: "Entwickelt mit therapeutischer Erfahrung – für deinen Alltag", label: "Fußzeile: Satz oben" },
  "footer.copyright": { text: "© Copyright - Andreas von Knobelsdorff", label: "Fußzeile: Copyright", multiline: false },
  "footer.imprint": { text: "Impressum", label: "Fußzeile: Link Impressum", multiline: false },
  "footer.privacy": { text: "Datenschutz", label: "Fußzeile: Link Datenschutz", multiline: false },
  "footer.cookies": { text: "Cookie-Einstellungen", label: "Fußzeile: Link Cookie-Einstellungen", multiline: false },

  // Einwilligungs-Banner (Analyse)
  "consent.title": { text: "Hilfst du uns, Power Storys besser zu machen?", label: "Einwilligung: Überschrift" },
  "consent.text": {
    text: "Mit deiner Erlaubnis messen wir mit {tools}, welche Schritte beim Erstellen erreicht werden – nie deine Antworten, Texte oder Geschichten. Dafür speichern wir eine zufällige Kennung in deinem Browser. [Mehr dazu](/Datenschutz)",
    format: "inline",
    vars: { tools: "eingesetzte Werkzeuge (siehe die zwei Texte darunter)" },
    label: "Einwilligung: Text",
  },
  "consent.toolsPosthog": { text: "PostHog (Server in der EU)", label: "Einwilligung: Werkzeuge (nur PostHog)", multiline: false },
  "consent.toolsWithGa": { text: "PostHog (Server in der EU) und Google Analytics", label: "Einwilligung: Werkzeuge (mit Google Analytics)", multiline: false },
  "consent.currentGranted": {
    text: "Aktuell: Messung erlaubt. Du kannst das jederzeit ändern.",
    label: "Einwilligung erneut geöffnet: erlaubt",
  },
  "consent.currentDenied": {
    text: "Aktuell: Messung abgelehnt. Du kannst das jederzeit ändern.",
    label: "Einwilligung erneut geöffnet: abgelehnt",
  },
  "consent.deny": { text: "Ablehnen", label: "Einwilligung: Ablehnen", multiline: false },
  "consent.accept": { text: "Einverstanden", label: "Einwilligung: Einverstanden", multiline: false },
});
