import { defineTexts } from "@/lib/site-texts/define";

/*
 * Impressum und Datenschutzerklärung – je Abschnitt ein langer Text mit
 * Auszeichnung (## Überschrift, ### Zwischenüberschrift, - Liste, **fett**,
 * [Link](https://…)). Bearbeitet wird im großen Editor mit Vorschau.
 * Jede Veröffentlichung steht mit Datum und Person im Verlauf.
 */
const md = (text: string, label: string) => ({ text, label, format: "markdown" as const });

export const legal = defineTexts("legal", {
  "back": { text: "← Zurück zur Startseite", label: "Link zurück zur Startseite", multiline: false },

  // Impressum
  "impressum.title": { text: "Impressum", label: "Impressum: Überschrift", multiline: false },
  "impressum.subtitle": { text: "Angaben gemäß § 5 TMG", label: "Impressum: Unterzeile", multiline: false },
  "impressum.heading": { text: "Angaben gemäß § 5 TMG", label: "Impressum: Überschrift im Kasten", multiline: false },
  "impressum.responsible": md(
    "### Verantwortlich für den Inhalt\n**Andreas von Knobelsdorff**\nEgerlandweg 38\n70736 Fellbach\nDeutschland",
    "Impressum: Verantwortlich für den Inhalt"
  ),
  "impressum.contact": md(
    "### Kontakt\nE-Mail: heilung@knobelsdorff-therapie.de\nWebsite: [www.knobelsdorff-therapie.de](https://www.knobelsdorff-therapie.de/)",
    "Impressum: Kontakt"
  ),
  "impressum.vat": md(
    "### Umsatzsteuer-ID\nUmsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:\nDE281054688",
    "Impressum: Umsatzsteuer-ID"
  ),
  "impressum.editorial": md(
    "### Redaktionell verantwortlich\nAndreas von Knobelsdorff\nEgerlandweg 38\n70736 Fellbach",
    "Impressum: Redaktionell verantwortlich"
  ),
  "impressum.odr": md(
    "### EU-Streitschlichtung\nDie Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: [https://ec.europa.eu/consumers/odr/](https://ec.europa.eu/consumers/odr/)",
    "Impressum: EU-Streitschlichtung"
  ),
  "impressum.consumer": md(
    "### Verbraucherstreitbeilegung/Universalschlichtungsstelle\nWir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
    "Impressum: Verbraucherstreitbeilegung"
  ),

  // Datenschutz
  "privacy.title": { text: "Datenschutzerklärung", label: "Datenschutz: Überschrift", multiline: false },
  "privacy.subtitle": { text: "Schutz Ihrer persönlichen Daten", label: "Datenschutz: Unterzeile", multiline: false },
  "privacy.s1": md(
    "## 1. Einleitung\nDiese Datenschutzerklärung informiert Sie über die Art, den Umfang und Zweck der Verarbeitung personenbezogener Daten auf dieser Website. Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst und behandeln diese vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften.",
    "Datenschutz 1: Einleitung"
  ),
  "privacy.s2": md(
    [
      "## 2. Datenerfassung auf dieser Website",
      "",
      "### Wer ist verantwortlich für die Datenerfassung?",
      "Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle\" in dieser Datenschutzerklärung entnehmen.",
      "",
      "### Wie erfassen wir Ihre Daten?",
      "Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben.",
      "",
      "Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).",
    ].join("\n"),
    "Datenschutz 2: Datenerfassung"
  ),
  "privacy.s3": md(
    [
      "## 3. Hosting",
      "",
      "### Externes Hosting",
      "Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters / der Hoster gespeichert. Hierbei kann es sich v. a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.",
    ].join("\n"),
    "Datenschutz 3: Hosting"
  ),
  "privacy.s4": md(
    [
      "## 4. Verwendung externer Dienste",
      "",
      "### OpenAI (ChatGPT)",
      "Für die Generierung von personalisierten Geschichten verwenden wir den Dienst von OpenAI. Wenn Sie eine Ressource erstellen, werden Ihre Antworten auf die Fragen an OpenAI gesendet, um eine maßgeschneiderte Geschichte zu generieren.",
      "",
      "**Datenschutzerklärung von OpenAI:** [https://openai.com/de-DE/privacy](https://openai.com/de-DE/privacy)",
      "",
      "### ElevenLabs",
      "Für die Sprachsynthese und Audio-Generierung verwenden wir den Dienst von ElevenLabs. Dieser Dienst kann für die Erstellung von Audio-Inhalten verwendet werden.",
      "",
      "**Datenschutzerklärung von ElevenLabs:** [https://elevenlabs.io/privacy](https://elevenlabs.io/privacy)",
      "",
      "### Supabase",
      "Für die Datenbank, Authentifizierung und Speicherung Ihrer Geschichten verwenden wir den Dienst von Supabase. Supabase ist ein Backend-as-a-Service-Anbieter, der folgende Daten verarbeitet:",
      "",
      "- **Authentifizierungsdaten:** E-Mail-Adresse, Passwort (verschlüsselt)",
      "- **Profilinformationen:** Name, E-Mail-Adresse, Registrierungsdatum",
      "- **Geschichten:** Ihre erstellten Ressourcen-Geschichten und Antworten auf Fragen",
      "- **Audio-Dateien:** Generierte Audio-Inhalte (falls erstellt)",
      "",
      "**Standort der Datenverarbeitung:** Supabase verarbeitet Ihre Daten in der Europäischen Union (EU) und ist DSGVO-konform.",
      "",
      "**Datenschutzerklärung von Supabase:** [https://supabase.com/privacy](https://supabase.com/privacy)",
      "",
      "### Weitergabe von Daten",
      "Beachten Sie, dass bei der Nutzung dieser externen Dienste Ihre Daten an diese Unternehmen weitergegeben werden. Diese Unternehmen haben ihre eigenen Datenschutzrichtlinien und sind für die Verarbeitung Ihrer Daten nach ihren eigenen Richtlinien verantwortlich.",
      "",
      "### YouTube-Videos",
      "Auf dieser Website können YouTube-Videos eingebettet werden. YouTube ist ein Dienst von Google und kann beim Abspielen von Videos Cookies setzen und personenbezogene Daten wie Ihre IP-Adresse erfassen.",
      "",
      "**Datenschutzerklärung von Google/YouTube:** [https://policies.google.com/privacy](https://policies.google.com/privacy)",
    ].join("\n"),
    "Datenschutz 4: Externe Dienste"
  ),
  "privacy.s5": md(
    [
      "## 5. Allgemeine Hinweise und Pflichtinformationen",
      "",
      "### Datenschutz",
      "Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.",
      "",
      "### Hinweis zur verantwortlichen Stelle",
      "Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:",
      "",
      "**Andreas von Knobelsdorff**",
      "Egerlandweg 38",
      "70736 Fellbach",
      "Deutschland",
      "",
      "E-Mail: heilung@knobelsdorff-therapie.de",
      "Website: [www.knobelsdorff-therapie.de](https://www.knobelsdorff-therapie.de/)",
    ].join("\n"),
    "Datenschutz 5: Pflichtinformationen"
  ),
  "privacy.s6": md(
    [
      "## 6. Ihre Rechte",
      "",
      "Sie haben folgende Rechte:",
      "",
      "- Recht auf Auskunft über Ihre gespeicherten personenbezogenen Daten",
      "- Recht auf Berichtigung oder Löschung Ihrer personenbezogenen Daten",
      "- Recht auf Einschränkung der Verarbeitung",
      "- Recht auf Widerspruch gegen die Verarbeitung",
      "- Recht auf Datenübertragbarkeit",
      "- Recht auf Beschwerde bei einer Aufsichtsbehörde",
    ].join("\n"),
    "Datenschutz 6: Ihre Rechte"
  ),
  "privacy.s7": md(
    "## 7. Speicherdauer\n\nIhre personenbezogenen Daten werden nur so lange gespeichert, wie es für die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen dies vorschreiben. Nach Ablauf der Speicherfristen werden Ihre Daten gelöscht oder anonymisiert.",
    "Datenschutz 7: Speicherdauer"
  ),
  "privacy.s8": md(
    "## 8. Änderungen\n\nWir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen, z. B. bei der Einführung neuer Services.",
    "Datenschutz 8: Änderungen"
  ),
});
