# Vercel Webhook Problem - Lokal funktioniert, Live nicht

## Problem
- ✅ Funktioniert auf localhost
- ❌ Funktioniert nicht auf Vercel Live-Website

## Mögliche Ursachen in Vercel:

### 1. Vercel Body-Parsing
Vercel könnte den Request-Body automatisch parsen, bevor wir ihn als Text lesen können.

### 2. Webhook-Secret Encoding
Vercel könnte das Secret anders encodieren oder speichern.

### 3. Route-Konfiguration
Die Route-Konfiguration könnte in Vercel anders interpretiert werden.

## Lösung: Vercel-spezifische Konfiguration

### Option 1: Route Handler als Edge Function
Vercel könnte den Body anders behandeln. Lass uns prüfen, ob wir die Route als Edge Function konfigurieren müssen.

### Option 2: Body direkt aus Request lesen
Vercel könnte den Body bereits geparst haben. Wir müssen prüfen, ob wir `request.json()` verwenden müssen statt `request.text()`.

### Option 3: Webhook-Secret Problem
Das Secret könnte in Vercel unvollständig sein oder anders encodiert werden.

## Was zu prüfen ist:

1. **Lokales Webhook-Secret vs. Vercel Secret:**
   - Prüfe `.env.local` → `STRIPE_WEBHOOK_SECRET`
   - Prüfe Vercel → `STRIPE_WEBHOOK_SECRET`
   - Sind beide identisch?

2. **Body-Länge:**
   - Lokal: Was ist die Body-Länge?
   - Vercel: Was ist die Body-Länge?
   - Sind sie identisch?

3. **Body-Format:**
   - Ist der Body lokal und in Vercel im gleichen Format?

## Schnelltest:

Falls du lokal mit Stripe CLI testest:
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Aber in Vercel kommt der Request direkt von Stripe, nicht über die CLI.

Das könnte der Unterschied sein!

## Mögliche Lösung:

Wenn lokal über Stripe CLI funktioniert, aber Vercel nicht:
- Das CLI modifiziert möglicherweise den Request
- Vercel erhält den Request direkt von Stripe
- Stripe sendet möglicherweise einen anderen Request-Format

Wir sollten prüfen, ob der Request von Stripe direkt anders ist als über die CLI.

