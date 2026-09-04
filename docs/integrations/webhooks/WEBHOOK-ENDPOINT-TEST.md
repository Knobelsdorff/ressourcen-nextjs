# Webhook-Endpunkt Test - Keine Events in Stripe

## Problem
- Keine Events erscheinen in Stripe
- Das bedeutet: Stripe kann den Endpunkt nicht erreichen oder er antwortet nicht korrekt

## Schritt 1: Prüfe ob Endpunkt erreichbar ist

1. **Öffne im Browser:**
   ```
   https://ressourcen-nextjs.vercel.app/api/stripe-webhook
   ```

2. **Was siehst du?**
   - ✅ `{"status":"ok","message":"Webhook endpoint is reachable",...}` → Endpunkt ist erreichbar!
   - ❌ `404 Not Found` → Endpunkt existiert nicht → Redeploy notwendig
   - ❌ `Method not allowed` → Endpunkt existiert, aber GET nicht erlaubt (sollte jetzt funktionieren)
   - ❌ Anderer Fehler → Kopiere die Fehlermeldung

## Schritt 2: Prüfe Stripe Webhook-Konfiguration

1. **Gehe zu Stripe Dashboard → Webhooks**
2. **Klicke auf deinen Endpunkt**
3. **Prüfe:**
   - **URL**: Sollte genau sein: `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
   - **Status**: Sollte "Aktiv" oder "Active" sein
   - **Ereignisse**: Sollte `checkout.session.completed` enthalten
   - **Letzter Test**: Wann wurde der letzte Test durchgeführt?
   - **Fehler**: Gibt es Fehlermeldungen?

## Schritt 3: Test-Event manuell senden

1. **In Stripe Dashboard:**
   - Webhooks → Dein Endpunkt
   - Suche nach Button: **"Event senden"** oder **"Send test event"**
   - Wähle: `checkout.session.completed`
   - Klicke auf **"Event senden"**

2. **Prüfe Vercel Logs:**
   - Nach dem Senden des Events
   - Gehe zu Vercel → Deployments → Logs
   - Suche nach: `"Stripe Webhook: Request received"`
   - **Falls vorhanden**: Endpunkt ist erreichbar, aber Signatur-Problem
   - **Falls nicht**: Endpunkt ist nicht erreichbar

## Schritt 4: Prüfe Vercel Deployment

1. **Gehe zu Vercel Dashboard → Deployments**
2. **Prüfe:**
   - Ist der letzte Deployment erfolgreich? (Grüner Haken)
   - Wann wurde er deployed?
   - Gibt es Fehler im Build?

## Häufige Probleme

**Problem: Endpunkt gibt 404**
- Lösung: Redeploy in Vercel
- Prüfe ob die Route-Datei existiert: `src/app/api/stripe-webhook/route.ts`

**Problem: Endpunkt antwortet zu langsam**
- Stripe gibt auf, wenn Endpunkt nicht innerhalb von 30 Sekunden antwortet
- Lösung: Endpunkt sollte schnell antworten (haben wir implementiert)

**Problem: Falsche URL in Stripe**
- Lösung: Prüfe ob URL exakt übereinstimmt
- Keine `/` am Ende
- `https://` nicht `http://`

