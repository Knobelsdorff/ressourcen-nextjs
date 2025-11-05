# Stripe CLI - Nächste Schritte

## ✅ Stripe CLI wurde erfolgreich installiert!

## Jetzt musst du:

### 1. Bei Stripe einloggen

Öffne ein Terminal und führe aus:

```bash
stripe login
```

Das öffnet einen Browser. Folge den Anweisungen, um dich mit deinem Stripe-Account zu verbinden.

### 2. Webhook Secret bekommen

Nach dem Login, starte den Webhook-Listener in einem **separaten Terminal**:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

**Das zeigt dir den Webhook Secret:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### 3. Webhook Secret zu .env.local hinzufügen

1. Öffne `.env.local`
2. Finde die Zeile: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
3. Ersetze `whsec_xxxxx` mit dem echten Secret (beginnt mit `whsec_`)

### 4. Server neu starten

Nach dem Hinzufügen des Webhook Secrets:

```bash
# Stoppe den aktuellen Server (Ctrl+C)
# Starte neu:
npm run dev
```

### 5. Webhook Listener laufen lassen

**WICHTIG:** Der `stripe listen` Befehl muss während des Testens laufen!

Lasse das Terminal mit `stripe listen --forward-to localhost:3000/api/stripe-webhook` offen, während du die Paywall testest.

## Testen

1. Starte den Next.js Server: `npm run dev`
2. Starte den Stripe Webhook Listener: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
3. Öffne die App im Browser
4. Teste die Paywall mit Test-Karte: `4242 4242 4242 4242`

## Hilfe

- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Webhook Debugging:** Die Logs vom `stripe listen` zeigen alle Webhook-Events

