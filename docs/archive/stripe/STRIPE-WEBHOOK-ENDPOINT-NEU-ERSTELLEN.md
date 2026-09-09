# Stripe Webhook Endpoint neu erstellen

## Problem
Stripe sendet immer noch an die alte URL (`/api/stripe-webhook`), obwohl die URL in Stripe auf `/api/webhook/stripe` geändert wurde.

## Lösung: Endpoint löschen und neu erstellen

### Schritt 1: Alten Endpoint löschen
1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf den Endpoint mit der URL `https://www.ressourcen.app/api/stripe-webhook` (oder `/api/webhook/stripe`)
3. Scrolle nach unten
4. Klicke auf **"Endpoint löschen"** oder **"Delete endpoint"**
5. Bestätige die Löschung

### Schritt 2: Neuen Endpoint erstellen
1. In Stripe Dashboard → **Webhooks**
2. Klicke auf **"+ Endpoint hinzufügen"** oder **"+ Add endpoint"**
3. **Endpoint-URL eingeben:**
   ```
   https://www.ressourcen.app/api/webhook/stripe
   ```
4. **Ereignisse auswählen:**
   - `checkout.session.completed` ✓
   - (Optional: `customer.subscription.updated`, `customer.subscription.deleted`)
5. Klicke auf **"Endpoint hinzufügen"** oder **"Add endpoint"**

### Schritt 3: Webhook-Secret kopieren
1. Nach dem Erstellen: Klicke auf den neuen Endpoint
2. Klicke auf **"Signing-Geheimnis anzeigen"** oder **"Reveal signing secret"**
3. Kopiere das Secret (beginnt mit `whsec_...`)
4. Gehe zu Vercel Dashboard → **Settings** → **Environment Variables**
5. Aktualisiere `STRIPE_WEBHOOK_SECRET` mit dem neuen Secret
6. **WICHTIG:** Prüfe, dass keine Leerzeichen oder Zeilenumbrüche vorhanden sind
7. Redeploy

### Schritt 4: Testen
1. Führe eine Testzahlung durch
2. Prüfe Vercel-Logs nach `[webhook/stripe] ✅ Request received at NEW route`
3. Prüfe Stripe Dashboard → Webhooks → Events (sollte jetzt Events anzeigen)

## Warum neu erstellen?
Stripe cached manchmal die alte URL. Durch das Löschen und Neu-Erstellen wird sichergestellt, dass Stripe die neue URL verwendet.

