# Anleitung: Test-User mewax28983@fandoe.com einrichten

## Schritt 1: User in der App registrieren

1. **Gehe zu deiner App**
2. **Registriere neuen User:**
   - Email: `mewax28983@fandoe.com`
   - Passwort: `Test123!` (oder was du willst)
   - Bestätige die Email (falls Bestätigungsmail nötig)

## Schritt 2: Gib Test-User Zugang (wie Anja)

**Führe `give-access-to-test-user.sql` in Supabase aus:**

1. Öffne Supabase SQL Editor
2. Kopiere den Inhalt von `give-access-to-test-user.sql`
3. Führe das Skript aus
4. Prüfe die Ergebnisse:
   - ✅ Query 1: User sollte existieren
   - ✅ Query 2: Zugang sollte erstellt worden sein
   - ✅ Query 3: `has_active_access_result` sollte `TRUE` sein

## Schritt 3: Test als Test-User

1. **Logout** aus deinem aktuellen Account
2. **Login** mit:
   - Email: `mewax28983@fandoe.com`
   - Passwort: `Test123!` (oder was du gewählt hast)

3. **Prüfe im Dashboard:**
   - ✅ Du siehst das Dashboard (ohne Paywall)
   - ✅ Du kannst Ressourcen erstellen
   - ✅ Paywall erscheint **NICHT** (weil du Zugang hast)
   - ✅ Nach 2 Wochen: Paywall sollte erscheinen

## Was der Test-User hat:

- ✅ **Standard-Plan** (wie Anja)
- ✅ **2 Wochen Zugang** (wie Anja)
- ✅ **Keine Downloads** (nur Premium)
- ✅ **3 Ressourcen Limit**

## Unterschied zu Anja:

- Test-User hat **noch keine Ressourcen** (Anja hat 4)
- Test-User kann **neue Ressourcen erstellen** (wie jeder User mit Zugang)
- Test-User hat **dasselbe Zugangsrecht** (2 Wochen, Standard-Plan)

---

## Nach dem Test:

Du kannst den Test-User behalten oder löschen:
- **Behalten:** Für weitere Tests
- **Löschen:** In Supabase Dashboard → Authentication → Users → Finde User → Delete

