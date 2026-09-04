# Anleitung: Als Anja einloggen (ohne Passwort)

## Option 1: Passwort im Supabase Dashboard zurücksetzen (Empfohlen)

1. **Öffne Supabase Dashboard**
   - Gehe zu: https://supabase.com/dashboard
   - Wähle dein Projekt aus

2. **Gehe zu Authentication → Users**
   - Im linken Menü: "Authentication" → "Users"

3. **Finde Anja**
   - Suche nach: `anja.musica@web.de`
   - Oder suche nach der User-ID: `4f9163e4-4b73-4ff0-bf23-d14a75ff4da7`

4. **Setze neues Passwort**
   - Klicke auf die drei Punkte "..." neben dem User
   - Wähle "Reset password" oder "Send password reset email"
   - **ODER:** Klicke direkt auf den User → "Reset password" → Setze neues Passwort
   - Verwende ein einfaches Test-Passwort (z.B. `Test123!`)

5. **Login als Anja**
   - Gehe zu deiner App
   - Login mit: `anja.musica@web.de` / `Test123!`

6. **Nach dem Test:**
   - Setze Passwort zurück ODER
   - Bitte Anja, ihr Passwort selbst zu ändern

---

## Option 2: Test-Account erstellen (Alternative)

Wenn du nicht Anjas Passwort ändern möchtest, erstelle einen separaten Test-Account:

1. **Erstelle neuen Test-User in Supabase:**
   ```sql
   -- Erstelle Test-User (falls noch nicht vorhanden)
   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
   VALUES (
     'test-anja@example.com',
     crypt('Test123!', gen_salt('bf')),
     NOW(),
     NOW(),
     NOW()
   )
   ON CONFLICT (email) DO NOTHING;
   ```

2. **Gib Test-User denselben Zugang wie Anja:**
   ```sql
   -- Kopiere Anjas Zugang für Test-User
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
     (SELECT id FROM auth.users WHERE email = 'test-anja@example.com'),
     'standard',
     3,
     3,
     NOW(),
     NOW() + INTERVAL '2 weeks',
     'active',
     'test_account',
     'test_account'
   ON CONFLICT (user_id) DO UPDATE SET
     plan_type = 'standard',
     access_expires_at = NOW() + INTERVAL '2 weeks',
     status = 'active';
   ```

3. **Login mit Test-Account:**
   - Email: `test-anja@example.com`
   - Passwort: `Test123!`

---

## Option 3: Browser-Entwicklertools (nur für Tests)

Wenn du bereits eingeloggt bist, kannst du in der Browser-Console prüfen:

```javascript
// Prüfe aktuelle User-Session
const { data: { session } } = await supabase.auth.getSession();
console.log('Current user:', session?.user?.email);

// Prüfe Zugang für Anja (ohne sich einzuloggen)
const anjaUserId = '4f9163e4-4b73-4ff0-bf23-d14a75ff4da7';
const { hasActiveAccess } = await import('/src/lib/access.ts');
const hasAccess = await hasActiveAccess(anjaUserId);
console.log('Anja has access:', hasAccess);
```

**WICHTIG:** Diese Methode prüft nur den Zugang, aber du kannst nicht wirklich als Anja interagieren.

---

## Empfohlene Methode: Option 1

**Am einfachsten:** Verwende Supabase Dashboard um Anjas Passwort zurückzusetzen:
1. Dashboard → Authentication → Users
2. Finde Anja → Reset Password
3. Setze Test-Passwort
4. Login als Anja
5. Nach Test: Passwort wieder zurücksetzen

---

## Was du testen solltest:

Nach dem Login als Anja:

✅ **Dashboard zeigt alle 4 Ressourcen**
✅ **Play-Button funktioniert** (Audio spielt ab)
✅ **Keine Paywall** erscheint
✅ **Download-Button zeigt Alert** (nur Premium verfügbar)

❌ **Paywall erscheint** → Zugang funktioniert nicht
❌ **Audio kann nicht abgespielt werden** → Zugang funktioniert nicht

