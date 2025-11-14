# Analytics-Tracking Test-Anleitung

## Schritt 1: SQL-Skript ausführen

1. Öffne **Supabase Dashboard** → **SQL Editor**
2. Kopiere den gesamten Inhalt von `supabase-analytics-setup.sql`
3. Führe das Skript aus
4. Prüfe, ob die Tabelle erstellt wurde:
   ```sql
   SELECT * FROM public.user_analytics LIMIT 1;
   ```

## Schritt 2: Testen der Events

### Test 1: Dashboard-Visit
1. Öffne die App im Browser
2. Logge dich ein (falls nötig)
3. Navigiere zum Dashboard (`/dashboard`)
4. **Erwartetes Event:** `dashboard_visit` sollte in der Datenbank erscheinen

### Test 2: Audio-Play
1. Im Dashboard: Klicke auf "Audio abspielen" bei einer Ressource
2. **Erwartetes Event:** `audio_play` mit `story_id`, `resource_figure_name`, `voice_id`
3. Warte, bis das Audio vollständig abgespielt wurde
4. **Erwartetes Event:** `audio_play_complete` mit `metadata.audioDuration` und `completed: true`

### Test 3: Resource Creation
1. Erstelle eine neue Ressource (komplette Flow)
2. Speichere sie (nach Audio-Generierung)
3. **Erwartetes Event:** `resource_created` mit allen Details

## Schritt 3: Events prüfen

Führe diese SQL-Queries im Supabase SQL Editor aus:

### Alle Events anzeigen
```sql
SELECT 
  id,
  user_id,
  event_type,
  resource_figure_name,
  voice_id,
  created_at
FROM public.user_analytics
ORDER BY created_at DESC
LIMIT 20;
```

### Event-Statistiken
```sql
SELECT 
  event_type,
  COUNT(*) as count
FROM public.user_analytics
GROUP BY event_type
ORDER BY count DESC;
```

### Beliebte Ressourcenfiguren
```sql
SELECT 
  resource_figure_name,
  COUNT(*) as play_count
FROM public.user_analytics
WHERE event_type = 'audio_play'
  AND resource_figure_name IS NOT NULL
GROUP BY resource_figure_name
ORDER BY play_count DESC
LIMIT 10;
```

### Events pro User
```sql
SELECT 
  u.email,
  COUNT(ua.id) as total_events,
  COUNT(DISTINCT CASE WHEN ua.event_type = 'audio_play' THEN ua.id END) as audio_plays,
  COUNT(DISTINCT CASE WHEN ua.event_type = 'resource_created' THEN ua.id END) as resources_created
FROM public.user_analytics ua
JOIN auth.users u ON u.id = ua.user_id
GROUP BY u.email
ORDER BY total_events DESC;
```

## Schritt 4: Browser Console prüfen

Öffne die Browser-Console (F12) und prüfe:
- Keine `Failed to track event` Fehler
- Events werden im Hintergrund geloggt (non-blocking)

## Bekannte Probleme

- **Stripe Build-Error:** Unabhängig vom Analytics-System. Kann ignoriert werden, wenn Stripe nicht verwendet wird.
- **Tabelle existiert nicht:** SQL-Skript muss zuerst ausgeführt werden.

## Nächste Schritte

Nach erfolgreichem Test:
- Phase 3: Admin-Dashboard erstellen (nächster Schritt)
- Analytics-Queries für Admin-Dashboard vorbereiten






