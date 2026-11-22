import { defineTexts } from "@/lib/site-texts/define";

/*
 * Startseite – Text und Reihenfolge von Andreas (StoryBrand-Wireframe).
 * Die Originale hier sind Zeichen für Zeichen die bisherigen Texte.
 */
export const landing = defineTexts("landing", {
  // Hero
  "hero.title": { text: "Finde innere Ruhe und fühl dich sicher und geborgen", label: "Hero: Überschrift" },
  "hero.lead": {
    text: "Erstelle in 2 Minuten deine persönliche Audio-Geschichte und erlebe Momente voller Wärme, Halt und Unterstützung.",
    label: "Hero: Text unter der Überschrift",
  },
  "hero.cta": { text: "Meine Power Story erstellen", label: "Hero: Button", multiline: false },

  // Hörprobe im Hero
  "preview.imageAlt": { text: "Innere Ruhe aktivieren", label: "Hero-Bild: Alternativtext (für Screenreader)", multiline: false },
  "preview.kicker": { text: "KOSTENLOSE HÖRGESCHICHTE", label: "Hörprobe: Kennzeichnung oben links", multiline: false },
  "preview.kickerNote": { text: "Ohne Anmeldung", label: "Hörprobe: Hinweis oben rechts", multiline: false },
  "preview.title": { text: "Spüre, wie es ist, gehalten und geborgen zu sein.", label: "Hörprobe: Überschrift" },
  "preview.text": {
    text: "Höre „Wohlwollende Präsenz“ und erlebe Momente voller Wärme, Liebe und Sicherheit.",
    label: "Hörprobe: Text",
  },
  "preview.loading": { text: "Hörprobe wird geladen …", label: "Hörprobe: wird geladen", multiline: false },
  "preview.unavailable": { text: "Die Hörprobe ist gerade nicht verfügbar.", label: "Hörprobe: nicht verfügbar" },
  "preview.fallbackCta": { text: "Meine Power Story erstellen", label: "Hörprobe: Button, wenn keine Hörprobe da ist", multiline: false },
  "preview.defaultTitle": { text: "Wohlwollende Präsenz", label: "Hörprobe: Titel, falls keiner hinterlegt ist", multiline: false },

  // Stakes
  "stakes.title": { text: "Anspannung bleibt oft länger, als nötig", label: "Stakes: Überschrift" },
  "stakes.subtitle": {
    text: "Im Alltag bleibt oft wenig Raum, um kurz innezuhalten und wieder bei sich anzukommen",
    label: "Stakes: Unterzeile",
  },
  "stakes.bullet1": { text: "Innere Unruhe klingt nicht immer von selbst ab", label: "Stakes: Punkt 1" },
  "stakes.bullet2": { text: "Selbst freie Momente bringen oft kaum Entlastung", label: "Stakes: Punkt 2" },
  "stakes.bullet3": { text: "Der Körper bleibt angespannt, auch ohne klaren Anlass", label: "Stakes: Punkt 3" },
  "stakes.bullet4": { text: "Erholung fühlt sich oft oberflächlich an", label: "Stakes: Punkt 4" },
  "stakes.cta": { text: "Jetzt ausprobieren", label: "Stakes: Button", multiline: false },
  "stakes.imageAlt": { text: "Power Stories Stakes", label: "Stakes-Bild: Alternativtext", multiline: false },

  // Value Proposition
  "value.title": { text: "Ein einfacher Weg, wieder bei dir anzukommen", label: "Nutzen: Überschrift" },
  "value.subtitle": { text: "Kurze Geschichten, die dich sanft aus der Anspannung holen", label: "Nutzen: Unterzeile" },
  "value.feature1.title": { text: "Ein sicherer Raum", label: "Nutzen 1: Titel" },
  "value.feature1.text": { text: "Du musst nichts leisten. Du darfst einfach da sein.", label: "Nutzen 1: Text" },
  "value.feature2.title": { text: "Personalisierte Geschichten", label: "Nutzen 2: Titel" },
  "value.feature2.text": { text: "Abgestimmt auf das, was du gerade brauchst.", label: "Nutzen 2: Text" },
  "value.feature3.title": { text: "Ruhige Stimmen", label: "Nutzen 3: Titel" },
  "value.feature3.text": { text: "Sanft getragen – damit du innerlich mitgehen kannst.", label: "Nutzen 3: Text" },
  "value.feature4.title": { text: "Jederzeit für dich da", label: "Nutzen 4: Titel" },
  "value.feature4.text": {
    text: "Wenn du merkst, dass es viel wird – oder gar nicht erst so weit kommen soll.",
    label: "Nutzen 4: Text",
  },
  "value.cta": { text: "Jetzt kurz eintauchen", label: "Nutzen: Button", multiline: false },
  "value.closing": {
    text: "Manchmal ist es genau diese Ruhe, die im Alltag am schwersten erreichbar ist",
    label: "Nutzen: Schlusssatz (kursiv)",
  },

  // Empathie / Guide
  "empathy.title": { text: "Wenn innere Ruhe schwer erreichbar wird", label: "Empathie: Überschrift" },
  "empathy.subtitle": { text: "Auch wenn im Außen alles weiterläuft", label: "Empathie: Unterzeile" },
  "empathy.panel1.title": { text: "Es fühlt sich oft anders an, als es aussieht", label: "Empathie: linke Karte, Titel" },
  "empathy.panel1.text": {
    text: "Viele Menschen funktionieren im Alltag zuverlässig – und merken erst in stillen Momenten, wie viel Spannung innerlich eigentlich da ist.",
    label: "Empathie: linke Karte, Text",
  },
  "empathy.panel2.title": { text: "Power Storys sind bewusst einfach gehalten", label: "Empathie: rechte Karte, Titel" },
  "empathy.panel2.text": {
    text: "Sie wurden so gestaltet, dass dein Inneres folgen kann – ohne Analyse, ohne Technik, ohne etwas leisten zu müssen.",
    label: "Empathie: rechte Karte, Text",
  },
  "empathy.quote": {
    text: "\"Ich war skeptisch, ob eine kurze Geschichte wirklich etwas verändern kann. Aber schon nach den ersten Minuten wurde es spürbar ruhiger in mir.\"",
    label: "Empathie: Zitat",
  },
  "empathy.quoteAuthor": { text: "Linda R.", label: "Empathie: Name unter dem Zitat", multiline: false },
  "empathy.cta": { text: "Einfach selbst erleben", label: "Empathie: Button", multiline: false },

  // Plan
  "plan.title": { text: "So einfach kann es sein", label: "Plan: Überschrift" },
  "plan.subtitle": {
    text: "Du wirst Schritt für Schritt begleitet – ohne Vorbereitung, ohne Vorkenntnisse.",
    label: "Plan: Unterzeile",
  },
  "plan.step1.title": { text: "Ankommen", label: "Plan Schritt 1: Titel" },
  "plan.step1.text": {
    text: "Du hörst dir eine erste Power Story an – ruhig gesprochen, ohne etwas tun zu müssen.",
    label: "Plan Schritt 1: Text",
  },
  "plan.step2.title": { text: "Deine eigene Geschichte", label: "Plan Schritt 2: Titel" },
  "plan.step2.text": {
    text: "Wenn du magst, beantwortest du ein paar einfache Fragen. Daraus entsteht eine Geschichte, die zu dir und deinem Moment passt.",
    label: "Plan Schritt 2: Text",
  },
  "plan.step3.title": { text: "Nachwirken lassen", label: "Plan Schritt 3: Titel" },
  "plan.step3.text": {
    text: "Du bleibst einen Moment bei dir und nimmst wahr, was sich verändert hat – ganz ohne Bewertung.",
    label: "Plan Schritt 3: Text",
  },
  "plan.note": {
    text: "Es gibt kein richtig oder falsch. Du darfst einfach erleben, was passiert.",
    label: "Plan: Hinweis (kursiv)",
  },
  "plan.cta": { text: "Jetzt einfach beginnen", label: "Plan: Button", multiline: false },

  // Explanatory Paragraph
  // Früher <span class="whitespace-nowrap">Power Story</span> – jetzt geschütztes Leerzeichen, gleiche Wirkung.
  "explain.title": { text: "Was eine Power Story möglich macht", label: "Erklärung: Überschrift" },
  "explain.subtitle": { text: "Nicht alles lässt sich über Denken lösen", label: "Erklärung: Unterzeile" },
  "explain.p1": {
    text: "Viele Menschen erleben, dass innere Anspannung nicht verschwindet, nur weil man sie verstanden hat.",
    label: "Erklärung: Absatz 1",
  },
  "explain.p2": {
    text: "Der Körper bleibt oft auf Spannung, auch wenn im Kopf längst alles klar ist.",
    label: "Erklärung: Absatz 2",
  },
  "explain.p3": {
    text: "Ruhig erzählte Geschichten können einen anderen Zugang öffnen. Sie sprechen nicht den Verstand an, sondern laden den Körper ein, langsamer zu werden.",
    label: "Erklärung: Absatz 3",
  },
  "explain.p4": { text: "Nicht durch Nachdenken – sondern durch Zuhören.", label: "Erklärung: Absatz 4" },
  "explain.p5": {
    text: "Manchmal reicht genau das, damit etwas weicher wird und wieder mehr Raum entsteht.",
    label: "Erklärung: Absatz 5",
  },
  "explain.effect.title": { text: "Manchmal zeigt sich die Wirkung ganz leise.", label: "Wirkung: Einleitung (fett)" },
  "explain.effect.p1": { text: "Manche Menschen berichten, dass Gedanken langsamer werden.", label: "Wirkung: Absatz 1" },
  "explain.effect.p2": { text: "Dass der Körper für einen Moment loslässt.", label: "Wirkung: Absatz 2" },
  "explain.effect.p3": { text: "Oder dass sich innerlich mehr Raum öffnet.", label: "Wirkung: Absatz 3" },
  "explain.effect.p4": { text: "Nicht immer gleich. Nicht immer stark. Aber oft spürbar.", label: "Wirkung: Absatz 4" },
  "explain.cta": { text: "Einfach selbst erleben", label: "Erklärung: Button", multiline: false },
});
