# 🎵 Hintergrundmusik-Verwaltung - Anleitung für Freelancer

Diese Anleitung erklärt, wie du Hintergrundmusik-Tracks für Ressourcen hochlädst und verwaltest.

## 📋 Voraussetzungen

1. **Admin-Zugang**: Du musst als Admin eingeloggt sein
2. **Supabase Storage**: Der `background-music` Bucket muss existieren und öffentlich zugänglich sein
3. **Datenbank-Setup**: Die Tabelle `background_music_tracks` muss erstellt sein (siehe `supabase-music-setup.sql`)

## 🚀 Erste Schritte

### 1. Datenbank einrichten

Falls noch nicht geschehen, führe das SQL-Skript in Supabase aus:

1. Gehe zu deinem Supabase-Projekt
2. Öffne den **SQL Editor**
3. Öffne die Datei `supabase-music-setup.sql`
4. **WICHTIG**: Ersetze `'deine-admin-email@example.com'` mit deiner tatsächlichen Admin-Email
5. Führe das Skript aus

### 2. Auf die Admin-Seite zugreifen

1. Logge dich in die App ein (mit deiner Admin-Email)
2. Gehe zu: `/admin/music`
3. Oder klicke auf "Zurück zu Admin Analytics" und navigiere zur Musik-Verwaltung

## 📤 Track hochladen

### Schritt-für-Schritt:

1. **Ressource auswählen**
   - Wähle die Ressource aus dem Dropdown-Menü (z.B. "Lilith", "Oma", etc.)
   - Du siehst alle verfügbaren echten und fiktiven Figuren

2. **MP3-Datei auswählen**
   - Klicke auf "Datei auswählen"
   - Wähle eine MP3-Datei von deinem Computer
   - **Wichtig**: Nur MP3-Dateien werden unterstützt

3. **Metadaten eingeben** (optional)
   - **Titel**: Ein beschreibender Name für den Track (z.B. "Mystical Ambience")
   - **Künstler**: Name des Künstlers oder der Quelle (z.B. "Premium Beat")

4. **Standard-Track setzen**
   - Aktiviere das Häkchen "Als Standard-Track setzen", wenn dieser Track automatisch abgespielt werden soll
   - **Wichtig**: Pro Ressource sollte nur ein Track als Standard markiert sein
   - Wenn du einen neuen Standard-Track setzt, wird der alte automatisch entfernt

5. **Hochladen**
   - Klicke auf "Track hochladen"
   - Die Datei wird zu Supabase Storage hochgeladen
   - Der Track wird in der Datenbank gespeichert
   - Du siehst eine Erfolgsmeldung

## 🎧 Tracks verwalten

### Vorhandene Tracks anzeigen

- Nach dem Auswählen einer Ressource siehst du alle vorhandenen Tracks
- Jeder Track zeigt:
  - Titel (oder Track-ID falls kein Titel gesetzt)
  - Künstler (falls vorhanden)
  - URL des Tracks
  - Standard-Status (grünes Badge)

### Track abspielen

- Klicke auf "Abspielen" um den Track anzuhören
- Klicke auf "Pausieren" um die Wiedergabe zu stoppen

### Standard-Track ändern

- Klicke auf "Als Standard setzen" bei einem anderen Track
- Der bisherige Standard-Track wird automatisch entfernt
- Der neue Track wird als Standard markiert

### Track löschen

- Klicke auf "Löschen" bei dem Track, den du entfernen möchtest
- Bestätige die Löschung
- **Achtung**: Die Datei wird auch aus Supabase Storage gelöscht (falls möglich)

## 🔧 Technische Details

### Dateinamen

Tracks werden automatisch benannt mit folgendem Format:
```
{figure_id}_{timestamp}_{random_id}.mp3
```

Beispiel: `lilith_1704123456789_abc123xyz.mp3`

### Supabase Storage

- **Bucket**: `background-music`
- **Zugriff**: Öffentlich (für die App)
- **Format**: MP3 nur

### Datenbank-Struktur

Die Tabelle `background_music_tracks` speichert:
- `figure_id`: ID der Ressource (z.B. "lilith")
- `figure_name`: Name der Ressource (z.B. "Lilith")
- `track_id`: Eindeutige Track-ID
- `track_url`: Öffentliche URL zum Track
- `track_title`: Optionaler Titel
- `track_artist`: Optionaler Künstler
- `is_default`: Ob dieser Track automatisch abgespielt wird

## ❓ Häufige Fragen

### Kann ich mehrere Tracks pro Ressource haben?

Ja! Du kannst beliebig viele Tracks pro Ressource hochladen. Nur einer sollte als Standard markiert sein.

### Was passiert mit dem alten Track, wenn ich einen neuen Standard setze?

Der alte Standard-Track bleibt erhalten, verliert aber seinen Standard-Status. Der neue Track wird als Standard markiert.

### Kann ich Tracks später ändern?

Ja, du kannst:
- Den Standard-Status ändern
- Tracks löschen
- Neue Tracks hinzufügen

**Hinweis**: Titel und Künstler können aktuell nicht bearbeitet werden. Lösche den Track und lade ihn erneut hoch, wenn du die Metadaten ändern möchtest.

### Warum sehe ich keine Tracks?

Mögliche Gründe:
1. Die Ressource wurde noch nicht ausgewählt
2. Es wurden noch keine Tracks für diese Ressource hochgeladen
3. Es gibt ein Problem mit der Datenbank-Verbindung

### Kann ich Tracks für alle Ressourcen auf einmal sehen?

Nein, aktuell siehst du nur Tracks für die ausgewählte Ressource. Das macht die Verwaltung übersichtlicher.

## 🐛 Fehlerbehebung

### "Fehler beim Hochladen"

- Prüfe, ob die Datei wirklich eine MP3-Datei ist
- Prüfe, ob die Datei nicht zu groß ist (empfohlen: < 10MB)
- Prüfe, ob du als Admin eingeloggt bist
- Prüfe die Browser-Konsole für detaillierte Fehlermeldungen

### "Zugriff verweigert"

- Stelle sicher, dass du mit deiner Admin-Email eingeloggt bist
- Prüfe, ob deine Email in `NEXT_PUBLIC_ADMIN_EMAILS` eingetragen ist
- Prüfe, ob die RLS-Policies in Supabase korrekt eingerichtet sind

### "Track wird nicht abgespielt"

- Prüfe, ob der Track als Standard markiert ist
- Prüfe, ob die URL in der Datenbank korrekt ist
- Prüfe, ob die Datei in Supabase Storage existiert und öffentlich zugänglich ist

## 📞 Support

Bei Fragen oder Problemen, kontaktiere bitte den Projekt-Administrator.

