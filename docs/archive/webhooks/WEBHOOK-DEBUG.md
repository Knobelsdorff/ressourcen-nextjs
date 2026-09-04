# Webhook Debugging - Zugang wird nicht aktiviert

## Problem
Nach Testzahlung wird der Zugang nicht aktiviert. Logs zeigen: `hasActiveAccess: false`

## Debugging-Schritte

### 1. Prüfe Stripe Webhook Events

1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf deinen Endpunkt (`https://ressourcen-nextjs.vercel.app/api/stripe-webhook`)
3. Klicke auf **"Ereignisse"** oder **"Events"**
4. Prüfe ob ein `checkout.session.completed` Event vorhanden ist
5. **WICHTIG**: Klicke auf das Event und prüfe:
   - **Status**: Sollte "Erfolgreich" oder "Succeeded" sein
   - **Antwort**: Sollte `{"received": true}` sein
   - **Fehler**: Falls vorhanden, kopiere die Fehlermeldung

### 2. Prüfe Vercel Logs

1. Gehe zu Vercel Dashboard → **Deployments**
2. Wähle den letzten Deployment aus
3. Klicke auf **"Logs"**
4. Suche nach:
   - `"Stripe Webhook: Request received"`
   - `"Stripe Webhook: Access created successfully"`
   - `"Stripe Webhook: Error"`
5. Kopiere alle relevanten Log-Zeilen

### 3. Prüfe Supabase Datenbank

Führe das SQL-Skript `check-webhook-status.sql` in Supabase SQL Editor aus:

1. Gehe zu Supabase Dashboard → **SQL Editor**
2. Kopiere den Inhalt von `check-webhook-status.sql`
3. Führe das Skript aus
4. Prüfe ob ein `user_access` Eintrag erstellt wurde

### 4. Mögliche Probleme

**Problem 1: Webhook wird nicht aufgerufen**
- Lösung: Prüfe ob Endpunkt in Stripe korrekt konfiguriert ist
- Prüfe ob `STRIPE_WEBHOOK_SECRET` in Vercel gesetzt ist

**Problem 2: Webhook schlägt fehl**
- Lösung: Prüfe Vercel Logs für Fehlermeldungen
- Prüfe ob `STRIPE_SECRET_KEY` in Vercel korrekt ist

**Problem 3: RPC-Funktion schlägt fehl**
- Lösung: Prüfe Supabase Logs
- Prüfe ob `create_access_after_payment` Funktion existiert

**Problem 4: User-ID stimmt nicht überein**
- Lösung: Prüfe ob `userId` in Stripe Session Metadata korrekt ist

## Was du mir senden solltest:

1. **Stripe Webhook Event Details:**
   - Status des Events
   - Antwort-Code
   - Fehlermeldung (falls vorhanden)

2. **Vercel Logs:**
   - Alle Zeilen mit "Stripe Webhook"
   - Fehlermeldungen

3. **Supabase SQL Ergebnis:**
   - Ergebnis des `check-webhook-status.sql` Skripts

