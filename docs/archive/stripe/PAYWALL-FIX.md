# Paywall-Fixes und Konfiguration

## Was wurde behoben:

### 1. Debug-Logs hinzugefügt
- **Paywall-Komponente**: Loggt alle Checkout-Versuche und Fehler
- **Checkout-API** (`/api/checkout`): Loggt Session-Erstellung und Validierung
- **Webhook-API** (`/api/stripe-webhook`): Loggt alle Webhook-Events und Zugangserstellung

### 2. Verbesserte Fehlerbehandlung
- Checkout-Session wird jetzt validiert (prüft ob URL vorhanden)
- Bessere Fehlermeldungen für den Benutzer
- Detaillierte Logs für Debugging

### 3. Verbesserte Nach-Zahlung-Verarbeitung
- Dashboard wartet 2 Sekunden nach erfolgreicher Zahlung
- Lädt dann Zugangsstatus und Stories neu
- Zeigt Erfolgsmeldung an
- Räumt URL-Parameter auf

## Nächste Schritte - Stripe-Konfiguration:

### 1. Stripe-Keys in `.env.local` hinzufügen

```env
# Stripe Keys (von https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**WICHTIG**: Die Keys sind aktuell NICHT in `.env.local` vorhanden!

### 2. Stripe Dashboard Setup

1. **Test-Modus aktivieren:**
   - Gehe zu https://dashboard.stripe.com/test/apikeys
   - Kopiere den "Secret key" → `STRIPE_SECRET_KEY`

2. **Webhook konfigurieren:**
   - Gehe zu https://dashboard.stripe.com/test/webhooks
   - Klicke "Add endpoint"
   - Endpoint URL: `https://deine-domain.de/api/stripe-webhook`
   - Für lokale Entwicklung: Verwende Stripe CLI (siehe unten)
   - Events: Wähle `checkout.session.completed`
   - Kopiere den "Signing secret" → `STRIPE_WEBHOOK_SECRET`

### 3. Lokale Entwicklung mit Stripe CLI

Für lokale Tests kannst du die Stripe CLI verwenden:

```bash
# Stripe CLI installieren (falls nicht vorhanden)
# macOS: brew install stripe/stripe-cli/stripe
# Oder: https://stripe.com/docs/stripe-cli

# Webhook weiterleiten
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Das zeigt dir den Webhook Secret (whsec_...)
# Füge diesen zu .env.local hinzu
```

### 4. Datenbank-Funktionen prüfen

Stelle sicher, dass die Funktion `create_access_after_payment` in Supabase existiert:

1. Öffne Supabase SQL Editor
2. Führe `supabase-payment-setup.sql` aus (falls noch nicht geschehen)
3. Prüfe ob die Funktion existiert:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'create_access_after_payment';
   ```

### 5. Testen

1. **Test-Karte verwenden:**
   - Karte: `4242 4242 4242 4242`
   - Ablaufdatum: Jedes zukünftige Datum
   - CVC: Beliebige 3 Ziffern

2. **Zahlungsflow testen:**
   - Erstelle eine Ressource
   - Wenn keine Zugang vorhanden: Paywall erscheint
   - Klicke "Jetzt aktivieren" → Stripe Checkout
   - Zahlung abschließen
   - Nach Rückkehr: Zugang sollte aktiviert sein

3. **Logs prüfen:**
   - Browser-Konsole: Paywall-Logs
   - Server-Terminal: Checkout-API und Webhook-Logs
   - Prüfe ob `create_access_after_payment` erfolgreich aufgerufen wurde

## Bekannte Probleme und Lösungen:

### Problem: "Stripe not configured"
**Lösung**: `STRIPE_SECRET_KEY` fehlt in `.env.local` → Hinzufügen

### Problem: "Missing signature or webhook secret"
**Lösung**: `STRIPE_WEBHOOK_SECRET` fehlt in `.env.local` → Hinzufügen

### Problem: "Failed to create access"
**Lösung**: Prüfe ob `create_access_after_payment` Funktion in Supabase existiert

### Problem: Zugang wird nicht aktiviert nach Zahlung
**Lösung**: 
- Prüfe Webhook-Logs in Stripe Dashboard
- Prüfe ob Webhook-Endpoint erreichbar ist (HTTPS für Production)
- Prüfe Server-Logs für Fehler in `create_access_after_payment`

## Debugging:

Alle Komponenten loggen jetzt detailliert:
- `Paywall: Creating checkout session...`
- `Checkout API: Session created...`
- `Stripe Webhook: Access created successfully...`

Prüfe Browser-Konsole und Server-Terminal für diese Logs.

