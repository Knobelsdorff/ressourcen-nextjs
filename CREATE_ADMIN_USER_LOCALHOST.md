# Admin-User für localhost erstellen

## ✅ Einfachste Methode: Supabase Dashboard

### Schritt 1: User erstellen

1. Gehe zu deinem **Supabase Dashboard**
2. Navigiere zu: **Authentication** → **Users**
3. Klicke auf **"Add User"** (oder **"Create User"**)
4. Fülle aus:
   - **Email**: `andreas@knobelsdorff-therapie.de`
   - **Password**: (wähle ein Passwort, z.B. `Test123!`)
   - **Auto Confirm User**: ✅ **AKTIVIEREN** (wichtig für localhost!)
5. Klicke auf **"Create User"**

### Schritt 2: Profil erstellen (automatisch oder manuell)

Das Profil wird normalerweise automatisch erstellt. Falls nicht, führe dieses SQL aus:

```sql
-- Erstelle Profil für andreas@knobelsdorff-therapie.de
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  'Andreas',
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'andreas@knobelsdorff-therapie.de'
ON CONFLICT (id) DO NOTHING;
```

### Schritt 3: Einloggen

1. Gehe zu `http://localhost:3000`
2. Klicke auf **"Anmelden"**
3. Email: `andreas@knobelsdorff-therapie.de`
4. Passwort: (das Passwort, das du im Dashboard gesetzt hast)
5. Du solltest jetzt eingeloggt sein!

---

## 🔍 Prüfen ob User existiert

Falls du nicht sicher bist, ob der User bereits existiert, führe dieses SQL aus:

```sql
-- Prüfe ob User existiert
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'andreas@knobelsdorff-therapie.de';
```

**Ergebnis:**
- Wenn ein Eintrag zurückkommt → User existiert bereits
- Wenn leer → User existiert noch nicht

---

## 🔄 Passwort zurücksetzen (falls User existiert)

Falls der User bereits existiert, aber du das Passwort nicht kennst:

1. Gehe zu **Supabase Dashboard** → **Authentication** → **Users**
2. Suche nach `andreas@knobelsdorff-therapie.de`
3. Klicke auf den User
4. Klicke auf **"Reset Password"** oder **"Update User"**
5. Setze ein neues Passwort
6. Stelle sicher, dass **"Email Confirmed"** aktiviert ist (für localhost)

---

## ⚠️ Wichtig für localhost

- **Auto Confirm User** muss aktiviert sein, sonst musst du die Email bestätigen
- Für Production sollte **Auto Confirm** deaktiviert sein (Sicherheit)

---

## 🎯 Nach dem Login

Nach dem Login solltest du:
- ✅ Auf `/admin/analytics` zugreifen können (wenn in `NEXT_PUBLIC_ADMIN_EMAILS`)
- ✅ Auf `/admin/music` zugreifen können (wenn in `NEXT_PUBLIC_ADMIN_EMAILS` oder `NEXT_PUBLIC_MUSIC_ADMIN_EMAILS`)
- ✅ Alle Admin-Funktionen nutzen können

