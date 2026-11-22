# Bearbeitbare Seitentexte (Admin-Texteditor)

Jeder sichtbare Text der Website kann von Admins bearbeitet werden – direkt auf
der Seite oder unter `/admin/texte`. Änderungen werden zuerst als **Entwurf**
gespeichert und erst mit **Veröffentlichen** für alle sichtbar.

## Einrichten (einmalig)

1. In Supabase (SQL Editor) ausführen:
   `supabase/migrations/20261120120000_site_texts.sql`
   – zurück: `supabase/rollback/20261120120000_site_texts_down.sql`
2. Fertig. Bearbeiten dürfen alle E-Mails aus `NEXT_PUBLIC_ADMIN_EMAILS`
   (volle Admins, keine Musik-Admins). Optional `ADMIN_EMAILS` (nur Server) setzen –
   dann gilt diese Liste. Wer dort steht, muss aktuell auch in
   `NEXT_PUBLIC_ADMIN_EMAILS` stehen, sonst erscheint der Knopf nicht.

Ohne Migration läuft die Seite normal weiter: überall erscheinen die
Original-Texte, der Editor meldet „Text-Tabellen fehlen“.

## Für Admins

- Angemeldet erscheint unten links **„Texte bearbeiten“**.
- Text anklicken (oder Stift) → direkt tippen → **Enter** übernimmt
  (Shift+Enter = neue Zeile, Esc = abbrechen). Übernommen = Entwurf, automatisch gespeichert.
- **Diese Seite**: alle Texte der Seite, auch ohne festen Platz (Platzhalter,
  Fehlermeldungen, Alternativtexte, andere Zustände).
- **Vorschau**: Seite mit Entwürfen so ansehen, wie Besucher sie sehen würden.
- **Veröffentlichen**: Liste alt → neu mit „von wem · wann“. Vorausgewählt sind
  nur die eigenen Entwürfe (Entwürfe anderer Admins sind markiert; „Alle“ /
  „Nur meine“ / „Keine“), dann live.
- **Verlauf**: wer hat wann was veröffentlicht; jede frühere Version lässt sich
  als Entwurf zurückholen. **Original** setzt auf den Text aus dem Code zurück.
- **Buttons/Links benutzen**: Ein Klick auf einen Text öffnet den Editor. Liegt
  der Text in einem Button oder Link, erscheint beim Überfahren zusätzlich
  **„Klicken“ / „Link öffnen“** (auch in der Werkzeugleiste, für Touch) – so
  lassen sich Menüs, Player und andere Seiten im Bearbeitungsmodus öffnen.
- Offene Eingaben gehen nicht verloren: Vorschau, Fertig und „Alle Texte“
  übernehmen sie zuerst; beim Schließen/Neuladen fragt der Browser nach.
- Ist ein Fenster der Seite offen (Player, Einstellungen …), wird die Leiste
  zu einer kleinen Pille oben in der Mitte, damit dessen Knöpfe frei bleiben.
- **Browser-Übersetzung**: Bearbeiten/Vorschau sperren die Übersetzung. Ist die
  Seite schon übersetzt, startet der Editor nicht (Hinweis „Original anzeigen“
  + neu laden) – sonst würden Texte doppelt erscheinen oder übersetzt gespeichert.
- Variablen wie `{name}` erscheinen als Chips mit Erklärung – Klick fügt ein.
  Unbekannte Variablen werden abgelehnt, fehlende als Hinweis gemeldet.
- Fett/Links (`**fett**`, `[Text](/pfad)`) nur bei Texten, die das erlauben.
  Impressum/Datenschutz haben einen großen Editor mit Vorschau
  (Überschriften, Listen).
- `/admin/texte`: alle Texte, Suche, Filter (Entwürfe, geändert,
  „Original im Code geändert“), Veröffentlichen, Verlauf.
- Ausprobieren ohne Risiko: `/test/text-editor` (speichert nur im Browser).

## Wie es funktioniert

```
src/content/texts/<bereich>.ts   Katalog: Schlüssel + Original-Text (Code)
src/content/texts/index.ts       alle Bereiche (nur Server + Editor)
src/lib/site-texts/              define, format (Prüfung, Auszeichnung), render, server, API-Helfer
src/components/site-text/        SiteTextProvider, <T>, useText, Editor (lazy, nur Admins)
src/app/api/admin/site-texts/    session, GET, drafts, publish, history
src/app/admin/texte/             Übersicht
```

- **Datenbank** speichert nur Abweichungen: `site_texts` (live),
  `site_text_drafts` (Entwürfe, `value = NULL` = zurück aufs Original),
  `site_text_revisions` (Verlauf). RLS an, keine Policies – nur der Server
  (Service Role) liest und schreibt.
- **Lesen kostet nichts**: Das Root-Layout holt die veröffentlichten Texte über
  `unstable_cache` (Tag `site-texts`). Besucher lösen keine DB-Abfrage aus;
  gelesen wird sofort nach dem nächsten Veröffentlichen (`revalidateTag`),
  sonst höchstens alle 5 Minuten. Seiten bleiben statisch (stündliche
  Auffrischung als Netz). Tabellen direkt in Supabase geändert/geleert →
  spätestens nach ~5 Minuten für Besucher sichtbar.
