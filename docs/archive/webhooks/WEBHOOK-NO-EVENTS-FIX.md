# Webhook wird nicht aufgerufen - Keine Events

## Problem
Stripe sendet keine Events an den Webhook-Endpunkt.

## Lösung: Webhook-Endpunkt neu konfigurieren

### Schritt 1: Webhook-Endpunkt in Stripe prüfen

1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf deinen Endpunkt (`https://ressourcen-nextjs.vercel.app/api/stripe-webhook`)
3. Prüfe:
   - **Status**: Sollte "Aktiv" oder "Active" sein
   - **URL**: Sollte `https://ressourcen-nextjs.vercel.app/api/stripe-webhook` sein
   - **Ereignisse**: Sollte `checkout.session.completed` enthalten

### Schritt 2: Webhook-Endpunkt testen

1. In Stripe: Klicke auf deinen Endpunkt
2. Klicke auf **"Event senden"** oder **"Send test webhook"**
3. Wähle: `checkout.session.completed`
4. Klicke auf **"Event senden"**
5. Prüfe ob jetzt ein Event erscheint

### Schritt 3: Prüfe ob Endpunkt erreichbar ist

1. Öffne im Browser: `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
2. Du solltest eine Fehlermeldung sehen (z.B. "Method not allowed" oder ähnlich)
3. **Wichtig**: Du solltest NICHT "404 Not Found" sehen
4. Falls "404": Der Endpunkt ist nicht erreichbar → Redeploy notwendig

### Schritt 4: Webhook-Endpunkt neu erstellen (falls nötig)

Falls der Test fehlschlägt:

1. **Lösche den alten Endpunkt:**
   - Stripe Dashboard → Webhooks → Dein Endpunkt
   - Klicke auf **"Löschen"** oder **"Delete"**

2. **Erstelle neuen Endpunkt:**
   - Klicke auf **"Endpunkt hinzufügen"**
   - URL: `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
   - Ereignisse: `checkout.session.completed`
   - **WICHTIG**: Stelle sicher, dass du im **Test-Modus** bist!

3. **Kopiere Signing-Geheimnis erneut:**
   - Nach dem Erstellen: Kopiere das Signing-Geheimnis
   - Aktualisiere `STRIPE_WEBHOOK_SECRET` in Vercel
   - Redeploy

### Schritt 5: Testzahlung durchführen

Nach dem Neuerstellen:

1. Führe eine neue Testzahlung durch
2. Prüfe sofort in Stripe → Webhooks → Events
3. Es sollte jetzt ein Event erscheinen

## Häufige Probleme

**Problem: Webhook-Endpunkt ist nicht erreichbar**
- Lösung: Prüfe ob die Domain korrekt ist
- Prüfe ob der Deployment erfolgreich war
- Redeploy falls nötig

**Problem: Test-Modus vs. Live-Modus**
- Lösung: Stelle sicher, dass du im Test-Modus bist (Toggle oben rechts)
- Webhook-Endpunkt muss im Test-Modus erstellt werden

**Problem: Falsches Event ausgewählt**
- Lösung: Prüfe ob `checkout.session.completed` aktiviert ist
- Prüfe ob andere Events ausgewählt sind

## Schnelltest

1. **Manuelles Event senden:**
   - Stripe Dashboard → Webhooks → Dein Endpunkt
   - Klicke auf **"Event senden"** oder **"Send test webhook"**
   - Wähle `checkout.session.completed`
   - Klicke auf **"Event senden"**

2. **Prüfe Vercel Logs:**
   - Nach dem Senden des Test-Events
   - Gehe zu Vercel → Deployments → Logs
   - Suche nach "Stripe Webhook: Request received"
   - Falls vorhanden: Webhook funktioniert!
   - Falls nicht: Webhook-Endpunkt ist nicht erreichbar

