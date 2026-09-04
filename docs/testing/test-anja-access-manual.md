# Manueller Test: Anjas Zugang zu Ressourcen

## Option 1: Als Anja einloggen (Empfohlen)

1. **Logout aus deinem aktuellen Account** (falls eingeloggt)
2. **Login als Anja:**
   - Email: `anja.musica@web.de`
   - Passwort: [Anjas Passwort]
3. **Gehe zum Dashboard** (`/dashboard`)
4. **Prüfe:**
   - ✅ Siehst du alle 3 Ressourcen?
   - ✅ Kannst du auf "Play" klicken und Audio abspielen?
   - ✅ Kannst du auf "Download" klicken? → Sollte **NICHT** funktionieren (nur Premium)
   - ✅ Erscheint eine Paywall beim Abspielen? → Sollte **NICHT** erscheinen (Zugang ist aktiv)

## Option 2: SQL-Test ausführen

Führe `test-anja-access.sql` in Supabase SQL Editor aus. Es prüft:
- ✅ Ob `has_active_access` TRUE zurückgibt
- ✅ Ob Zugang aktiv und nicht abgelaufen ist
- ✅ Anzahl ihrer Ressourcen
- ✅ Ob `can_create_resource` funktioniert

## Option 3: Browser-Console Test (JavaScript)

Öffne die Browser-Konsole (F12) auf der Dashboard-Seite und führe aus:

```javascript
// Test ob Anja Zugang hat
const userId = '4f9163e4-4b73-4ff0-bf23-d14a75ff4da7'; // Anjas User-ID

// Importiere Access-Funktionen
const { hasActiveAccess, canAccessResource, getUserAccess } = await import('/src/lib/access.ts');

// Test 1: Prüfe ob aktiver Zugang vorhanden
const hasAccess = await hasActiveAccess(userId);
console.log('Has Active Access:', hasAccess); // Sollte TRUE sein

// Test 2: Hole Zugangs-Info
const access = await getUserAccess(userId);
console.log('Access Info:', access);
console.log('Plan Type:', access?.plan_type); // Sollte "standard" sein
console.log('Expires At:', access?.access_expires_at);
console.log('Days Remaining:', (new Date(access?.access_expires_at) - new Date()) / (1000 * 60 * 60 * 24));

// Test 3: Prüfe ob Zugriff auf erste Ressource möglich
// (Hole erst Story-ID aus Dashboard)
const storyId = '...'; // Ersetze mit tatsächlicher Story-ID
const canAccess = await canAccessResource(userId, storyId);
console.log('Can Access Resource:', canAccess); // Sollte TRUE sein
```

## Was sollte passieren?

### ✅ Korrekt (Anja hat Zugang):
- `has_active_access` = TRUE
- `canAccessResource` = TRUE (für alle Ressourcen)
- Paywall erscheint **NICHT**
- Audio kann abgespielt werden
- Download-Button funktioniert **NICHT** (nur Premium)

### ❌ Falsch (Anja hat keinen Zugang):
- `has_active_access` = FALSE
- `canAccessResource` = FALSE
- Paywall erscheint
- Audio kann nicht abgespielt werden

## Test-Zeitpunkt

- **Jetzt:** Zugang sollte aktiv sein (2 Wochen ab jetzt)
- **Nach 2 Wochen:** Zugang sollte abgelaufen sein, Paywall erscheint

Um das Ablaufdatum zu simulieren, kannst du in Supabase das `access_expires_at` auf ein vergangenes Datum setzen:

```sql
UPDATE public.user_access
SET access_expires_at = NOW() - INTERVAL '1 day'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'anja.musica@web.de');
```

Dann sollte die Paywall erscheinen.

