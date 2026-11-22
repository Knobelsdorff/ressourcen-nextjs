import { defineTexts } from "@/lib/site-texts/define";

/*
 * Admin-Menü im Dashboard. Eigener kleiner Bereich, damit das Dashboard für
 * alle Nutzer:innen nicht den ganzen Admin-Katalog laden muss.
 */
export const adminMenu = defineTexts("adminMenu", {
  "aria": { text: "Admin-Werkzeuge", label: "Admin-Menü (Screenreader)", multiline: false },
  "label": { text: "Admin", label: "Admin-Menü: Button", multiline: false },
  "music": { text: "Musik verwalten", label: "Admin-Menü: Musik", multiline: false },
  "kostprobe": { text: "Kostprobe", label: "Admin-Menü: Kostprobe", multiline: false },
  "analytics": { text: "Admin Analytics", label: "Admin-Menü: Analytics", multiline: false },
  "texts": { text: "Texte bearbeiten", label: "Admin-Menü: Texte", multiline: false },
  "clientResource": { text: "Manuelle Ressource erstellen (Audio)", label: "Admin-Menü: manuelle Ressource", multiline: false },
});
