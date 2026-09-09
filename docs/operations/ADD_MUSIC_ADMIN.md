# Admin-Zugang hinzufügen: tahirwaleed399@gmail.com

**HINWEIS:** Diese Email wurde als **Full-Admin** konfiguriert (nicht nur Music-Admin).

## Schritt-für-Schritt-Anleitung

### Schritt 1: Öffne die `.env.local` Datei

Die `.env.local` Datei befindet sich im Root-Verzeichnis des Projekts:
```
/Users/andy/Documents/GitHub/ressourcen-nextjs/.env.local
```

### Schritt 2: Füge die Email hinzu

**Für Full-Admin (Analytics + Music):**
Suche nach der Zeile:
```env
NEXT_PUBLIC_ADMIN_EMAILS=...
```

Füge die neue Email mit einem Komma hinzu:
```env
NEXT_PUBLIC_ADMIN_EMAILS=heilung@knobelsdorff-therapie.de,tahirwaleed399@gmail.com
```

**Für Music-Admin (nur Musik-Verwaltung):**
Falls du nur Music-Admin-Zugang geben möchtest, füge zur Zeile hinzu:
```env
NEXT_PUBLIC_MUSIC_ADMIN_EMAILS=andreas@knobelsdorff-therapie.de,tahirwaleed399@gmail.com
```

### Schritt 3: Speichere die Datei

Speichere die `.env.local` Datei.

### Schritt 4: Starte den Server neu

Der Server muss neu gestartet werden, damit die Änderungen wirksam werden:

```bash
# Stoppe den Server (Ctrl+C)
# Starte ihn neu:
npm run dev
```

### Schritt 5: Teste den Zugang

1. Logge dich mit `tahirwaleed399@gmail.com` ein
2. Gehe zu http://localhost:3000/admin/music
3. Gehe zu http://localhost:3000/admin/analytics
4. Du solltest Zugriff auf **beide** Seiten haben (Full-Admin)

## Berechtigungen

**Als Full-Admin hat `tahirwaleed399@gmail.com` Zugriff auf:**
- ✅ `/admin/music` - Musik-Verwaltung (Tracks hochladen, bearbeiten, testen)
- ✅ `/admin/analytics` - Admin Analytics (Kundendaten, Statistiken)
- ✅ Musik-Tracks hochladen und verwalten
- ✅ Musik-Tracks bearbeiten (Link, Lautstärke)
- ✅ Musik-Tracks testen
- ✅ "Als Standard setzen" für Tracks
- ✅ Alle Ressourcen ansehen und verwalten
- ✅ Vollständige Admin-Rechte

## Für Production (Vercel)

Falls die App auf Vercel deployed ist:

1. Gehe zu Vercel Dashboard
2. Wähle dein Projekt
3. Gehe zu "Settings" → "Environment Variables"
4. Suche nach `NEXT_PUBLIC_ADMIN_EMAILS` (für Full-Admin) oder `NEXT_PUBLIC_MUSIC_ADMIN_EMAILS` (für Music-Admin)
5. Füge `tahirwaleed399@gmail.com` hinzu (mit Komma trennen, falls andere Emails vorhanden)
6. Redeploy die App

## Aktuelle Konfiguration prüfen

Um zu prüfen, welche Emails aktuell konfiguriert sind, kannst du in der Browser-Console nachsehen:
- Öffne die Browser-Console (F12)
- Suche nach `[isAdminUser] Admin check:` Logs
- Diese zeigen die konfigurierten Admin-Emails

