# Storage Policies für Music-Admins - Setup-Anleitung

## Problem

Der Music Freelancer kann große Dateien (> 4 MB) nicht hochladen, weil:
1. Next.js/Vercel hat ein Body-Size-Limit von 4.5 MB für API-Routen
2. Der direkte Upload zu Supabase Storage benötigt Storage-Policies
3. Aktuell gibt es keine Storage-Policies für den `background-music` Bucket

## Lösung

Wir haben zwei Upload-Methoden implementiert:

### 1. Standard-Upload (für kleine Dateien < 4 MB)
- Datei wird über die API-Route `/api/admin/music/upload` hochgeladen
- Funktioniert für Dateien bis 4.5 MB
- Verwendet Admin-Client (umgeht RLS)

### 2. Direkter Upload (für große Dateien > 4 MB)
- Datei wird direkt vom Client zu Supabase Storage hochgeladen
- Umgeht das Body-Size-Limit von Next.js/Vercel
- Benötigt Storage-Policies für den `background-music` Bucket

## Setup-Schritte

### Schritt 1: Storage-Policies erstellen

1. Gehe zu deinem Supabase-Projekt
2. Öffne den **SQL Editor**
3. Öffne die Datei `supabase-music-storage-policies.sql`
4. Führe das Skript aus (keine Email-Adressen mehr nötig!)

### Schritt 2: Admin-Emails zur Tabelle hinzufügen

Nach dem Ausführen des Skripts musst du die Admin-Emails zur `music_admins` Tabelle hinzufügen:

```sql
-- Füge Full-Admin hinzu
INSERT INTO public.music_admins (email, admin_type)
VALUES ('deine-admin-email@example.com', 'full')
ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;

-- Füge Music-Admin (Freelancer) hinzu
INSERT INTO public.music_admins (email, admin_type)
VALUES ('freelancer@example.com', 'music')
ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;
```

**Vorteil:** Du kannst später weitere Music-Admins hinzufügen, ohne die Policies ändern zu müssen:

```sql
-- Weitere Music-Admins hinzufügen
INSERT INTO public.music_admins (email, admin_type)
VALUES ('neue-freelancerin@example.com', 'music')
ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;
```

### Schritt 3: Prüfe Environment Variables

Stelle sicher, dass die Email-Adressen in den Environment Variables korrekt sind:

**Vercel Environment Variables:**
- `NEXT_PUBLIC_ADMIN_EMAILS` - Full-Admins (kommagetrennt)
- `NEXT_PUBLIC_MUSIC_ADMIN_EMAILS` - Music-Admins (kommagetrennt)

**Lokal (.env.local):**
```env
NEXT_PUBLIC_ADMIN_EMAILS=deine-admin-email@example.com
NEXT_PUBLIC_MUSIC_ADMIN_EMAILS=freelancer@example.com
```

### Schritt 4: Prüfe Bucket-Konfiguration

1. Gehe zu Supabase Dashboard → **Storage**
2. Prüfe ob der Bucket `background-music` existiert
3. Prüfe ob der Bucket **öffentlich** ist (für Lesen)
4. Prüfe die Bucket-Einstellungen:
   - **File size limit**: Sollte mindestens 100 MB sein
   - **Allowed MIME types**: Sollte `audio/mpeg` enthalten

## Wie es funktioniert

### Für kleine Dateien (< 4 MB):
1. Datei wird über API-Route hochgeladen
2. Server verwendet Admin-Client (umgeht RLS)
3. Datei wird zu Storage hochgeladen
4. Metadaten werden in Datenbank gespeichert

### Für große Dateien (> 4 MB):
1. System erkennt große Datei
2. Versucht direkten Upload zu Supabase Storage
3. Storage-Policies prüfen, ob User Admin ist (via Email)
4. Wenn erfolgreich: Metadaten werden über API gespeichert
5. Wenn fehlgeschlagen: Fallback zu API-Route (kann fehlschlagen bei sehr großen Dateien)

## Storage-Policies Details

Die Storage-Policies erlauben:
- **Lesen**: Jeder kann Musik-Dateien lesen (öffentlicher Zugriff)
- **Hochladen**: Nur Full-Admins und Music-Admins können Dateien hochladen
- **Löschen**: Nur Full-Admins und Music-Admins können Dateien löschen
- **Aktualisieren**: Nur Full-Admins und Music-Admins können Dateien aktualisieren

Die Policies prüfen die Email-Adresse des eingeloggten Benutzers gegen die `music_admins` Tabelle:
- Alle Einträge in der Tabelle werden automatisch erkannt
- `admin_type = 'full'` → Full-Admins
- `admin_type = 'music'` → Music-Admins (Freelancer)

**Vorteil:** Du musst keine Policies ändern, wenn du neue Admins hinzufügst - einfach einen neuen Eintrag in die Tabelle einfügen!

## Troubleshooting

### Problem: "Direct upload failed, falling back to API route"

**Ursache:** Storage-Policies fehlen oder Email-Adresse stimmt nicht überein

**Lösung:**
1. Prüfe ob Storage-Policies erstellt wurden
2. Prüfe ob Email-Adresse in der `music_admins` Tabelle vorhanden ist:
   ```sql
   SELECT * FROM public.music_admins WHERE email = 'freelancer@example.com';
   ```
3. Falls nicht vorhanden, füge sie hinzu (siehe Schritt 2)
4. Prüfe ob Email-Adresse in Environment Variables korrekt ist
5. Stelle sicher, dass der User eingeloggt ist

### Problem: "Upload fehlgeschlagen (Status: 413)"

**Ursache:** Datei ist zu groß für API-Route (> 4.5 MB)

**Lösung:**
1. Stelle sicher, dass Storage-Policies erstellt wurden
2. Der direkte Upload sollte automatisch verwendet werden
3. Falls nicht: Prüfe Browser-Konsole für Fehlermeldungen

### Problem: "Forbidden - Admin access required"

**Ursache:** User ist nicht als Admin erkannt

**Lösung:**
1. Prüfe ob Email-Adresse in `NEXT_PUBLIC_MUSIC_ADMIN_EMAILS` steht
2. Prüfe ob User eingeloggt ist
3. Prüfe Browser-Konsole für Details

## Wichtige Hinweise

- **Storage-Policies müssen erstellt werden**, damit der direkte Upload funktioniert
- **Admin-Emails müssen in der `music_admins` Tabelle gespeichert sein** (siehe Schritt 2)
- Die Email-Adressen müssen **exakt** mit den Environment Variables übereinstimmen (Case-insensitive)
- Nach dem Hinzufügen neuer Admins zur Tabelle muss der User sich **neu einloggen**, damit die Änderungen wirksam werden
- Der direkte Upload funktioniert nur, wenn der User eingeloggt ist (Session erforderlich)
- **Vorteil:** Neue Music-Admins können einfach zur Tabelle hinzugefügt werden, ohne Policies zu ändern!

## Admin-Verwaltung

### Alle Admins anzeigen:
```sql
SELECT * FROM public.music_admins ORDER BY admin_type, email;
```

### Music-Admin hinzufügen:
```sql
INSERT INTO public.music_admins (email, admin_type)
VALUES ('neue-freelancerin@example.com', 'music')
ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;
```

### Admin entfernen:
```sql
DELETE FROM public.music_admins WHERE email = 'freelancer@example.com';
```

### Admin-Typ ändern:
```sql
UPDATE public.music_admins 
SET admin_type = 'full' 
WHERE email = 'freelancer@example.com';
```

