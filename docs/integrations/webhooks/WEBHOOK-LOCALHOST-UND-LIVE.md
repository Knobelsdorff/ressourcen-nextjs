# Webhook Setup für Localhost UND Live-Website

## Übersicht

Du brauchst **zwei verschiedene Setups**:
1. **Localhost**: Stripe CLI leitet Webhooks weiter (temporäres Secret)
2. **Live-Website**: Stripe sendet direkt an deine Domain (permanentes Secret)

## Setup für Localhost

### Schritt 1: Stripe CLI installieren (falls noch nicht vorhanden)

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Oder Download von https://stripe.com/docs/stripe-cli
```

### Schritt 2: Bei Stripe anmelden

```bash
stripe login
```

### Schritt 3: Webhook-Listener starten

In einem **separaten Terminal** (während `npm run dev` läuft):

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

**Das zeigt dir ein temporäres Secret:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### Schritt 4: Temporäres Secret in `.env.local` setzen

1. Öffne `.env.local`
2. Finde oder füge hinzu:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Temporäres Secret von Stripe CLI
   ```
3. **WICHTIG**: Dieses Secret ändert sich bei jedem `stripe listen` neu!

### Schritt 5: Server neu starten

Nach dem Setzen des Secrets:
```bash
# Stoppe Server (Ctrl+C)
# Starte neu:
npm run dev
```

## Setup für Live-Website

### Schritt 1: Webhook-Endpunkt in Stripe erstellen

1. Gehe zu Stripe Dashboard → **Webhooks** (im **Test-Modus**!)
2. Klicke auf **"Endpunkt hinzufügen"**
3. **URL**: `https://www.ressourcen.app/api/stripe-webhook`
4. **Ereignisse**: `checkout.session.completed`
5. Klicke auf **"Endpunkt hinzufügen"**
6. **Kopiere das Signing-Geheimnis** (permanentes Secret, beginnt mit `whsec_...`)

### Schritt 2: Permanentes Secret in Vercel setzen

1. Gehe zu Vercel Dashboard → **Settings** → **Environment Variables**
2. Finde `STRIPE_WEBHOOK_SECRET`
3. Klicke auf **"Edit"**
4. **Lösche** das temporäre Secret (von Stripe CLI)
5. **Füge** das permanente Secret ein (von Stripe Dashboard)
6. **Environment**: Production (oder alle drei)
7. Klicke auf **"Save"**

### Schritt 3: Redeploy

1. Gehe zu **Deployments**
2. Wähle den letzten Deployment
3. Klicke auf **"Redeploy"**

## Zusammenfassung

### Localhost (.env.local):
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Temporäres Secret von `stripe listen`
```
- Wird automatisch von Stripe CLI generiert
- Ändert sich bei jedem `stripe listen` neu
- Nur für lokale Entwicklung

### Live-Website (Vercel):
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Permanentes Secret von Stripe Dashboard
```
- Wird von Stripe Dashboard generiert
- Bleibt gleich (permanent)
- Für Produktion

## Workflow

### Beim lokalen Entwickeln:

1. **Terminal 1**: `npm run dev` (Next.js Server)
2. **Terminal 2**: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
3. **Nach `stripe listen`**: Neues Secret kopieren → `.env.local` aktualisieren → Server neu starten

### Für Live-Website:

- Funktioniert automatisch, sobald der Webhook-Endpunkt in Stripe konfiguriert ist
- Keine Stripe CLI nötig

## Troubleshooting

**Problem: Localhost funktioniert nicht**
- Lösung: Prüfe ob `stripe listen` läuft
- Prüfe ob Secret in `.env.local` aktuell ist
- Server neu starten nach Secret-Änderung

**Problem: Live-Website funktioniert nicht**
- Lösung: Prüfe ob URL in Stripe korrekt ist: `https://www.ressourcen.app/api/stripe-webhook`
- Prüfe ob Secret in Vercel korrekt ist
- Redeploy nach Secret-Änderung

