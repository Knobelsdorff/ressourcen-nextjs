# Webhook Signature Verification Fix

## Problem
"Signature verification failed: No signatures found matching the expected signature for payload"

## Lösung

### Mögliche Ursachen:

1. **Falsches Webhook-Secret in Vercel**
   - Das `STRIPE_WEBHOOK_SECRET` in Vercel stimmt nicht mit dem Secret in Stripe überein
   - Lösung: Prüfe und aktualisiere das Secret

2. **Body wird nicht korrekt als raw body verarbeitet**
   - Next.js parst den Body automatisch
   - Lösung: Route-Konfiguration hinzugefügt (`export const dynamic = 'force-dynamic'`)

3. **Webhook-Secret wurde nicht kopiert**
   - Das Secret wurde nicht korrekt von Stripe nach Vercel kopiert
   - Lösung: Neues Secret kopieren

## Schritt-für-Schritt Fix:

### Schritt 1: Prüfe Webhook-Secret in Stripe

1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf deinen Endpunkt (`https://ressourcen-nextjs.vercel.app/api/stripe-webhook`)
3. Klicke auf **"Signing-Geheimnis anzeigen"** oder **"Reveal signing secret"**
4. Kopiere das komplette Secret (beginnt mit `whsec_...`)
5. **WICHTIG**: Stelle sicher, dass du das Secret komplett kopierst (manchmal wird es abgeschnitten)

### Schritt 2: Aktualisiere Webhook-Secret in Vercel

1. Gehe zu Vercel Dashboard → **Settings** → **Environment Variables**
2. Finde `STRIPE_WEBHOOK_SECRET`
3. Klicke auf **"Edit"** oder **"Bearbeiten"**
4. Lösche den alten Wert komplett
5. Füge das neue Secret aus Schritt 1 ein
6. **WICHTIG**: Prüfe dass:
   - Keine Leerzeichen am Anfang/Ende sind
   - Das Secret komplett ist (beginnt mit `whsec_...`)
   - Keine Zeilenumbrüche vorhanden sind
7. Klicke auf **"Save"**

### Schritt 3: Redeploy

1. Gehe zu **Deployments**
2. Wähle den letzten Deployment aus
3. Klicke auf **"Redeploy"**
4. Warte bis der Deploy abgeschlossen ist

### Schritt 4: Teste erneut

1. Führe eine Testzahlung durch
2. Prüfe Vercel Logs:
   - Suche nach: `"Stripe Webhook: Body received, length:"`
   - Suche nach: `"Stripe Webhook: Signature check"`
   - Prüfe ob die Längen korrekt sind

## Debugging

Falls es immer noch nicht funktioniert:

1. **Prüfe Vercel Logs:**
   - Gehe zu Deployments → Logs
   - Suche nach: `"Stripe Webhook: Signature check"`
   - Prüfe ob `webhookSecretLength` > 0 ist
   - Falls 0: Secret ist nicht gesetzt

2. **Prüfe Stripe Events:**
   - Stripe Dashboard → Webhooks → Events
   - Prüfe ob Events ankommen
   - Prüfe ob Fehler auftreten

3. **Vergleiche Secrets:**
   - Stripe: Signing-Geheimnis kopieren
   - Vercel: `STRIPE_WEBHOOK_SECRET` Wert prüfen
   - Beide sollten identisch sein

## Alternative: Webhook neu erstellen

Falls nichts hilft:

1. **Lösche alten Webhook in Stripe**
2. **Erstelle neuen Webhook:**
   - URL: `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
   - Events: `checkout.session.completed`
3. **Kopiere neues Signing-Geheimnis**
4. **Aktualisiere in Vercel**
5. **Redeploy**

