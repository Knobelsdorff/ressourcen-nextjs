# 📧 Email-Versand einrichten

## Problem
Emails werden aktuell nicht versendet, weil kein SMTP-Server konfiguriert ist.

## Lösung: Supabase SMTP konfigurieren

### Schritt 1: SMTP in Supabase Dashboard konfigurieren

1. Gehe zu **Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**
2. Aktiviere **"Enable Custom SMTP"**
3. Konfiguriere deinen SMTP-Server:

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

#### Option B: Andere SMTP-Anbieter
- **GMX** (für EvilMuelli@gmx.de):
  ```
  Host: mail.gmx.net
  Port: 587
  Username: m07a2f27 (oder dein GMX-Username)
  Password: dein-gmx-passwort
  Sender Email: EvilMuelli@gmx.de (die Email-Adresse, die angezeigt wird)
  ```
  
  **WICHTIG bei GMX:**
  - Der `Username` kann anders sein als die Email-Adresse (z.B. `m07a2f27`)
  - Die `Sender Email` ist die tatsächliche Email-Adresse (z.B. `EvilMuelli@gmx.de`)

- **SendGrid**, **Mailgun**, etc. (siehe deren Dokumentation)

### Schritt 2: SMTP-Daten in .env.local eintragen

Füge folgende Variablen zu deiner `.env.local` Datei hinzu:

```env
# SMTP Konfiguration (aus Supabase Dashboard kopieren)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=deine-email@gmail.com  # Oder Username (z.B. bei GMX: m07a2f27)
SMTP_PASSWORD=dein-app-passwort
SMTP_FROM_EMAIL=noreply@ressourcen.app  # Absender-Email (wird in Email angezeigt)
```

**WICHTIG:** 
- `SMTP_USER` = Username für SMTP-Authentifizierung (kann anders sein als Email-Adresse)
- `SMTP_FROM_EMAIL` = Absender-Email, die in der Email angezeigt wird (muss gültige Email sein)
- Bei GMX: Username kann z.B. `m07a2f27` sein, aber `SMTP_FROM_EMAIL` sollte `EvilMuelli@gmx.de` sein

### Schritt 3: Server neu starten

Nach dem Hinzufügen der SMTP-Variablen:

```bash
# Stoppe den Server (Ctrl+C)
# Starte neu
npm run dev
```

### Schritt 4: Testen

1. Erstelle eine Ressource mit Klienten-Email (z.B. `EvilMuelli@gmx.de`)
2. Prüfe die Server-Logs - sollte "Email sent via SMTP" anzeigen
3. Prüfe den Email-Posteingang

## Troubleshooting

### Email kommt nicht an?

1. **Prüfe Server-Logs:**
   - Suche nach "Email sent via SMTP" oder Fehlermeldungen
   - Prüfe ob SMTP-Daten korrekt sind

2. **Prüfe Spam-Ordner:**
   - Emails können im Spam landen

3. **Prüfe SMTP-Konfiguration:**
   - Sind alle Variablen in `.env.local` gesetzt?
   - Stimmen die Daten mit Supabase Dashboard überein?

4. **Teste SMTP-Verbindung:**
   ```bash
   # In Node.js REPL testen
   node
   > const nodemailer = require('nodemailer');
   > const transporter = nodemailer.createTransport({
       host: process.env.SMTP_HOST,
       port: parseInt(process.env.SMTP_PORT),
       auth: {
         user: process.env.SMTP_USER,
         pass: process.env.SMTP_PASSWORD
       }
     });
   > transporter.verify();
   ```

### GMX SMTP-Konfiguration

Für GMX (EvilMuelli@gmx.de):

```env
SMTP_HOST=mail.gmx.net
SMTP_PORT=587
SMTP_USER=m07a2f27  # Dein GMX-Username (kann anders sein als Email-Adresse)
SMTP_PASSWORD=dein-gmx-passwort
SMTP_FROM_EMAIL=EvilMuelli@gmx.de  # Die Email-Adresse, die als Absender angezeigt wird
```

**WICHTIG bei GMX:**
- `SMTP_USER` = Dein GMX-Username (z.B. `m07a2f27`) - **nicht** die Email-Adresse
- `SMTP_FROM_EMAIL` = Die tatsächliche Email-Adresse (z.B. `EvilMuelli@gmx.de`)
- Prüfe die [GMX SMTP-Dokumentation](https://hilfe.gmx.net/pop-imap/popsmtp/index.html) für weitere Details

## Alternative: Ohne SMTP (nur für Testing)

Falls du keine SMTP-Konfiguration einrichten möchtest:
- Magic Links werden in den Server-Logs ausgegeben
- Du kannst den Link manuell kopieren und an den Klienten senden

## ✅ Checkliste

- [ ] SMTP in Supabase Dashboard konfiguriert
- [ ] SMTP-Variablen in `.env.local` eingetragen
- [ ] Server neu gestartet
- [ ] Test-Email erstellt
- [ ] Email im Posteingang erhalten (oder Spam geprüft)

