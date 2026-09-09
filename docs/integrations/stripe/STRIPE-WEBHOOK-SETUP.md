# Stripe Webhook Secret Setup

## Option 1: Stripe CLI (Empfohlen für lokale Entwicklung)

### 1. Stripe CLI installieren

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Oder Download:**
- Gehe zu https://stripe.com/docs/stripe-cli
- Lade die passende Version für dein System herunter

### 2. Stripe CLI authentifizieren

```bash
stripe login
```

Folge den Anweisungen im Browser.

### 3. Webhook weiterleiten

In einem separaten Terminal:
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

**Das zeigt dir den Webhook Secret:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Kopiere diesen Secret (whsec_...)** und füge ihn zu `.env.local` hinzu.

## Option 2: Stripe Dashboard (Für Production oder wenn CLI nicht möglich)

### 1. Gehe zu Stripe Dashboard
- https://dashboard.stripe.com/test/webhooks

### 2. Webhook Endpoint erstellen
- Klicke "Add endpoint"
- Endpoint URL: `https://deine-domain.de/api/stripe-webhook`
  - Für lokale Tests: Verwende ngrok oder ähnliches für HTTPS-Tunnel
- Events: Wähle `checkout.session.completed`
- Klicke "Add endpoint"

### 3. Webhook Secret kopieren
- Nach dem Erstellen findest du den "Signing secret" (whsec_...)
- Kopiere diesen und füge ihn zu `.env.local` hinzu

## WICHTIG: Für lokale Entwicklung

**Verwende die Stripe CLI (Option 1)**, da sie:
- Automatisch Webhooks weiterleitet
- Keine HTTPS/ngrok benötigt
- Einfacher zu testen ist

## .env.local Setup

Füge folgende Zeilen hinzu:

```env
STRIPE_SECRET_KEY=sk_test_xxxxx  # Dein Stripe Test Secret Key (aus Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Von Stripe CLI oder Dashboard
```

**Nach dem Hinzufügen:**
1. Server neu starten (damit neue Umgebungsvariablen geladen werden)
2. Teste die Paywall

