# Admin-Rollen Setup

Dieses Dokument erklärt, wie du verschiedene Admin-Rollen für die App einrichtest.

## Rollen-Übersicht

### Full Admin (NEXT_PUBLIC_ADMIN_EMAILS)
- ✅ Zugriff auf **Admin Analytics** (Kundendaten, Statistiken)
- ✅ Zugriff auf **Musik-Verwaltung**
- ✅ Vollständige Admin-Rechte

### Music Admin (NEXT_PUBLIC_MUSIC_ADMIN_EMAILS)
- ❌ **KEIN** Zugriff auf Admin Analytics (Datenschutz)
- ✅ Zugriff auf **Musik-Verwaltung** (Tracks hochladen, verwalten)
- ✅ Eingeschränkte Admin-Rechte

## Setup

### 1. Umgebungsvariablen konfigurieren

Füge in deiner `.env.local` (oder Vercel Environment Variables) hinzu:

```env
# Full-Admins (Analytics + Music)
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,deine-email@example.com

# Music-Admins (nur Musik-Verwaltung)
NEXT_PUBLIC_MUSIC_ADMIN_EMAILS=freelancer@example.com,musik-admin@example.com
```

**Wichtig:**
- Mehrere Emails mit Komma trennen
- Leerzeichen werden automatisch entfernt
- Case-insensitive (Groß-/Kleinschreibung wird ignoriert)

### 2. Datenbank-Policies anpassen

Falls du das SQL-Skript `supabase-music-setup.sql` noch nicht ausgeführt hast:

1. Öffne `supabase-music-setup.sql`
2. Ersetze die Email-Adressen in den RLS-Policies:
   - `'deine-admin-email@example.com'` → Deine Full-Admin-Email
   - `'freelancer@example.com'` → Deine Music-Admin-Email
3. Führe das Skript in Supabase SQL Editor aus

**Falls die Tabelle bereits existiert:**

Führe dieses SQL-Skript aus, um die Policies zu aktualisieren:

```sql
-- Lösche alte Policies
DROP POLICY IF EXISTS "Only admins can insert music tracks" ON public.background_music_tracks;
DROP POLICY IF EXISTS "Only admins can update music tracks" ON public.background_music_tracks;
DROP POLICY IF EXISTS "Only admins can delete music tracks" ON public.background_music_tracks;

-- Erstelle neue Policies mit beiden Admin-Typen
CREATE POLICY "Only admins can insert music tracks" ON public.background_music_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.email = ANY(ARRAY[
          'deine-admin-email@example.com' -- Full-Admin
        ])
        OR
        auth.users.email = ANY(ARRAY[
          'freelancer@example.com' -- Music-Admin
        ])
      )
    )
  );

CREATE POLICY "Only admins can update music tracks" ON public.background_music_tracks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.email = ANY(ARRAY[
          'deine-admin-email@example.com' -- Full-Admin
        ])
        OR
        auth.users.email = ANY(ARRAY[
          'freelancer@example.com' -- Music-Admin
        ])
      )
    )
  );

CREATE POLICY "Only admins can delete music tracks" ON public.background_music_tracks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.email = ANY(ARRAY[
          'deine-admin-email@example.com' -- Full-Admin
        ])
        OR
        auth.users.email = ANY(ARRAY[
          'freelancer@example.com' -- Music-Admin
        ])
      )
    )
  );
```

## Verhalten

### Music Admin (Freelancer)
- Kann auf `/admin/music` zugreifen
- Kann Tracks hochladen, verwalten, löschen
- **Sieht keinen Link zu Admin Analytics**
- **Kann nicht auf `/admin/analytics` zugreifen** (403 Forbidden)
- Sieht "Zurück zum Dashboard" statt "Zurück zu Admin Analytics"

### Full Admin (Du)
- Kann auf `/admin/analytics` zugreifen
- Kann auf `/admin/music` zugreifen
- Sieht "Zurück zu Admin Analytics" Link
- Hat vollständige Admin-Rechte

## Sicherheit

- **Analytics-API** (`/api/admin/analytics`) prüft nur `NEXT_PUBLIC_ADMIN_EMAILS`
- **Music-Upload-API** (`/api/admin/music/upload`) prüft beide Listen
- **RLS-Policies** in Supabase prüfen beide Admin-Typen
- Music-Admins haben **keinen Zugriff** auf Kundendaten

## Testing

1. **Als Full Admin einloggen:**
   - Sollte auf `/admin/analytics` zugreifen können
   - Sollte auf `/admin/music` zugreifen können
   - Sollte "Zurück zu Admin Analytics" Link sehen

2. **Als Music Admin einloggen:**
   - Sollte auf `/admin/music` zugreifen können
   - Sollte **NICHT** auf `/admin/analytics` zugreifen können (403)
   - Sollte "Zurück zum Dashboard" Link sehen
   - Sollte Tracks hochladen können

## Troubleshooting

### Music Admin kann nicht auf `/admin/music` zugreifen
- Prüfe, ob Email in `NEXT_PUBLIC_MUSIC_ADMIN_EMAILS` eingetragen ist
- Prüfe, ob Email korrekt geschrieben ist (case-insensitive)
- Prüfe, ob Umgebungsvariable nach Server-Neustart geladen wurde

### Music Admin kann auf `/admin/analytics` zugreifen
- Das sollte **NICHT** passieren
- Prüfe, ob Email nicht auch in `NEXT_PUBLIC_ADMIN_EMAILS` steht
- Prüfe Browser-Cache (Hard Refresh: Cmd+Shift+R)

### Upload funktioniert nicht
- Prüfe, ob RLS-Policies in Supabase korrekt sind
- Prüfe, ob Email in SQL-Policies eingetragen ist
- Prüfe Browser-Konsole für Fehlermeldungen

