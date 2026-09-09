# Multi-Account-Prävention Setup

## Wichtige Hinweise

⚠️ **NUR das SQL-Skript ausführen, NICHT die TypeScript-Dateien!**

## Schritt 1: SQL-Skript ausführen

1. Öffne **Supabase Dashboard** → **SQL Editor**
2. Öffne die Datei `supabase-multi-account-prevention.sql`
3. Kopiere **NUR den SQL-Inhalt** (nicht die TypeScript-Dateien!)
4. Füge den SQL-Code in den SQL Editor ein
5. Klicke auf **"Run"**

### Was wird erstellt:
- Tabelle `registration_attempts` für IP-Tracking
- Funktion `can_register_from_ip()` - Prüft Rate-Limit (max 2 pro IP pro 24h)
- Funktion `is_email_domain_blocked()` - Prüft blockierte Email-Domains
- RLS Policies für sicheren Zugriff

## Schritt 2: Code ist bereits implementiert

Die folgenden Dateien wurden bereits erstellt/angepasst:
- ✅ `src/app/api/auth/signup/route.ts` - API-Endpunkt mit Multi-Account-Prävention
- ✅ `src/components/providers/auth-provider.tsx` - Verwendet neuen API-Endpunkt
- ✅ Frontend-Fehlerbehandlung für blockierte Domains

## Schritt 3: Testen

### Paywall-Logik testen:
```bash
# Finde eine User-ID aus Supabase Dashboard
node test-paywall-logic.js <USER_ID>
```

### Registrierung testen:
1. Versuche mit einer blockierten Temp-Mail-Domain zu registrieren (z.B. `test@10minutemail.com`)
2. Sollte Fehler anzeigen: "Diese E-Mail-Domain wird nicht akzeptiert"
3. Versuche 3+ Registrierungen von derselben IP
4. Nach 2 Registrierungen sollte Fehler erscheinen: "Zu viele Registrierungen von dieser IP-Adresse"

## Funktionen im Detail

### `can_register_from_ip(ip_address_text)`
- Prüft ob IP-Adresse bereits 2 erfolgreiche Registrierungen in den letzten 24 Stunden hat
- Gibt `TRUE` zurück wenn weitere Registrierung erlaubt ist
- Gibt `FALSE` zurück wenn Rate-Limit erreicht ist

### `is_email_domain_blocked(email_text)`
- Prüft ob Email-Domain in der Block-Liste ist
- Blockiert bekannte Temp-Mail-Dienste (10minutemail, guerrillamail, etc.)
- Gibt `TRUE` zurück wenn Domain blockiert ist

## Blockierte Email-Domains

Die folgenden Domains werden blockiert:
- 10minutemail.com
- guerrillamail.com
- tempmail.com
- temp-mail.org
- mailinator.com
- throwaway.email
- getnada.com
- maildrop.cc
- mohmal.com
- yopmail.com
- ... und viele weitere (siehe SQL-Skript)

## Troubleshooting

### Fehler: "function can_register_from_ip does not exist"
→ SQL-Skript wurde noch nicht ausgeführt. Führe `supabase-multi-account-prevention.sql` aus.

### Fehler: "relation registration_attempts does not exist"
→ SQL-Skript wurde noch nicht ausgeführt. Führe `supabase-multi-account-prevention.sql` aus.

### Registrierungen werden nicht blockiert
→ Prüfe ob API-Endpunkt `/api/auth/signup` verwendet wird (nicht direkt Supabase `signUp`)
→ Prüfe Server-Logs für `[Multi-Account]` Meldungen

## Nächste Schritte

1. ✅ SQL-Skript ausführen
2. ✅ Testen mit verschiedenen Email-Domains
3. ✅ Testen mit IP-Rate-Limiting
4. ✅ Paywall-Logik testen

