# Einfache Lösung: Test-User erstellen (ohne Anjas Passwort zu ändern)

## ✅ Beste Methode: Test-User in der App registrieren

**Du musst NICHT Anjas Passwort ändern!** Erstelle einfach einen eigenen Test-User:

### Schritt 1: Test-User registrieren
1. Gehe zu deiner App
2. **Registriere einen neuen User:**
   - Email: `test-anja@deine-email.de` (oder eine andere Test-Email)
   - Passwort: `Test123!` (oder was du willst)
   - **WICHTIG:** Verwende eine Email, die du kontrollierst (falls Bestätigungsmail nötig)

### Schritt 2: Gib Test-User denselben Zugang wie Anja
Führe dieses SQL-Skript in Supabase aus (ersetze `test-anja@deine-email.de` mit deiner Test-Email):

```sql
-- Gib Test-User denselben Zugang wie Anja
INSERT INTO public.user_access (
    user_id,
    plan_type,
    resources_created,
    resources_limit,
    access_starts_at,
    access_expires_at,
    status,
    stripe_payment_intent_id,
    stripe_checkout_session_id
)
SELECT 
    u.id,
    'standard', -- Standard-Plan wie Anja
    3, -- Gleiche Anzahl Ressourcen wie Anja
    3,
    NOW(),
    NOW() + INTERVAL '2 weeks', -- 2 Wochen wie Anja
    'active',
    'test_account_anja',
    'test_account_anja'
FROM auth.users u
WHERE u.email = 'test-anja@deine-email.de' -- ÄNDERE HIER!
ON CONFLICT (user_id) 
DO UPDATE SET
    plan_type = 'standard',
    access_expires_at = NOW() + INTERVAL '2 weeks',
    status = 'active',
    updated_at = NOW();
```

### Schritt 3: Test als Test-User
1. **Login** mit deinem Test-User
2. **Prüfe:**
   - ✅ Du siehst das Dashboard
   - ✅ Du kannst Ressourcen erstellen (aber hast noch keine)
   - ✅ Paywall erscheint **NICHT** (weil du Zugang hast)

---

## 🔍 Alternative: Prüfe Anjas Zugang ohne Login

**Du kannst auch testen ohne dich einzuloggen:**

### Browser-Console Test (als Admin/Developer)

1. Öffne deine App (als Admin eingeloggt)
2. Öffne Browser-Console (F12)
3. Führe aus:

```javascript
// Prüfe Anjas Zugang (ohne Login)
const anjaUserId = '4f9163e4-4b73-4ff0-bf23-d14a75ff4da7';

// Importiere Access-Funktionen
const { hasActiveAccess, getUserAccess, hasPremiumAccess } = await import('/src/lib/access.ts');

// Test 1: Hat Anja aktiven Zugang?
const hasAccess = await hasActiveAccess(anjaUserId);
console.log('✅ Anja hat Zugang:', hasAccess); // Sollte TRUE sein

// Test 2: Welchen Plan hat Anja?
const access = await getUserAccess(anjaUserId);
console.log('📋 Plan:', access?.plan_type); // Sollte "standard" sein
console.log('⏰ Läuft ab:', access?.access_expires_at);
console.log('📅 Tage verbleibend:', Math.round((new Date(access?.access_expires_at) - new Date()) / (1000 * 60 * 60 * 24)));

// Test 3: Hat Anja Premium?
const hasPremium = await hasPremiumAccess(anjaUserId);
console.log('💎 Premium:', hasPremium); // Sollte FALSE sein (Standard-Plan)

// Test 4: Kann Anja auf Ressourcen zugreifen?
const { canAccessResource } = await import('/src/lib/access.ts');
// Teste mit einer ihrer Ressourcen-IDs
const resourceIds = [
    'cca9bf5e-ae1f-40f2-aaa9-12098405f526', // Raya - Superfrau
    '42b3858b-387d-43ed-a71c-3d5528ba40c7', // Raya - die Superfrau
    '074a1447-423c-4361-bee2-6d358ed1fda4', // Ayla - der liebende Engel
    '73b04ed6-0c2c-4c8d-bcdf-ba5c0198b05c'  // Kora - die Feuerfrau
];

for (const resourceId of resourceIds) {
    const canAccess = await canAccessResource(anjaUserId, resourceId);
    console.log(`🎵 Zugriff auf "${resourceId}":`, canAccess ? '✅ JA' : '❌ NEIN');
}
```

**Ergebnis:** Du siehst in der Console, ob Anja Zugang hat, ohne dich als sie einzuloggen.

---

## 📊 Warum Passwörter nicht zurücklesbar sind

**Passwörter sind aus Sicherheitsgründen gehasht:**
- Sie werden nie im Klartext gespeichert
- Selbst du als Admin kannst sie nicht sehen
- Das ist **gut so** für die Sicherheit!

**Aber:** Du kannst:
- ✅ Test-User erstellen (mit bekanntem Passwort)
- ✅ Zugänge kopieren (dieselben Rechte geben)
- ✅ Code-Tests durchführen (ohne Login)

---

## 🎯 Empfehlung

**Verwende die Browser-Console-Methode** - sie ist am einfachsten:
- Kein Login nötig
- Kein Passwort ändern
- Du siehst sofort alle Ergebnisse
- Funktioniert als Admin/Developer

Die SQL-Ergebnisse zeigen bereits, dass Anja Zugang hat. Der Console-Test bestätigt das zusätzlich mit mehr Details.

