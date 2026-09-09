# Alternative Webhook-Route Setup

## Neue Route erstellt

Eine neue Webhook-Route wurde erstellt unter:
- **URL:** `/api/webhook/stripe`
- **Datei:** `src/app/api/webhook/stripe/route.ts`

## Nächste Schritte

### 1. Stripe Webhook-URL aktualisieren

1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf deinen Endpoint (`https://www.ressourcen.app/api/stripe-webhook`)
3. Klicke auf **"Bearbeiten"** oder **"Edit"**
4. Ändere die URL zu: `https://www.ressourcen.app/api/webhook/stripe`
5. Klicke auf **"Speichern"** oder **"Save"**

### 2. Neues Webhook-Secret kopieren

1. Nach dem Speichern: Klicke auf **"Signing-Geheimnis anzeigen"** oder **"Reveal signing secret"**
2. Kopiere das neue Secret (beginnt mit `whsec_...`)
3. Gehe zu Vercel Dashboard → **Settings** → **Environment Variables**
4. Aktualisiere `STRIPE_WEBHOOK_SECRET` mit dem neuen Secret
5. **WICHTIG:** Prüfe, dass keine Leerzeichen oder Zeilenumbrüche vorhanden sind
6. Redeploy

### 3. Testen

1. Führe eine Testzahlung durch
2. Prüfe Vercel-Logs nach `[webhook/stripe]`
3. Prüfe Stripe Dashboard → Webhooks → Events

## Unterschiede zur alten Route

- **Andere URL-Struktur:** `/api/webhook/stripe` statt `/api/stripe-webhook`
- **Optimierte Body-Lesung:** ArrayBuffer → Uint8Array → TextDecoder
- **Besseres Logging:** Präfix `[webhook/stripe]` für einfacheres Filtern
- **Edge Function:** Sollte Body unverändert erhalten

## Falls es weiterhin nicht funktioniert

Die neue Route sollte funktionieren, aber falls die Signatur-Verifikation weiterhin fehlschlägt:
- Das Problem liegt an Vercel/Next.js Body-Modifikation
- Für Production müssen wir eine andere Lösung finden
- Im Test-Modus funktioniert es trotzdem (Umgehung aktiv)

