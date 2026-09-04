# Vercel Umgebungsvariablen Checkliste

## Für Stripe Checkout (Sandbox/Test-Modus)

### 1. Prüfe ob diese Variablen in Vercel gesetzt sind:

1. **STRIPE_SECRET_KEY**
   - Wert: `sk_test_...` (dein Stripe Test Secret Key)
   - Wo: Stripe Dashboard → Developers → API keys → Reveal test key
   - Wichtig: Muss für **Production** aktiviert sein

2. **STRIPE_WEBHOOK_SECRET** (optional, nur für Webhooks)
   - Wert: `whsec_...` (dein Stripe Webhook Signing Secret)
   - Wo: Stripe Dashboard → Developers → Webhooks → Signing secret
   - Wichtig: Muss für **Production** aktiviert sein

### 2. Weitere benötigte Variablen:

3. **NEXT_PUBLIC_SUPABASE_URL**
   - Wert: `https://xxxxx.supabase.co`
   - Wo: Supabase Dashboard → Settings → API

4. **SUPABASE_SERVICE_ROLE_KEY**
   - Wert: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Wo: Supabase Dashboard → Settings → API → service_role key

## Wie du die Variablen in Vercel setzt:

1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Wähle dein Projekt aus
3. Gehe zu **Settings** → **Environment Variables**
4. Für jede Variable:
   - Klicke auf **"Add New"**
   - Name: z.B. `STRIPE_SECRET_KEY`
   - Value: Dein Wert (z.B. `sk_test_...`)
   - Environment: Wähle **Production** (oder alle drei: Production, Preview, Development)
   - Klicke auf **"Save"**

5. **WICHTIG**: Nach dem Hinzufügen/Ändern von Variablen:
   - Gehe zu **Deployments**
   - Wähle den letzten Deployment
   - Klicke auf **"Redeploy"** (oder pushe einen neuen Commit)

## Schnellprüfung:

Führe diese Schritte aus, um zu prüfen, ob die Variablen gesetzt sind:

1. **Vercel Dashboard → Settings → Environment Variables**
   - Prüfe ob `STRIPE_SECRET_KEY` vorhanden ist
   - Prüfe ob der Wert mit `sk_test_` beginnt (für Sandbox)
   - Prüfe ob **Production** aktiviert ist

2. **Falls fehlend oder falsch:**
   - Kopiere deinen Stripe Test Secret Key aus Stripe Dashboard
   - Füge ihn in Vercel hinzu
   - Redeploy das Projekt

## Troubleshooting:

**Problem: Variablen sind gesetzt, aber Fehler tritt auf**
- Prüfe ob die Variablen für **Production** aktiviert sind
- Prüfe ob nach dem Setzen der Variablen ein **Redeploy** durchgeführt wurde
- Prüfe Vercel-Logs: **Deployments** → Dein Deployment → **Logs**

**Problem: "STRIPE_SECRET_KEY not configured"**
- Die Variable ist nicht gesetzt oder nicht für Production aktiviert
- Lösung: Variable in Vercel hinzufügen und Redeploy