- **Schreiben**: eine API-Route pro Aktion, Admin-Prüfung über die
  Supabase-Session (Cookie), Prüfung gegen den Katalog (Schlüssel existiert,
  Variablen, Länge, Link-Ziele), Veröffentlichen in **einer** Transaktion
  (`publish_site_texts`).
- **Besucher-Bundle**: `<T>` rendert nur den String, kein Wrapper-Element.
  Editor-Code und der Gesamtkatalog werden nur für Admins nachgeladen. Jede
  Seite lädt nur die Katalogdateien, die sie importiert.
- **Sicherheit**: Texte werden nie als HTML eingefügt. Auszeichnung wird in
  React-Elemente übersetzt; Links nur `/pfad`, `#anker`, `https://`, `mailto:`, `tel:`.

## Neue Texte / neue Seite (für Entwickler)

1. Text in den passenden Katalog schreiben (oder neuen Bereich anlegen und in
   `src/content/texts/index.ts` eintragen):

   ```ts
   export const beispiel = defineTexts("beispiel", {
     "hero.title": { text: "Willkommen", label: "Hero: Überschrift" },
     "hero.hint": { text: "Hallo {name}!", vars: { name: "Vorname" }, label: "Hero: Gruß" },
     "list.count": { one: "1 Eintrag", other: "{count} Einträge" },          // Plural
     "legal.block": { text: "## Titel\nAbsatz", format: "markdown" },          // langer Text
     "cta.note": { text: "Mehr unter [FAQ](/faq)", format: "inline" },        // fett/Links
   });
   ```

2. Im Code verwenden:

   ```tsx
   <T t={beispiel["hero.title"]} />
   <T t={beispiel["hero.hint"]} vars={{ name }} />
   <T t={beispiel["list.count"]} vars={{ count }} />
   <TextBlock t={beispiel["legal.block"]} classNames={{ h2: "…", p: "…" }} />
   const placeholder = useText(beispiel["hero.title"]);      // String (placeholder, aria-label …)
   const tx = useTextFn(); alert(tx(beispiel["hero.hint"], { name }));   // in Callbacks
   const title = await getText(meta["site.title"]);            // Server (Metadaten, Server Actions)
   ```

Regeln:

- **Schlüssel nie umbenennen**, wenn der Text schon bearbeitet sein könnte – die
  Änderung hinge sonst am alten Schlüssel (erscheint in `/admin/texte` als
  „nicht mehr verwendet“). Original-Text ändern ist dagegen gefahrlos: Der
  Editor zeigt dann „Original im Code geändert“.
- Grammatik bleibt im Code: Wo Artikel von der Figur abhängen („deine Oma“,
  „den Erzengel Michael“), setzt der Code eine Variable ein und nur der Satz ist
  bearbeitbar (siehe `createStory.voice.subline`).
- `label` kurz und für Admins verständlich halten – es steht in Panels und Verlauf.
- `multiline: false` für Buttons und Überschriften, die keine Zeilenumbrüche haben dürfen.

## Bewusst nicht enthalten

- Inhalte aus `src/data` (Figuren, Fragen, Antwortvorschläge, FAQ-Daten) und
  KI-Prompts – das sind strukturierte Inhalte; eigener Schritt bei Bedarf.
- E-Mails (`src/lib/email.ts`) und die Auth-E-Mail-Vorlagen im Supabase-Dashboard.
- Seiten, die nirgends verlinkt sind (`/faq` auf Englisch, `/dashboard/user-settings`,
  `/subscription`, alte Landing-Varianten) und toter Code (z. B. `AccountCreated`,
  das alte Anmelde-Modal in `AudioPlayback`, `playAudio` im Dashboard).
- Technische Diagnosemeldungen im Musik-Test des Admin-Bereichs (mit URLs/Status).
- Die Oberfläche des Editors selbst.

## Status (2026-11-21)

Umgesetzt auf Branch `feature/site-texts` (nicht committet): Startseite, Kopf-/Fußzeile,
Einwilligungs-Banner, Dashboard inkl. Einstellungen und Dialogen, Story-Erstellung
(Figur, Fragen, Stimme, Name, Warten, Player), Engel-Flow (E-Mail-Schritt), Player &
Musik, Zugang/Passwort/Bezahl-Dialoge, Profil, `/figur`, Seitentitel & Link-Vorschau,
Impressum & Datenschutz, Admin-Bereich (Menü, Kostprobe, Analytics, Musik, manuelle
Ressource). Rund 1.000 Texte in 12 Bereichen.

QA-Runde 2026-11-22 behoben: Doppelte Texte bei Browser-Übersetzung, übersetzter Text
als Entwurf, verlorene Eingabe bei „Vorschau“, Seiten-CSS traf den Bearbeitungsrahmen
(neutraler Reset auf `.st-text`), Leiste verdeckte Player/Dialoge, hängender Stift,
„Alles veröffentlicht“ während des Ladens (jetzt „Lädt Entwürfe …“ + Tab-Cache),
Veröffentlichen mit Autor/eigener Auswahl, Buttons/Links im Bearbeitungsmodus,
Verlauf lud bei jedem Speichern neu, Vorschau im großen Editor mit den Klassen der Seite,
doppelte Leiste auf `/test/text-editor` für angemeldete Admins.
