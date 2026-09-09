# Admin-Account erstellen: tahirwaleed399@gmail.com

## Option 1: Über Supabase Dashboard (Empfohlen)

### Schritt 1: User erstellen oder Passwort setzen

1. Gehe zu deinem **Supabase Dashboard**
2. Navigiere zu: **Authentication** → **Users** 
3. **Falls User bereits existiert:**
   - Suche nach `tahirwaleed399@gmail.com`
   - Klicke auf den User
   - Klicke auf **"Reset Password"** oder **"Update User"**
   - Setze ein neues Passwort (z.B. `Admin2024!`)
   - Stelle sicher, dass **"Email Confirmed"** aktiviert ist ✅
   - Klicke auf **"Update"**

4. **Falls User noch nicht existiert:**
   - Klicke auf **"Add User"** (oder **"Create User"**)
   - Fülle aus:
     - **Email**: `tahirwaleed399@gmail.com`
     - **Password**: (wähle ein Passwort, z.B. `Admin2024!`)
     - **Auto Confirm User**: ✅ **AKTIVIEREN** (wichtig!)
   - Klicke auf **"Create User"**

### Schritt 2: Einloggen

1. Gehe zu `http://localhost:3000`
2. Klicke auf **"Anmelden"**
3. Email: `tahirwaleed399@gmail.com`
4. Passwort: (das Passwort, das du im Dashboard gesetzt hast)
5. Du solltest jetzt eingeloggt sein!

### Schritt 3: Admin-Zugang testen

1. Gehe zu http://localhost:3000/admin/music
2. Gehe zu http://localhost:3000/admin/analytics
3. Du solltest Zugriff auf **beide** Seiten haben (Full-Admin)

## Option 2: Über die App (Registrierung)

Falls der User noch nicht existiert, kann er sich auch selbst registrieren:

1. Gehe zu `http://localhost:3000`
2. Klicke auf **"Anmelden"**
3. Klicke auf **"Registrieren"** (oder wechsle zum Register-Tab)
4. Email: `tahirwaleed399@gmail.com`
5. Passwort: (wähle ein Passwort, mindestens 6 Zeichen)
6. Bestätige das Passwort
7. Klicke auf **"Registrieren"**
8. **WICHTIG:** Bestätige die Email (klicke auf den Link in der Email)
9. Logge dich dann ein

**Hinweis:** Bei dieser Methode muss die Email bestätigt werden. Für localhost ist es einfacher, den User über das Supabase Dashboard zu erstellen.

## Option 3: Passwort zurücksetzen (falls User existiert)

Falls der User bereits existiert, aber das Passwort unbekannt ist:

1. Gehe zu `http://localhost:3000`
2. Klicke auf **"Anmelden"**
3. Klicke auf **"Passwort setzen/zurücksetzen"**
4. Gib `tahirwaleed399@gmail.com` ein
5. Du erhältst eine Email mit einem Link zum Passwort-Setzen
6. Klicke auf den Link in der Email
7. Setze ein neues Passwort
8. Logge dich dann ein

## Empfohlenes Passwort

Für Admin-Accounts empfehle ich ein sicheres Passwort, z.B.:
- `Admin2024!`
- `Ressourcen2024!`
- Oder ein anderes sicheres Passwort deiner Wahl

**Wichtig:** 
- Mindestens 6 Zeichen
- Am besten Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen
- Nicht zu einfach (z.B. nicht "123456" oder "password")

## Prüfen ob User existiert

Falls du nicht sicher bist, ob der User bereits existiert, führe dieses SQL im Supabase SQL Editor aus:

```sql
-- Prüfe ob User existiert
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'tahirwaleed399@gmail.com';
```

**Ergebnis:**
- Wenn ein Eintrag zurückkommt → User existiert bereits
- Wenn leer → User existiert noch nicht

## Aktuelle Admin-Konfiguration

Die Email `tahirwaleed399@gmail.com` ist bereits als **Full-Admin** konfiguriert in `.env.local`:
```env
NEXT_PUBLIC_ADMIN_EMAILS=heilung@knobelsdorff-therapie.de,tahirwaleed399@gmail.com
```

Sobald der User erstellt ist und sich einloggt, hat er automatisch Full-Admin-Zugang.


