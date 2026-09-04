# Webhook: Keine Events bei Testzahlung

## Problem
- Webhook-Endpunkt ist korrekt konfiguriert: `https://www.ressourcen.app/api/stripe-webhook`
- Aber bei Testzahlung entsteht kein Event in Stripe

## Mögliche Ursachen

1. **Endpunkt antwortet nicht schnell genug** (Stripe gibt nach 30 Sekunden auf)
2. **Endpunkt gibt Fehler zurück** (Stripe erstellt kein Event bei Fehlern)
3. **Endpunkt ist nicht erreichbar** (DNS/Netzwerk-Problem)
4. **Testzahlung wird nicht korrekt abgeschlossen**

## Schritt-für-Schritt Debugging

### Schritt 1: Prüfe ob Endpunkt erreichbar ist

1. **Öffne im Browser:**
   ```
   https://www.ressourcen.app/api/stripe-webhook
   ```
2. **Was siehst du?**
   - ✅ `{"status":"ok","message":"Webhook endpoint is reachable",...}` → Endpunkt ist erreichbar!
   - ❌ `404 Not Found` → Endpunkt existiert nicht → Redeploy notwendig
   - ❌ Anderer Fehler → Kopiere die Fehlermeldung

### Schritt 2: Manuelles Test-Event senden

1. **In Stripe Dashboard:**
   - Webhooks → Dein Endpunkt (`we_1SQH5rRaXC7JrsWovptBGjqO`)
   - Klicke auf **"Event senden"** oder **"Send test event"**
   - Wähle: `checkout.session.completed`
   - Klicke auf **"Event senden"**

2. **Prüfe ob Event erscheint:**
   - Nach dem Senden sollte ein Event in der Liste erscheinen
   - Klicke auf das Event
   - Prüfe:
     - **Status**: Sollte "Erfolgreich" oder "Succeeded" sein
     - **Antwort**: Sollte `{"received": true}` sein
     - **Fehler**: Falls vorhanden, kopiere die Fehlermeldung

3. **Prüfe Vercel Logs:**
   - Nach dem Senden des Events
   - Gehe zu Vercel → Deployments → Logs
   - Suche nach: `"Stripe Webhook: Request received"`
   - **Falls vorhanden**: Endpunkt ist erreichbar, aber Problem bei Testzahlung
   - **Falls nicht**: Endpunkt ist nicht erreichbar

### Schritt 3: Prüfe Vercel Logs während Testzahlung

1. **Öffne Vercel Logs:**
   - Vercel Dashboard → Deployments → Dein Deployment → **Logs**
   - Öffne in einem separaten Tab

2. **Führe Testzahlung durch:**
   - Erstelle eine Ressource
   - Klicke auf "Zugang aktivieren"
   - Verwende Test-Karte: `4242 4242 4242 4242`
   - Schließe die Zahlung ab

3. **Prüfe Logs sofort:**
   - Schau sofort in die Vercel Logs
   - Suche nach: `"Stripe Webhook: Request received"`
   - **Falls vorhanden**: Webhook wird aufgerufen, aber Event wird nicht in Stripe angezeigt
   - **Falls nicht**: Stripe sendet den Webhook nicht

### Schritt 4: Prüfe Stripe Zahlung

1. **Gehe zu Stripe Dashboard → Payments**
2. **Prüfe ob die Testzahlung dort erscheint:**
   - Falls ja: Zahlung wurde durchgeführt
   - Falls nein: Zahlung wurde nicht durchgeführt

3. **Falls Zahlung existiert:**
   - Klicke auf die Zahlung
   - Prüfe den Status
   - Prüfe ob `checkout.session.completed` Event ausgelöst wurde

## Häufige Probleme

**Problem: Endpunkt antwortet zu langsam**
- Lösung: Endpunkt sollte innerhalb von 30 Sekunden antworten
- Wir haben bereits `maxDuration: 30` gesetzt

**Problem: Endpunkt gibt Fehler zurück**
- Lösung: Prüfe Vercel Logs für Fehlermeldungen
- Prüfe ob Signatur-Verifikation fehlschlägt

**Problem: Testzahlung wird nicht abgeschlossen**
- Lösung: Prüfe ob Zahlung in Stripe Dashboard erscheint
- Prüfe ob Checkout-Session erfolgreich war

