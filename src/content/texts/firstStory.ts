import { defineTexts } from "@/lib/site-texts/define";

/*
 * Engel-Flow: E-Mail-Schritt nach den Fragen (Erststory).
 * "gate.*" gilt für beide Varianten (Server-Flow = Standard, Browser-Flow =
 * Ausweichlösung über NEXT_PUBLIC_FIRST_STORY_SERVER_FLOW=0).
 */
export const firstStory = defineTexts("firstStory", {
  // Gemeinsam
  "gate.kicker": { text: "DEINE ERSTE POWER STORY", label: "Zeile über der Überschrift", multiline: false },
  "gate.title": { text: "Dein Engel ist bereit.", label: "Überschrift" },
  "gate.note": { text: "Kostenlos und ohne Passwort", label: "Hinweis mit Haken", multiline: false },
  "gate.invalidEmail": { text: "Bitte gib eine gültige E-Mail-Adresse ein.", label: "Fehler: ungültige E-Mail" },
  "gate.sendFailed": { text: "Der Link konnte nicht gesendet werden. Bitte versuche es erneut.", label: "Fehler: Link nicht gesendet" },
  "gate.retry": { text: "Erneut versuchen", label: "Erneut versuchen", multiline: false },
  "gate.sentTitle": { text: "Schau in dein Postfach.", label: "Link gesendet: Überschrift" },
  "gate.otherEmail": { text: "Andere E-Mail verwenden", label: "Link gesendet: andere E-Mail", multiline: false },
  "gate.resendIn": { text: "Erneut senden in {seconds} s", vars: { seconds: "Sekunden bis zum erneuten Senden" }, label: "Link gesendet: Wartezeit", multiline: false },
  "gate.resend": { text: "Link erneut senden", label: "Link gesendet: erneut senden", multiline: false },
  "gate.formTitle": { text: "Mit E-Mail fortfahren", label: "Formular: Überschrift" },
  "gate.emailLabel": { text: "Deine E-Mail-Adresse", label: "Formular: Feld", multiline: false },
  "gate.emailPlaceholder": { text: "du@beispiel.de", label: "Formular: Platzhalter", multiline: false },
  "gate.sending": { text: "Link wird gesendet …", label: "Formular: Button während des Sendens", multiline: false },
  "gate.send": { text: "Zugangslink senden", label: "Formular: Button", multiline: false },
  "gate.fineprint": { text: "Für neue und bestehende Accounts.", label: "Formular: Kleingedrucktes", multiline: false },

  // Server-Flow (Standard)
  "server.intro": {
    text: "Deine Antworten sind gespeichert. Gib deine E-Mail-Adresse ein – wir erstellen deine persönliche Power Story und schicken dir einen Link direkt in deinen Bereich.",
    label: "Server-Flow: Text",
  },
  "server.linkInvalid": {
    text: "Dieser Link ist nicht mehr gültig. Gib deine E-Mail-Adresse ein, dann senden wir dir einen neuen.",
    label: "Server-Flow: abgelaufener Link",
  },
  "server.startFailed": { text: "Deine Story konnte nicht gestartet werden. Bitte versuche es erneut.", label: "Server-Flow: Start fehlgeschlagen" },
  "server.phase.none": { text: "Deine Antworten sind gespeichert.", label: "Server-Flow: Stand – gespeichert" },
  "server.phase.text": { text: "Deine persönliche Geschichte entsteht gerade …", label: "Server-Flow: Stand – Text entsteht" },
  "server.phase.audio": { text: "Dein Text ist fertig. Kerstins Stimme wird gerade aufgenommen …", label: "Server-Flow: Stand – Stimme entsteht" },
  "server.phase.ready": { text: "Deine Power Story ist fertig und wartet auf dich.", label: "Server-Flow: Stand – fertig" },
  "server.phase.claimed": { text: "Deine Power Story ist in deinem Bereich gespeichert.", label: "Server-Flow: Stand – gespeichert im Bereich" },
  "server.phase.failed": { text: "Beim Erstellen deiner Story ist etwas schiefgelaufen.", label: "Server-Flow: Stand – Fehler" },
  "server.failedNote": { text: "Deine Antworten sind weiterhin gespeichert.", label: "Server-Flow: Fehler, Hinweis" },
  "server.signedInTitle": { text: "Deine Power Story wird vorbereitet.", label: "Server-Flow (angemeldet): Überschrift" },
  "server.signedInText": {
    text: "Einen Moment – wir bringen dich gleich in deinen Bereich. Dort erscheint deine Story, sobald sie fertig ist.",
    label: "Server-Flow (angemeldet): Text",
  },
  "server.claimedTitle": { text: "Deine Story wartet auf dich.", label: "Server-Flow: bereits angemeldet, Überschrift" },
  "server.claimedText": {
    text: "Du bist über den Link angemeldet. Deine Power Story ist in deinem Bereich gespeichert.",
    label: "Server-Flow: bereits angemeldet, Text",
  },
  "server.claimedCta": { text: "Zu meiner Power Story", label: "Server-Flow: bereits angemeldet, Button", multiline: false },
  "server.sentText": {
    text: "Wir haben einen Link an **{email}** geschickt.",
    format: "inline",
    vars: { email: "E-Mail-Adresse" },
    label: "Server-Flow: Link gesendet, Text",
  },
  "server.sentHint": {
    text: "Ein Klick darauf bringt dich direkt in deinen Bereich – in jedem Browser und auf jedem Gerät. Dieses Fenster kannst du danach schließen. Prüfe auch deinen Spam-Ordner.",
    label: "Server-Flow: Link gesendet, Hinweis",
  },
  "server.formText": {
    text: "Wir schicken dir einen Link. Ein Klick darauf – und du bist direkt in deinem Bereich, wo deine Story auf dich wartet.",
    label: "Server-Flow: Formular, Text",
  },

  // Browser-Flow (Ausweichlösung)
  "email.intro": {
    text: "Deine Antworten warten auf dich. Melde dich mit deiner E-Mail an, damit wir deine persönliche Power Story erstellen und für dich speichern können.",
    label: "Browser-Flow: Text",
  },
  "email.linkInvalid": {
    text: "Dieser Zugangslink ist nicht mehr gültig. Gib deine E-Mail-Adresse ein, dann senden wir dir einen neuen.",
    label: "Browser-Flow: abgelaufener Link",
  },
  "email.rateLimited": { text: "Bitte warte kurz, bevor du einen neuen Link anforderst.", label: "Browser-Flow: zu viele Anfragen" },
  "email.prep.ready": { text: "Deine Power Story ist bereits fertig. Nach dem Login speichern wir sie in deinem Account.", label: "Browser-Flow: Stand – fertig" },
  "email.prep.audio": { text: "Dein Text ist fertig. Kerstins Stimme wird gerade vorbereitet …", label: "Browser-Flow: Stand – Stimme" },
  "email.prep.text": { text: "Deine persönliche Geschichte entsteht schon, während du dich anmeldest …", label: "Browser-Flow: Stand – Text" },
  "email.prep.error": { text: "Die Vorbereitung wurde unterbrochen. Deine Antworten sind weiterhin gespeichert.", label: "Browser-Flow: Stand – Fehler" },
  "email.prep.idle": { text: "Deine Geschichte wird im Hintergrund vorbereitet.", label: "Browser-Flow: Stand – wartet" },
  "email.sentText": {
    text: "Wir haben einen Zugangslink an **{email}** geschickt.",
    format: "inline",
    vars: { email: "E-Mail-Adresse" },
    label: "Browser-Flow: Link gesendet, Text",
  },
  "email.sentHint": {
    text: "Öffne den Link am besten in diesem Browser, damit deine Antworten direkt weiterverwendet werden. Prüfe auch deinen Spam-Ordner.",
    label: "Browser-Flow: Link gesendet, Hinweis",
  },
  "email.formText": {
    text: "Wir schicken dir einen Link. Deine Story wird bereits vorbereitet und nach dem Login in deinem Account gespeichert.",
    label: "Browser-Flow: Formular, Text",
  },
});
