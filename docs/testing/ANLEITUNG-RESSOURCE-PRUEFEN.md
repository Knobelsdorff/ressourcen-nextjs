# Anleitung: Ressource "Weiser Zauberer" überprüfen

## Option 1: Über Supabase Dashboard (Empfohlen)

### Schritt 1: Öffne Supabase Dashboard
1. Gehe zu https://supabase.com/dashboard
2. Logge dich ein
3. Wähle dein Projekt aus

### Schritt 2: Öffne den SQL Editor
1. Klicke links auf "SQL Editor"
2. Klicke auf "New query"

### Schritt 3: Führe diese SQL-Abfrage aus

```sql
-- Suche nach "Weiser Zauberer" in allen Ressourcen
SELECT 
    ss.id,
    ss.title,
    ss.resource_figure,
    ss.created_at,
    u.email as user_email,
    ss.client_email,
    CASE 
        WHEN ss.resource_figure::text LIKE '%Weiser%' OR ss.resource_figure::text LIKE '%Zauberer%'
        THEN '✓ Gefunden in resource_figure'
        WHEN ss.title LIKE '%Weiser%' OR ss.title LIKE '%Zauberer%'
        THEN '✓ Gefunden in title'
        ELSE 'Nicht gefunden'
    END as match_status
FROM public.saved_stories ss
LEFT JOIN auth.users u ON ss.user_id = u.id
WHERE 
    ss.title ILIKE '%Weiser%' OR 
    ss.title ILIKE '%Zauberer%' OR
    ss.resource_figure::text ILIKE '%Weiser%' OR
    ss.resource_figure::text ILIKE '%Zauberer%'
ORDER BY ss.created_at DESC
LIMIT 20;
```

### Schritt 4: Prüfe die Ergebnisse
- Wenn Ergebnisse angezeigt werden: Die Ressource existiert, aber möglicherweise mit leicht abweichendem Namen
- Wenn keine Ergebnisse: Die Ressource existiert nicht

### Schritt 5: Prüfe alle Ressourcen von sabelleka@gmail.com

```sql
-- Zeige alle Ressourcen von sabelleka@gmail.com
SELECT 
    ss.id,
    ss.title,
    ss.resource_figure,
    ss.created_at,
    u.email as user_email,
    ss.client_email
FROM public.saved_stories ss
LEFT JOIN auth.users u ON ss.user_id = u.id
WHERE 
    u.email = 'sabelleka@gmail.com' OR
    ss.client_email = 'sabelleka@gmail.com'
ORDER BY ss.created_at DESC;
```

## Option 2: Über die Admin Analytics Seite

### Schritt 1: Öffne Admin Analytics
1. Gehe zu http://localhost:3000/admin/analytics
2. Logge dich als Admin ein

### Schritt 2: Suche nach dem Event
1. Scrolle durch die Liste der Events
2. Suche nach einem `resource_created` Event mit `resource_figure_name = "Weiser Zauberer"`
3. Klicke auf den Namen, um die Ressource zu öffnen

### Schritt 3: Prüfe die User-Email
- Schaue in der Spalte "User Email" nach `sabelleka@gmail.com`
- Prüfe, ob es ein Event für diese Ressource gibt

## Option 3: Über das Dashboard des Users

### Schritt 1: Logge dich als sabelleka@gmail.com ein
1. Gehe zu http://localhost:3000
2. Logge dich mit `sabelleka@gmail.com` ein

### Schritt 2: Prüfe das Dashboard
1. Gehe zu http://localhost:3000/dashboard
2. Schaue, welche Ressourcen angezeigt werden
3. Prüfe, ob "Weiser Zauberer" dabei ist

## Option 4: Über die Admin Resource Search

### Schritt 1: Öffne Admin Resource Search
1. Gehe zu http://localhost:3000/dashboard
2. Logge dich als Admin ein
3. Klicke auf "Ressourcen suchen" (falls vorhanden)

### Schritt 2: Suche nach "Weiser Zauberer"
1. Gib "Weiser Zauberer" in das Suchfeld ein
2. Prüfe die Ergebnisse

## Option 5: Direkte Datenbankabfrage (Alle Ressourcen)

Falls du alle Ressourcen sehen möchtest:

```sql
-- Zeige alle Ressourcen (letzte 50)
SELECT 
    ss.id,
    ss.title,
    ss.resource_figure,
    ss.created_at,
    u.email as user_email,
    ss.client_email
FROM public.saved_stories ss
LEFT JOIN auth.users u ON ss.user_id = u.id
ORDER BY ss.created_at DESC
LIMIT 50;
```

## Was zu tun ist, wenn die Ressource nicht gefunden wird:

### Schritt 1: Prüfe den Analytics-Event
1. Gehe zu http://localhost:3000/admin/analytics
2. Suche nach einem `resource_created` Event mit `resource_figure_name = "Weiser Zauberer"`
3. Prüfe die Spalte "Story ID":
   - **Wenn Story ID vorhanden ist:** Die Ressource wurde erstellt, aber möglicherweise gelöscht oder gehört einem anderen User
   - **Wenn keine Story ID:** Die Ressource wurde möglicherweise nie erfolgreich gespeichert

### Schritt 2: Prüfe mit SQL (genaueste Methode)
Führe diese SQL-Abfrage im Supabase SQL Editor aus:

```sql
-- Prüfe ob es ein Analytics-Event für "Weiser Zauberer" gibt
SELECT 
    ua.id,
    ua.event_type,
    ua.resource_figure_name,
    ua.story_id,
    u.email as user_email,
    ua.created_at
FROM public.user_analytics ua
LEFT JOIN auth.users u ON ua.user_id = u.id
WHERE 
    ua.resource_figure_name ILIKE '%Weiser%' OR
    ua.resource_figure_name ILIKE '%Zauberer%'
ORDER BY ua.created_at DESC;
```

### Schritt 3: Prüfe alternative Namen
- Vielleicht heißt die Ressource "Weiser Zauberer" mit anderer Schreibweise
- Oder nur "Zauberer" oder "Weiser"
- Prüfe in Admin Analytics nach ähnlichen Namen

### Schritt 4: Prüfe andere User
- Möglicherweise gehört die Ressource einem anderen User
- Suche in Admin Analytics nach allen Events mit "Weiser Zauberer"

### Schritt 5: Prüfe, ob die Ressource gelöscht wurde
- Wenn ein Analytics-Event mit Story ID existiert, aber die Ressource nicht in der Datenbank ist, wurde sie möglicherweise gelöscht
- Prüfe die Story ID direkt: `/api/admin/resources/search?storyId=STORY_ID_HIER`

## Aktueller Status für sabelleka@gmail.com:

✅ **Gefundene Ressource:**
- "Drache" (ID: `d32821cf-89de-40ca-b13d-dc0063258ad4`)
- Erstellt am: 2025-11-09 22:00:27

❌ **Nicht gefunden:**
- "Weiser Zauberer" existiert nicht in der Datenbank für diesen User

