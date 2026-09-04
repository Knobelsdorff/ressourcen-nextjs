# Setup-Anleitung: Multi-Account-Prävention

## ⚠️ WICHTIG: Nur SQL ausführen!

Du hast versucht, TypeScript-Code in Supabase SQL Editor auszuführen. Das funktioniert nicht!

### ❌ FALSCH:
- TypeScript-Dateien (`src/app/api/auth/signup/route.ts`) in SQL Editor einfügen
- JavaScript-Code in SQL Editor einfügen

### ✅ RICHTIG:
- **NUR** die SQL-Datei (`supabase-multi-account-prevention.sql`) in SQL Editor einfügen

---

## Schritt-für-Schritt Anleitung

### 1. SQL-Skript ausführen

1. Öffne **Supabase Dashboard** → **SQL Editor**
2. Öffne die Datei `supabase-multi-account-prevention.sql` in deinem Code-Editor
3. Kopiere **NUR den SQL-Inhalt** (alles zwischen `--` Kommentaren)
4. Füge den SQL-Code in den Supabase SQL Editor ein
5. Klicke auf **"Run"**

**Was wird erstellt:**
- ✅ Tabelle `registration_attempts`
- ✅ Funktion `can_register_from_ip()`
- ✅ Funktion `is_email_domain_blocked()`
- ✅ RLS Policies

### 2. TypeScript-Code ist bereits implementiert

Die folgenden Dateien sind **bereits in deinem Code** und werden automatisch verwendet:
- ✅ `src/app/api/auth/signup/route.ts` - API-Endpunkt mit Multi-Account-Prävention
- ✅ `src/components/providers/auth-provider.tsx` - Verwendet neuen API-Endpunkt

**Du musst diese Dateien NICHT in Supabase ausführen!** Sie sind bereits Teil deiner Next.js-Anwendung.

### 3. Testen

Nach dem SQL-Setup kannst du testen:

```bash
# Paywall-Logik testen (mit User-ID aus Supabase)
node test-paywall-logic.js <USER_ID>
```

---

## Was passiert wenn alles funktioniert?

1. **Registrierung mit blockierter Email:**
   - Versuche: `test@10minutemail.com`
   - Fehler: "Diese E-Mail-Domain wird nicht akzeptiert"

2. **IP-Rate-Limiting:**
   - 2 Registrierungen von derselben IP = ✅ OK
   - 3. Registrierung von derselben IP = ❌ "Zu viele Registrierungen..."

3. **Paywall:**
   - 1. Ressource = ✅ Kostenlos
   - 2. Ressource = ❌ Paywall erscheint
   - Audio nach 3 Tagen = ❌ Paywall erscheint

---

## Troubleshooting

### Fehler: "function can_register_from_ip does not exist"
→ SQL-Skript wurde noch nicht ausgeführt. Führe `supabase-multi-account-prevention.sql` aus.

### Fehler: "relation registration_attempts does not exist"
→ SQL-Skript wurde noch nicht ausgeführt. Führe `supabase-multi-account-prevention.sql` aus.

### Registrierungen werden nicht blockiert
→ Prüfe ob der Server läuft (`npm run dev`)
→ Prüfe Terminal-Logs für `[Multi-Account]` Meldungen
→ Stelle sicher, dass `/api/auth/signup` verwendet wird (nicht direkt Supabase)

---

## Nächste Schritte

1. ✅ SQL-Skript `supabase-multi-account-prevention.sql` in Supabase ausführen
2. ✅ Server neu starten (`npm run dev`)
3. ✅ Testen mit verschiedenen Email-Domains
4. ✅ Paywall-Logik testen

