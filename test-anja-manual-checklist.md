# Checkliste: Test ob Anja Zugang zu ihren Ressourcen hat

## ✅ Was du in den SQL-Ergebnissen sehen solltest:

### Query 1 (Zugangs-Status):
- `has_active_access_result` = **TRUE** ✅
- `access_status` = **"✓ AKTIV - Zugang gewährt"** ✅
- `days_remaining` = **~14 Tage** ✅
- `plan_type` = **"standard"** ✅

### Query 2 (Zugriff auf jede Ressource):
- Für **ALLE** Ressourcen sollte stehen:
  - `has_active_access` = **TRUE** ✅
  - `access_result` = **"✓ ZUGRIFF GEWÄHRT - Audio kann abgespielt werden"** ✅

### Query 3 (Zusammenfassung):
- `resources_with_access` = **4** (oder Anzahl ihrer Ressourcen) ✅
- `resources_without_access` = **0** ✅
- `final_result` = **"✓ Anja kann auf ALLE Ressourcen zugreifen (2 Wochen)"** ✅

---

## 🧪 Manueller Test (als Anja einloggen):

1. **Logout** aus deinem Account
2. **Login als Anja** (`anja.musica@web.de`)
3. **Gehe zum Dashboard** (`/dashboard`)

### Was du sehen solltest:

✅ **Alle 4 Ressourcen** werden angezeigt:
- "Raya - Superfrau" (Erste Ressource)
- "Raya - die Superfrau"
- "Ayla - der liebende Engel"
- "Kora - die Feuerfrau"

✅ **Play-Button funktioniert:**
- Klicke auf "Play" bei einer Ressource
- Audio sollte **ohne Paywall** abspielen
- Keine Fehlermeldung

✅ **Download-Button funktioniert NICHT:**
- Klicke auf "Download"
- Sollte Alert zeigen: "Audio-Downloads sind nur für Premium-User verfügbar"
- (Das ist korrekt - sie hat Standard-Plan, nicht Premium)

❌ **Paywall erscheint NICHT:**
- Wenn Paywall erscheint → Zugang funktioniert nicht
- Wenn kein Paywall → Zugang funktioniert ✅

---

## 🔍 Browser-Console Test:

Öffne Browser-Console (F12) und prüfe die Logs:

```javascript
// Suche nach diesen Logs:
"[canAccessResource] Access check result for story ...: true"
"[playAudio] Access granted for story ... - proceeding with playback"

// Wenn du siehst:
"[playAudio] Access denied for story ... - showing paywall"
// → Dann funktioniert Zugang NICHT
```

---

## 🎯 Test: Ablaufdatum simulieren

Um zu testen, ob Paywall nach 2 Wochen erscheint:

```sql
-- Setze Ablaufdatum in die Vergangenheit
UPDATE public.user_access
SET access_expires_at = NOW() - INTERVAL '1 day'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'anja.musica@web.de');
```

Dann sollte:
- `has_active_access_result` = **FALSE**
- Paywall erscheint beim Abspielen
- Alle Ressourcen zeigen "Trial abgelaufen"

**Zurücksetzen:**
```sql
UPDATE public.user_access
SET access_expires_at = NOW() + INTERVAL '2 weeks'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'anja.musica@web.de');
```

---

## 📊 Entscheidende Prüfung:

**Die wichtigste Prüfung ist Query 1:**
- Wenn `has_active_access_result = TRUE` → Anja hat Zugang ✅
- Wenn `has_active_access_result = FALSE` → Anja hat keinen Zugang ❌

Diese Funktion (`has_active_access`) wird von der App verwendet, um zu prüfen ob Paywall angezeigt werden soll.

