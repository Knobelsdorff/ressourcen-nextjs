# 🔧 Problem: Keine Bestätigungsmail bei Registrierung

## Problem
Bei der Registrierung kommt keine Bestätigungsmail an.

## ⚠️ WICHTIG: Wenn SMTP bereits konfiguriert ist

Wenn SMTP bereits korrekt in Supabase eingetragen ist, prüfe folgende Punkte:

### 1. E-Mail-Bestätigung aktiviert? ⭐ (Häufigste Ursache!)
- Gehe zu **Authentication** → **Settings** → **Email Auth**
- Stelle sicher, dass **"Enable email confirmations"** aktiviert ist
- **WICHTIG:** Wenn deaktiviert, werden **keine** E-Mails gesendet!

### 2. Redirect URLs konfiguriert?
- Gehe zu **Authentication** → **Settings** → **URL Configuration**
- Prüfe die **Redirect URLs** - müssen enthalten:
  - `https://deine-domain.com/**`
  - `https://deine-domain.com/api/auth/callback`
  - Falls localhost: `http://localhost:3000/**` und `http://localhost:3000/api/auth/callback`

### 3. Site URL korrekt?
- Die **Site URL** sollte auf deine Live-Domain gesetzt sein (z.B. `https://ressourcen.app`)
- **NICHT** auf localhost setzen (außer für lokale Entwicklung)

### 4. SMTP-Verbindung testen
- Prüfe im Supabase Dashboard, ob es Fehlermeldungen bei SMTP gibt
- Teste die SMTP-Verbindung mit einem Test-E-Mail-Versand

### 5. E-Mail im Spam?
- Prüfe den Spam-Ordner der Klientin
- Prüfe auch den Spam-Ordner der Absender-E-Mail-Adresse

### 6. Diagnose-Skript ausführen
Führe das SQL-Skript `diagnose-email-problem.sql` im Supabase SQL Editor aus, um die Konfiguration zu überprüfen.

## Ursachen
1. **SMTP nicht konfiguriert** - Supabase kann keine E-Mails versenden ohne SMTP-Konfiguration
2. **E-Mail-Bestätigung deaktiviert** - Wenn deaktiviert, werden keine E-Mails gesendet!
3. **E-Mail im Spam** - Die E-Mail könnte im Spam-Ordner landen
4. **Redirect URLs nicht konfiguriert** - Supabase akzeptiert möglicherweise die Redirect-URL nicht
5. **Site URL falsch** - Falsche Site URL kann Probleme verursachen
6. **SMTP-Verbindung schlägt fehl** - Ohne Fehlermeldung sichtbar

## Lösung 1: SMTP in Supabase konfigurieren ⭐ (Empfohlen)

