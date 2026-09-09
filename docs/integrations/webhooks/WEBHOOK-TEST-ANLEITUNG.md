# Webhook Test-Anleitung

## Option 1: Test-Event im Stripe Dashboard senden (Einfacher)

### Schritt 1: Webhook-Endpunkt öffnen
1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf deinen Endpunkt (`https://ressourcen-nextjs.vercel.app/api/stripe-webhook`)

### Schritt 2: Test-Event senden
1. Suche nach einem Button **"Test-Webhook senden"**, **"Send test webhook"** oder ähnlich
2. Falls nicht direkt sichtbar: Klicke auf **"Ereignisse"** oder **"Events"** Tab
3. Oben rechts sollte ein Button sein: **"Event senden"** oder **"Send test event"**
4. Wähle: `checkout.session.completed`
5. Klicke auf **"Event senden"**

### Schritt 3: Prüfe ob Event angekommen ist
1. Nach dem Senden sollte ein Event in der Liste erscheinen
2. Klicke auf das Event
3. Prüfe:
   - **Status**: Sollte "Erfolgreich" oder "Succeeded" sein
   - **Antwort**: Sollte `{"received": true}` sein

## Option 2: Stripe CLI verwenden (Falls Option 1 nicht funktioniert)

### Schritt 1: Stripe CLI installieren

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Oder Download:**
- Gehe zu https://stripe.com/docs/stripe-cli
- Lade die passende Version herunter

### Schritt 2: Bei Stripe anmelden
```bash
stripe login
```
Folge den Anweisungen im Browser.

### Schritt 3: Webhook weiterleiten (für lokale Tests)
```bash
stripe listen --forward-to https://ressourcen-nextjs.vercel.app/api/stripe-webhook
```

### Schritt 4: Test-Event auslösen
In einem neuen Terminal:
```bash
stripe trigger checkout.session.completed
```

**WICHTIG**: Für Live-Webhooks (nicht lokal) musst du das Event direkt im Stripe Dashboard senden (Option 1).

## Option 3: Echte Testzahlung durchführen

1. Erstelle eine Ressource in deiner App
2. Klicke auf "Zugang aktivieren"
3. Verwende Test-Kartendaten: `4242 4242 4242 4242`
4. Schließe die Zahlung ab
5. Prüfe in Stripe → Webhooks → Events

## Prüfe Vercel Logs

Nach dem Senden eines Test-Events:
1. Gehe zu Vercel Dashboard → Deployments
2. Wähle den letzten Deployment aus
3. Klicke auf **"Logs"**
4. Suche nach:
   - `"Stripe Webhook: Request received"`
   - `"Stripe Webhook: Event verified"`
   - `"Stripe Webhook: Access created successfully"`

## Wenn immer noch keine Events ankommen

1. **Prüfe Endpunkt-URL:**
   - Öffne: `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
   - Sollte NICHT "404 Not Found" zeigen
   - Falls "404": Redeploy notwendig

2. **Prüfe Webhook-Konfiguration:**
   - Stelle sicher, dass du im **Test-Modus** bist
   - Prüfe ob `checkout.session.completed` aktiviert ist

3. **Webhook neu erstellen:**
   - Lösche den alten Endpunkt
   - Erstelle einen neuen mit derselben URL
   - Kopiere das neue Signing-Geheimnis
   - Aktualisiere in Vercel

