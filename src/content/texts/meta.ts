import { defineTexts } from "@/lib/site-texts/define";

/*
 * Seitentitel und Beschreibungen für Suchmaschinen und Link-Vorschauen
 * (WhatsApp, Facebook …). Nicht auf der Seite sichtbar – bearbeitbar unter
 * /admin/texte. Werden auf dem Server gelesen (generateMetadata).
 */
export const meta = defineTexts("meta", {
  "site.title": { text: "Power Storys", label: "Browser-Tab: Titel der Website", multiline: false, maxLength: 70 },
  "site.description": {
    text: "Kurz innehalten, zuhören und spüren – Geschichten für mehr Entspannung im Alltag.",
    label: "Google: Beschreibung der Website",
    multiline: false,
    maxLength: 300,
  },
  "share.title": { text: "Finde innere Ruhe mit Power Storys", label: "Link-Vorschau: Titel", multiline: false, maxLength: 100 },
  "share.description": {
    text: "Kurz innehalten, zuhören und spüren – Geschichten für mehr Entspannung im Alltag.",
    label: "Link-Vorschau: Beschreibung",
    multiline: false,
    maxLength: 300,
  },
  "share.imageAlt": { text: "Power Storys - Finde innere Ruhe", label: "Link-Vorschau: Bildbeschreibung", multiline: false },
  "figur.title": { text: "Figur wählen – Power Story", label: "/figur: Titel", multiline: false, maxLength: 70 },
  "figur.description": { text: "Schau, welche Figur ein kleines inneres Ja auslöst", label: "/figur: Beschreibung", multiline: false, maxLength: 300 },
  "zugang.title": { text: "Mein Zugang – Power Story", label: "/zugang: Titel", multiline: false, maxLength: 70 },
  "zugang.description": {
    text: "Melde dich an, um zu deinen persönlichen Power Storys zu gelangen.",
    label: "/zugang: Beschreibung",
    multiline: false,
    maxLength: 300,
  },
  "zugangErhalten.title": { text: "Dein persönlicher Raum – Power Story", label: "/zugang-erhalten: Titel", multiline: false, maxLength: 70 },
  "zugangErhalten.description": {
    text: "Erhalte Zugang zu deinem persönlichen Raum, damit deine Geschichten gespeichert bleiben.",
    label: "/zugang-erhalten: Beschreibung",
    multiline: false,
    maxLength: 300,
  },
});