### Schritt 1: Gehe zum Supabase Dashboard
1. Öffne [Supabase Dashboard](https://app.supabase.com)
2. Wähle dein Projekt aus
3. Gehe zu **Authentication** → **Settings** → **SMTP Settings**

### Schritt 2: Aktiviere Custom SMTP
1. Aktiviere **"Enable Custom SMTP"**
2. Konfiguriere deinen SMTP-Server:

#### Option A: Gmail SMTP (empfohlen für Testing)
```
Host: smtp.gmail.com
Port: 587
Username: deine-email@gmail.com
Password: [App-Passwort - siehe unten]
Sender Email: deine-email@gmail.com
Sender Name: Ressourcen App
```

**WICHTIG für Gmail:**
- Aktiviere "Zwei-Faktor-Authentifizierung" in deinem Google-Account
- Erstelle ein [App-Passwort](https://myaccount.google.com/apppasswords)
- Verwende dieses App-Passwort, **nicht** dein normales Gmail-Passwort

#### Option B: GMX SMTP
```
Host: mail.gmx.net
Port: 587
Username: dein-gmx-username (z.B. m07a2f27)
Password: dein-gmx-passwort
Sender Email: deine-email@gmx.de
Sender Name: Ressourcen App
```

#### Option C: SendGrid (kostenlos bis 100 E-Mails/Tag)
1. Erstelle einen Account bei [SendGrid](https://sendgrid.com)
2. Erstelle einen API-Key
3. Konfiguriere:
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [dein-sendgrid-api-key]
Sender Email: noreply@deine-domain.de
Sender Name: Ressourcen App
```

### Schritt 3: Teste die Konfiguration
1. Klicke auf **"Save"**
2. Versuche eine neue Registrierung
3. Prüfe den E-Mail-Posteingang (auch Spam-Ordner!)

## Lösung 2: E-Mail-Bestätigung temporär deaktivieren (für Testing)

Wenn du schnell testen möchtest, ohne SMTP zu konfigurieren:

1. Gehe zu **Authentication** → **Settings**
2. Scrolle zu **"Email Auth"**
3. **Deaktiviere** temporär **"Enable email confirmations"**
4. Jetzt können sich Benutzer direkt anmelden ohne E-Mail-Bestätigung

⚠️ **WICHTIG:** Aktiviere diese Option wieder für die Produktion!

## Lösung 3: Bestätigungs-Link im Supabase Dashboard finden

Auch wenn keine E-Mails versendet werden, kannst du die Bestätigungslinks im Supabase Dashboard finden:

1. Gehe zu **Authentication** → **Users**
2. Finde den neu erstellten Benutzer (suche nach der E-Mail-Adresse)
3. Klicke auf den Benutzer
4. Du siehst die **"Confirmation Token"** oder **"Confirmation Link"**
5. Kopiere den Link und öffne ihn im Browser

**ODER** in den Logs:
- Gehe zu **Logs** → **Postgres Logs** oder **Auth Logs**
- Suche nach "confirmation" oder der E-Mail-Adresse

## Lösung 4: Benutzer manuell bestätigen (für Testing)

Du kannst auch direkt in der Datenbank den Benutzer als bestätigt markieren:

```sql
-- Im Supabase SQL Editor ausführen
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'email-der-klientin@example.com';
```

## Lösung 5: Redirect URLs prüfen

Wenn deine Site URL auf die Live-Website gesetzt ist, aber du auf localhost entwickelst:

1. Gehe zu **Authentication** → **Settings** → **URL Configuration**
2. Scrolle zu **"Redirect URLs"**
3. Füge folgende URLs hinzu (falls noch nicht vorhanden):
   ```
   http://localhost:3000/**
   http://localhost:3000/api/auth/callback
   https://deine-live-domain.com/**
   https://deine-live-domain.com/api/auth/callback
   ```
4. Klicke auf **"Save"**

## 🔍 Debugging

### Server-Logs prüfen
Nach einer Registrierung solltest du in den Server-Logs sehen:
```
[Multi-Account] SignUp response: {
  hasUser: true,
  userId: '...',
  email: '...',
  emailConfirmed: false,
  ...
}
```

Wenn `emailConfirmed: false` ist, wurde die E-Mail noch nicht bestätigt.

### Supabase Logs prüfen
1. Gehe zu **Logs** → **Postgres Logs** oder **Auth Logs**
2. Filtere nach der E-Mail-Adresse
3. Schaue nach Auth-Events und Fehlermeldungen

### E-Mail-Konfiguration überprüfen
Führe diese SQL-Abfrage im Supabase SQL Editor aus:

```sql
SELECT 
  key,
  value
FROM auth.config 
WHERE key IN (
  'SITE_URL',
  'ENABLE_EMAIL_CONFIRMATIONS',
  'SMTP_ADMIN_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT'
);
```

## ✅ Checkliste (wenn SMTP bereits konfiguriert ist)

- [ ] **"Enable email confirmations" aktiviert** ⭐ (WICHTIGSTE PRÜFUNG!)
- [ ] Redirect URLs korrekt konfiguriert (inkl. `/api/auth/callback`)
- [ ] Site URL auf Live-Domain gesetzt (nicht localhost)
- [ ] SMTP-Verbindung getestet (keine Fehler im Dashboard)
- [ ] E-Mail-Posteingang geprüft (auch Spam-Ordner!)
- [ ] Diagnose-Skript ausgeführt (`diagnose-email-problem.sql`)
- [ ] Server-Logs geprüft (nach Registrierung)
- [ ] Supabase Logs geprüft (Auth Logs)
- [ ] Test-Registrierung mit anderer E-Mail-Adresse durchgeführt

## 📝 Häufige Probleme

### Problem: "Email could not be sent"
- **Ursache:** SMTP nicht konfiguriert oder falsche SMTP-Daten
- **Lösung:** Prüfe SMTP-Konfiguration im Supabase Dashboard

### Problem: E-Mail kommt nicht an
- **Ursache 1:** E-Mail im Spam-Ordner
- **Lösung:** Spam-Ordner prüfen
- **Ursache 2:** Falsche E-Mail-Adresse
- **Lösung:** E-Mail-Adresse nochmal prüfen

### Problem: "Invalid redirect URL"
- **Ursache:** Redirect-URL nicht in Supabase konfiguriert
- **Lösung:** Redirect URLs in Supabase Dashboard hinzufügen

## 🆘 Support

Falls das Problem weiterhin besteht:
1. Prüfe die Server-Logs für detaillierte Fehlermeldungen
2. Prüfe die Supabase Logs
3. Stelle sicher, dass SMTP korrekt konfiguriert ist
4. Teste mit einer anderen E-Mail-Adresse






