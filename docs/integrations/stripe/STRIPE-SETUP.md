# Stripe Payment Setup

## Übersicht

Die App verwendet Stripe für die Zahlungsabwicklung. Das 3-Monats-Paket (179€) ermöglicht es, bis zu 3 Ressourcen zu erstellen und 3 Monate lang täglich zu nutzen.

## Installation

1. Installiere Stripe:
```bash
npm install stripe
```

## Umgebungsvariablen

Füge folgende Variablen zu `.env.local` hinzu:

```env
# Stripe Keys (von https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Service Role Key (für Webhook-Handler)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Stripe Dashboard Setup

1. **Test-Modus aktivieren:**
   - Gehe zu https://dashboard.stripe.com/test/apikeys
   - Kopiere den "Secret key" → `STRIPE_SECRET_KEY`

2. **Webhook konfigurieren:**
   - Gehe zu https://dashboard.stripe.com/test/webhooks
   - Klicke "Add endpoint"
   - Endpoint URL: `https://deine-domain.de/api/stripe-webhook`
   - Events: Wähle `checkout.session.completed`
   - Kopiere den "Signing secret" → `STRIPE_WEBHOOK_SECRET`

3. **Produktion:**
   - Wechsle zu Live-Modus in Stripe
   - Wiederhole die Schritte mit Live-Keys
   - Aktualisiere `.env.local` mit Live-Keys

## Datenbank-Setup

Führe das SQL-Skript aus:
```bash
# In Supabase SQL Editor ausführen:
supabase-payment-setup.sql
```

## Testen

1. **Test-Karte verwenden:**
   - Karte: `4242 4242 4242 4242`
   - Ablaufdatum: Jedes zukünftige Datum
   - CVC: Beliebige 3 Ziffern

2. **Zahlungsflow testen:**
   - Erstelle eine Ressource
   - Klicke "Ressource speichern"
   - Wenn keine Zugang vorhanden: Paywall erscheint
   - Klicke "Jetzt aktivieren" → Stripe Checkout
   - Zahlung abschließen
   - Nach Rückkehr: Zugang sollte aktiviert sein

## Troubleshooting

- **Webhook funktioniert nicht:**
  - Prüfe `STRIPE_WEBHOOK_SECRET`
  - Prüfe Webhook-Logs in Stripe Dashboard
  - Stelle sicher, dass Endpoint erreichbar ist (HTTPS)

- **Checkout-Fehler:**
  - Prüfe `STRIPE_SECRET_KEY`
  - Prüfe Browser-Konsole für Fehler
  - Prüfe Server-Logs

- **Zugang wird nicht erstellt:**
  - Prüfe Supabase-Logs
  - Prüfe ob `create_access_after_payment` Funktion existiert
  - Prüfe RLS-Policies







