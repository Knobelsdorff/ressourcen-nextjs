# Webhook Setup - Schritt für Schritt (Deutsch)

## Problem
Nach erfolgreicher Zahlung wird der Zugang nicht automatisch aktiviert.

## Lösung: Webhook in Stripe einrichten

### Schritt 1: Webhook-Endpunkt in Stripe erstellen

1. **Gehe zu Stripe Dashboard:**
   - Öffne [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
   - **Wichtig**: Stelle sicher, dass du im **Test-Modus** bist (Umschalter oben rechts sollte "Testmodus" anzeigen)

2. **Endpunkt hinzufügen:**
   - Klicke auf den Button **"Endpunkt hinzufügen"** (oder "Add endpoint" falls noch Englisch)
   - Dieser Button befindet sich meist oben rechts oder in der Mitte der Seite

3. **Endpunkt-URL eingeben:**
   - Im Feld "Endpunkt-URL" oder "Endpoint URL" gibst du ein:
   - `https://deine-domain.vercel.app/api/stripe-webhook`
   - Beispiel: `https://ressourcen-app.vercel.app/api/stripe-webhook`
   - **Wichtig**: Ersetze `deine-domain.vercel.app` mit deiner tatsächlichen Vercel-Domain

4. **Ereignisse auswählen:**
   - Suche nach: `checkout.session.completed`
   - Oder auf Deutsch: "Checkout-Sitzung abgeschlossen"
   - Aktiviere dieses Ereignis mit einem Häkchen ✅

5. **Endpunkt speichern:**
   - Klicke auf **"Endpunkt hinzufügen"** oder **"Hinzufügen"** (oder "Add endpoint")

6. **Signing-Geheimnis kopieren:**
   - Nach dem Erstellen findest du beim Endpunkt ein Feld **"Signing-Geheimnis"** oder **"Signing secret"**
   - Kopiere diesen Wert (beginnt mit `whsec_...`)
   - **Wichtig**: Dieser Wert wird in Schritt 2 benötigt!

### Schritt 2: Webhook Secret in Vercel setzen

1. **Gehe zu Vercel Dashboard:**
   - Öffne [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Wähle dein Projekt aus

2. **Umgebungsvariablen öffnen:**
   - Klicke auf **"Settings"** (Einstellungen)
   - Klicke auf **"Environment Variables"** (Umgebungsvariablen)

3. **Neue Variable hinzufügen:**
   - Klicke auf **"Add New"** (Hinzufügen)
   - **Name**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: Füge hier den Signing-Geheimnis ein, den du in Schritt 1 kopiert hast (`whsec_...`)
   - **Environment**: Wähle **Production** (oder alle drei: Production, Preview, Development)
   - Klicke auf **"Save"** (Speichern)

### Schritt 3: Redeploy

1. **Gehe zu Deployments:**
   - Klicke auf **"Deployments"** (Bereitstellungen)
   - Wähle den letzten Deployment aus
   - Klicke auf **"Redeploy"** (Neu bereitstellen)
   - Warte bis der Deploy abgeschlossen ist

### Schritt 4: Testen

1. **Testzahlung durchführen:**
   - Erstelle eine Ressource
   - Klicke auf "Zugang aktivieren"
   - Verwende Test-Kartendaten: `4242 4242 4242 4242`

2. **In Stripe prüfen:**
   - Gehe zu Stripe Dashboard → **Webhooks** → Dein Endpunkt
   - Klicke auf **"Ereignisse"** oder **"Events"**
   - Du solltest ein `checkout.session.completed` Event sehen
   - Status sollte **"Erfolgreich"** oder **"Succeeded"** sein

3. **Zugang prüfen:**
   - Nach der Zahlung sollte im Dashboard automatisch der Zugang aktiviert werden
   - Falls nicht: Seite neu laden (F5)
   - Der "Zugang aktivieren" Button sollte verschwinden

## Deutsche Stripe-Begriffe

- **"Endpunkt hinzufügen"** = Add endpoint
- **"Signing-Geheimnis"** = Signing secret
- **"Ereignisse"** = Events
- **"Testmodus"** = Test mode
- **"Checkout-Sitzung abgeschlossen"** = checkout.session.completed

## Troubleshooting

**Problem: "Endpunkt hinzufügen" Button nicht gefunden**
- Stelle sicher, dass du im Test-Modus bist
- Versuche die Seite neu zu laden
- Falls du Stripe auf Englisch hast: Suche nach "Add endpoint"

**Problem: Signing-Geheimnis nicht sichtbar**
- Klicke auf den erstellten Endpunkt
- Das Signing-Geheimnis sollte dort angezeigt werden
- Falls nicht: Klicke auf "Anzeigen" oder "Reveal"

**Problem: Webhook funktioniert immer noch nicht**
- Prüfe Vercel Logs: Deployments → Dein Deployment → Logs
- Suche nach "Stripe Webhook" in den Logs
- Prüfe ob Fehler auftreten

