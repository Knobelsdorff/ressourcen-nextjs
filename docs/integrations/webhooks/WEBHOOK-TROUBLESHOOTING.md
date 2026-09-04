# Webhook Troubleshooting - Zugang wird nicht aktiviert

## Problem
Nach erfolgreicher Zahlung wird der Zugang nicht automatisch aktiviert - "Zugang aktivieren" Button erscheint weiterhin.

## Mögliche Ursachen

### 1. STRIPE_WEBHOOK_SECRET fehlt in Vercel
- **Prüfung**: Vercel Dashboard → Settings → Environment Variables
- **Lösung**: `STRIPE_WEBHOOK_SECRET` hinzufügen (beginnt mit `whsec_...`)

### 2. Webhook-Endpunkt nicht in Stripe konfiguriert
- **Prüfung**: Stripe Dashboard → Developers → Webhooks
- **Lösung**: Webhook-Endpunkt für deine Live-Domain erstellen

### 3. Webhook-Endpunkt ist nicht erreichbar
- **Prüfung**: Stripe Dashboard → Webhooks → Dein Endpoint → Events
- **Lösung**: Prüfe ob Events ankommen oder Fehler auftreten

## Schritt-für-Schritt Lösung

### Schritt 1: Webhook-Endpunkt in Stripe erstellen

1. Gehe zu [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Stelle sicher, dass du im **Test-Modus** bist (Umschalter oben rechts)
3. Klicke auf **"Endpunkt hinzufügen"** (oder "Add endpoint" falls noch Englisch)
4. Endpunkt-URL: `https://deine-domain.vercel.app/api/stripe-webhook`
   - Beispiel: `https://ressourcen-app.vercel.app/api/stripe-webhook`
5. Ereignisse auswählen:
   - `checkout.session.completed` ✅ (oder "Checkout-Sitzung abgeschlossen")
6. Klicke auf **"Endpunkt hinzufügen"** (oder "Hinzufügen")
7. Kopiere den **Signing-Geheimnis** (beginnt mit `whsec_...`)
   - Findest du unter "Signing-Geheimnis" oder "Signing secret" beim erstellten Endpunkt

### Schritt 2: Webhook Secret in Vercel setzen

1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Wähle dein Projekt aus
3. Gehe zu **Settings** → **Environment Variables**
4. Klicke auf **"Add New"**
5. Name: `STRIPE_WEBHOOK_SECRET`
6. Value: Dein Webhook Signing Secret (`whsec_...`)
7. Environment: **Production** (oder alle drei)
8. Klicke auf **"Save"**

### Schritt 3: Redeploy

1. Gehe zu **Deployments**
2. Wähle den letzten Deployment
3. Klicke auf **"Redeploy"**

### Schritt 4: Testen

1. Führe eine Testzahlung durch
2. Prüfe in Stripe Dashboard → Webhooks → Dein Endpoint → **Events**
   - Sollte ein `checkout.session.completed` Event zeigen
   - Status sollte "Succeeded" sein
3. Prüfe Vercel Logs:
   - Deployments → Dein Deployment → **Logs**
   - Suche nach "Stripe Webhook: Access created successfully"

## Manuelle Prüfung

Falls der Webhook nicht funktioniert, kannst du manuell prüfen:

1. **Prüfe ob Zugang in Supabase erstellt wurde:**
   ```sql
   SELECT * FROM public.user_access 
   WHERE user_id = 'deine-user-id'
   ORDER BY created_at DESC;
   ```

2. **Prüfe Vercel Logs:**
   - Suche nach "Stripe Webhook" in den Logs
   - Prüfe ob Fehler auftreten

3. **Prüfe Stripe Dashboard:**
   - Webhooks → Dein Endpoint → Events
   - Prüfe ob Events ankommen und ob Fehler auftreten

## Temporäre Lösung

Falls der Webhook nicht funktioniert, kann der Benutzer:
1. Die Seite neu laden (F5)
2. Das Dashboard aktualisiert sich automatisch und sollte den Zugang erkennen

## Langfristige Lösung

Das Dashboard versucht jetzt mehrmals (5x), den Zugang zu prüfen, falls der Webhook etwas länger braucht. Falls nach 10 Sekunden immer noch kein Zugang aktiviert ist, wird eine Warnung angezeigt.

