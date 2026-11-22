import { defineTexts } from "@/lib/site-texts/define";

/*
 * Admin: manuelle Ressource für Klient:innen (Dialog im Dashboard) und
 * Audio-Aufnahme. Eigener Bereich, damit das Dashboard nicht den ganzen
 * Admin-Katalog laden muss.
 */
export const adminClient = defineTexts("adminClient", {
  // Manuelle Ressource für Klient:innen
  "client.step.record": { text: "Aufnehmen", label: "Manuelle Ressource: Schritt 1", multiline: false },
  "client.step.collection": { text: "Sammlung", label: "Manuelle Ressource: Schritt 2", multiline: false },
  "client.step.send": { text: "Versenden", label: "Manuelle Ressource: Schritt 3", multiline: false },
  "client.title": { text: "Ressource für Klienten erstellen", label: "Manuelle Ressource: Überschrift" },
  "client.intro": { text: "Du kannst mehrere Aufnahmen sammeln und gemeinsam versenden.", label: "Manuelle Ressource: Text" },
  "client.close": { text: "Schließen", label: "Manuelle Ressource: schließen (Screenreader)", multiline: false },
  "client.progress": { text: "Fortschritt", label: "Manuelle Ressource: Schritte (Screenreader)", multiline: false },
  "client.sentMany": { text: "{count} Ressourcen erfolgreich versendet", vars: { count: "Anzahl" }, label: "Manuelle Ressource: mehrere versendet", multiline: false },
  "client.sentOne": { text: "Ressource erfolgreich versendet", label: "Manuelle Ressource: eine versendet", multiline: false },
  "client.sentNote": {
    text: "Eine Email wurde an {email} verschickt. Die Ressourcen erscheinen nicht in deinem Dashboard, sondern werden dem Klienten nach Login/Registrierung zugeordnet.",
    vars: { email: "E-Mail der Klient:in" },
    label: "Manuelle Ressource: versendet, Hinweis",
  },
  "client.nameLabel": { text: "Name der Ressource", label: "Manuelle Ressource: Feld Name", multiline: false },
  "client.namePlaceholder": { text: "z.B. Oma, Engel, Krafttier...", label: "Manuelle Ressource: Name, Platzhalter", multiline: false },
  "client.collected": {
    one: "{count} Aufnahme gesammelt",
    other: "{count} Aufnahmen gesammelt",
    label: "Manuelle Ressource: Anzahl Aufnahmen",
    multiline: false,
  },
  "client.recordMore": { text: "Weitere aufnehmen", label: "Manuelle Ressource: weitere aufnehmen", multiline: false },
  "client.remove": { text: "Entfernen", label: "Manuelle Ressource: entfernen (Tooltip)", multiline: false },
  "client.noRecordings": { text: "Noch keine Aufnahmen gesammelt.", label: "Manuelle Ressource: keine Aufnahmen" },
  "client.emailLabel": { text: "E-Mail-Adresse des Klienten", label: "Manuelle Ressource: Feld E-Mail", multiline: false },
  "client.emailPlaceholder": { text: "klient@beispiel.de", label: "Manuelle Ressource: E-Mail, Platzhalter", multiline: false },
  "client.emailNote": {
    text: "Der Klient erhält eine E‑Mail mit Zugangslink. Die Ressourcen erscheinen nicht in deinem Dashboard, sondern werden nach dem Login automatisch seinem Account zugeordnet.",
    label: "Manuelle Ressource: E-Mail, Hinweis",
  },
  "client.willSend": { text: "Wird versendet", label: "Manuelle Ressource: Liste wird versendet", multiline: false },
  "client.cancel": { text: "Abbrechen", label: "Manuelle Ressource: abbrechen", multiline: false },
  "client.back": { text: "Zurück", label: "Manuelle Ressource: zurück", multiline: false },
  "client.addRecording": { text: "Aufnahme übernehmen", label: "Manuelle Ressource: Aufnahme übernehmen", multiline: false },
  "client.next": { text: "Weiter", label: "Manuelle Ressource: weiter", multiline: false },
  "client.sending": { text: "Wird versendet...", label: "Manuelle Ressource: versendet", multiline: false },
  "client.send": { text: "Versenden", label: "Manuelle Ressource: versenden", multiline: false },
  "client.error.name": { text: "Bitte gib einen Namen für die Ressource ein.", label: "Manuelle Ressource: Name fehlt" },
  "client.error.recording": { text: "Bitte nimm zuerst eine Audio-Aufnahme auf.", label: "Manuelle Ressource: Aufnahme fehlt" },
  "client.error.noResources": { text: "Bitte füge mindestens eine Ressource hinzu.", label: "Manuelle Ressource: keine Ressource" },
  "client.error.email": { text: "Bitte gib eine Klienten-Email ein.", label: "Manuelle Ressource: E-Mail fehlt" },
  "client.error.upload": {
    text: "Fehler beim Hochladen von \"{name}\": {message}",
    vars: { name: "Name der Ressource", message: "technische Fehlermeldung" },
    label: "Manuelle Ressource: Upload-Fehler",
  },
  "client.error.send": { text: "Fehler beim Versenden der Ressourcen.", label: "Manuelle Ressource: Versand fehlgeschlagen" },
  "client.error.noneSaved": { text: "Keine Ressource konnte gespeichert werden. Bitte erneut versuchen.", label: "Manuelle Ressource: nichts gespeichert" },
  "client.error.emailFailed": {
    text: "Ressource wurde gespeichert, aber die E-Mail konnte nicht versendet werden{detail}. Bitte prüfe Resend/Vercel-Logs oder sende den Link manuell erneut.",
    vars: { detail: "technischer Grund in Klammern (setzt der Code)" },
    label: "Manuelle Ressource: E-Mail fehlgeschlagen",
  },
  "client.error.sendRetry": { text: "Fehler beim Versenden der Ressourcen. Bitte versuche es erneut.", label: "Manuelle Ressource: Versand fehlgeschlagen (Hinweis)" },

  // Aufnahme
  "recorder.denied": {
    text: "Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.",
    label: "Aufnahme: Mikrofon verweigert",
  },
  "recorder.deniedReload": {
    text: "Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen und lade die Seite neu.",
    label: "Aufnahme: Mikrofon verweigert (Hinweis)",
  },
  "recorder.error": { text: "Fehler beim Aufnehmen. Bitte versuche es erneut.", label: "Aufnahme: Fehler" },
  "recorder.maxReached": {
    text: "Maximale Aufnahmezeit von {minutes} Minuten erreicht.",
    vars: { minutes: "Minuten" },
    label: "Aufnahme: maximale Zeit erreicht",
  },
  "recorder.startError": { text: "Fehler beim Starten der Aufnahme. Bitte erlaube den Mikrofon-Zugriff.", label: "Aufnahme: Start fehlgeschlagen" },
  "recorder.previewError": { text: "Fehler beim Abspielen der Vorschau.", label: "Aufnahme: Vorschau-Fehler" },
  "recorder.mic": { text: "Mikrofon", label: "Aufnahme: Feld Mikrofon", multiline: false },
  "recorder.micLoading": { text: "Mikrofone werden geladen...", label: "Aufnahme: Mikrofone laden", multiline: false },
  "recorder.micFallback": { text: "Mikrofon {number}", vars: { number: "Nummer" }, label: "Aufnahme: Mikrofon ohne Namen", multiline: false },
  "recorder.locked": { text: "Während der Aufnahme nicht änderbar.", label: "Aufnahme: Mikrofon gesperrt" },
  "recorder.paused": { text: "Pausiert", label: "Aufnahme: pausiert", multiline: false },
  "recorder.recording": { text: "Aufnahme läuft", label: "Aufnahme: läuft", multiline: false },
  "recorder.done": { text: "Aufnahme fertig", label: "Aufnahme: fertig", multiline: false },
  "recorder.start": { text: "Aufnahme starten", label: "Aufnahme: starten", multiline: false },
  "recorder.resume": { text: "Fortsetzen", label: "Aufnahme: fortsetzen", multiline: false },
  "recorder.pause": { text: "Pausieren", label: "Aufnahme: pausieren", multiline: false },
  "recorder.stop": { text: "Aufnahme beenden", label: "Aufnahme: beenden", multiline: false },
  "recorder.previewPause": { text: "Vorschau pausieren", label: "Aufnahme: Vorschau pausieren (Tooltip)", multiline: false },
  "recorder.previewPlay": { text: "Vorschau anhören", label: "Aufnahme: Vorschau anhören (Tooltip)", multiline: false },
  "recorder.playing": { text: "Wird abgespielt", label: "Aufnahme: wird abgespielt", multiline: false },
  "recorder.listen": { text: "Anhören", label: "Aufnahme: anhören", multiline: false },
  "recorder.discardTitle": { text: "Aufnahme verwerfen und neu aufnehmen", label: "Aufnahme: verwerfen (Tooltip)", multiline: false },
  "recorder.redo": { text: "Neu aufnehmen", label: "Aufnahme: neu aufnehmen", multiline: false },
  "recorder.hintRecording": { text: "Sprich jetzt deine Ressourcen-Geschichte ein...", label: "Aufnahme: Hinweis während der Aufnahme" },
  "recorder.hintDone": { text: "Höre die Aufnahme an oder nimm sie neu auf.", label: "Aufnahme: Hinweis nach der Aufnahme" },
  "recorder.hintIdle": { text: "Wähle dein Mikrofon und starte die Aufnahme.", label: "Aufnahme: Hinweis vor der Aufnahme" },
});
