# Stripe Live-Modus Setup

## Schritt-für-Schritt Anleitung: Von Sandbox zu Live

### 1. Stripe Dashboard: Live-Keys generieren

1. Gehe zu [Stripe Dashboard](https://dashboard.stripe.com)
2. **WICHTIG**: Stelle sicher, dass du im **Live-Modus** bist (Toggle oben rechts)
3. Gehe zu **Developers** → **API keys**
4. Kopiere:
   - **Publishable key** (beginnt mit `pk_live_...`)
   - **Secret key** (beginnt mit `sk_live_...`) - Klicke auf "Reveal test key" falls nötig

### 2. Stripe Webhook für Live-Modus einrichten

1. Im Stripe Dashboard (Live-Modus):
2. Gehe zu **Developers** → **Webhooks**
3. Klicke auf **"Add endpoint"**
4. Endpoint URL: `https://deine-domain.vercel.app/api/stripe-webhook`
5. Events auswählen:
   - `checkout.session.completed` ✅
6. Klicke auf **"Add endpoint"**
7. Kopiere den **Signing secret** (beginnt mit `whsec_...`)

### 3. Vercel Umgebungsvariablen aktualisieren

1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Wähle dein Projekt aus
3. Gehe zu **Settings** → **Environment Variables**
4. Aktualisiere folgende Variablen:

   **STRIPE_SECRET_KEY:**
   - Aktuell: `sk_test_...` (Test-Key)
   - Neu: `sk_live_...` (Live-Key von Schritt 1)

   **STRIPE_WEBHOOK_SECRET:**
   - Aktuell: `whsec_...` (Test-Webhook)
   - Neu: `whsec_...` (Live-Webhook von Schritt 2)

5. **WICHTIG**: Stelle sicher, dass die Variablen für **Production** aktiviert sind
6. Klicke auf **"Save"**

### 4. Redeploy (wichtig!)

Nach dem Aktualisieren der Umgebungsvariablen:
1. Gehe zu **Deployments**
2. Wähle den letzten Deployment aus
3. Klicke auf **"Redeploy"** (oder pushe einen neuen Commit)

### 5. Testen

Nach dem Deploy:
1. Erstelle einen Test-Checkout (mit echter Kreditkarte)
2. Prüfe in Stripe Dashboard → **Payments** ob die Zahlung ankommt
3. Prüfe ob Webhook-Events ankommen: **Developers** → **Webhooks** → Dein Endpoint → **Events**

### ⚠️ WICHTIGE HINWEISE:

- **Test-Keys funktionieren NICHT im Live-Modus** - du musst die Live-Keys verwenden
- **Live-Zahlungen sind ECHT** - stelle sicher, dass alles funktioniert bevor du live gehst
- **Webhook-Endpunkt muss für Live-Modus neu erstellt werden**
- **Backup**: Speichere die Test-Keys falls du später zurück zum Testen willst

### Troubleshooting

**Problem: Zahlungen kommen nicht an**
- Prüfe ob du im Live-Modus bist (Toggle oben rechts im Stripe Dashboard)
- Prüfe ob die Live-Keys korrekt in Vercel gesetzt sind
- Prüfe Vercel-Logs für Fehler

**Problem: Webhook funktioniert nicht**
- Prüfe ob der Webhook-Endpunkt für Live-Modus erstellt wurde
- Prüfe ob `STRIPE_WEBHOOK_SECRET` auf den Live-Webhook-Secret gesetzt ist
- Prüfe Stripe Dashboard → Webhooks → Events ob Fehler auftreten

