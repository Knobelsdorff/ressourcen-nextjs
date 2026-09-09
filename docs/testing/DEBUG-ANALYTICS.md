# Debug-Anleitung: Admin Analytics zeigt "0"

## Problem
Die Admin Analytics Seite zeigt überall "0", obwohl Events getrackt werden sollten.

## Debugging-Schritte

### 1. Prüfe Terminal-Logs
Nach dem Laden der Admin Analytics Seite (`/admin/analytics`) solltest du im Terminal folgende Logs sehen:

```
Admin Analytics API: Admin client test { ... }
Admin Analytics API: Query results { ... }
```

**Wenn du diese Logs siehst:**
- Prüfe `totalEventsInDB` - zeigt an, wie viele Events in der Datenbank sind
- Prüfe `eventCount` - zeigt an, wie viele Events die Query zurückgibt
- Prüfe `errorMessage` - zeigt Fehler an, falls vorhanden

### 2. Prüfe ob Events in der Datenbank sind

Führe das SQL-Skript `check-analytics-data.sql` im Supabase SQL Editor aus:

1. Öffne Supabase Dashboard → SQL Editor
2. Kopiere den Inhalt von `check-analytics-data.sql`
3. Führe das Skript aus

**Erwartete Ergebnisse:**
- `table_exists`: sollte `true` sein
- `total_events`: sollte > 0 sein, wenn Events getrackt wurden
- `event_type` Statistiken: sollten verschiedene Event-Typen zeigen

### 3. Prüfe ob Events getrackt werden

Öffne die Browser-Konsole (F12) und navigiere zum Dashboard. Du solltest sehen:

```
Analytics event tracked successfully: dashboard_visit
```

**Wenn du diese Logs NICHT siehst:**
- Events werden nicht getrackt
- Prüfe ob User eingeloggt ist
- Prüfe ob Session vorhanden ist

### 4. Teste manuell ein Event zu erstellen

Öffne die Browser-Konsole und führe aus:

```javascript
fetch('/api/analytics/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    eventType: 'dashboard_visit'
  })
}).then(r => r.json()).then(console.log);
```

**Erwartetes Ergebnis:**
- `{ success: true, data: { ... } }` - Event wurde gespeichert
- `{ error: 'Unauthorized' }` - User ist nicht eingeloggt
- `{ error: 'Failed to track event' }` - Datenbank-Fehler

### 5. Prüfe RLS Policies

Die `user_analytics` Tabelle hat RLS aktiviert. Prüfe ob die Policies korrekt sind:

```sql
SELECT * FROM pg_policies WHERE tablename = 'user_analytics';
```

**Erwartete Policies:**
- `Users can view their own analytics` (SELECT)
- `Users can insert their own analytics` (INSERT)

**Wichtig:** Die Admin Analytics API verwendet den Service Role Key, der RLS umgeht. Falls die Policies falsch sind, sollte das trotzdem funktionieren.

## Mögliche Probleme und Lösungen

### Problem: Keine Events in der Datenbank
**Lösung:** 
- Events werden nicht getrackt
- Prüfe ob `trackEvent()` aufgerufen wird
- Prüfe Browser-Konsole auf Fehler

### Problem: Events in DB, aber API zeigt 0
**Lösung:**
- Service Role Key ist nicht korrekt gesetzt
- Admin Client funktioniert nicht
- Prüfe Terminal-Logs für Fehler

### Problem: RLS blockiert Admin Client
**Lösung:**
- Service Role Key sollte RLS umgehen
- Prüfe ob `SUPABASE_SERVICE_ROLE_KEY` korrekt gesetzt ist

