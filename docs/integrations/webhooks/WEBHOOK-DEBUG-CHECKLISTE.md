# Webhook-Debug-Checkliste: Keine Events nach Zahlung

## ⚠️ WICHTIG: Es gibt ZWEI Webhook-Routen!

1. `/api/stripe-webhook` (alte Route mit viel Logging)
2. `/api/stripe/webhook` (neue Route)

**Stelle sicher, dass die URL in Stripe mit der Route übereinstimmt!**

---

## Schritt 1: Prüfe welche URL in Stripe konfiguriert ist

1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf deinen Endpoint
3. **Kopiere die exakte URL** (z.B. `https://www.ressourcen.app/api/stripe-webhook`)

**WICHTIG:** 
- Wenn URL `/api/stripe-webhook` → Route muss in `src/app/api/stripe-webhook/route.ts` sein
- Wenn URL `/api/stripe/webhook` → Route muss in `src/app/api/stripe/webhook/route.ts` sein

---

## Schritt 2: Prüfe ob Endpoint erreichbar ist

Öffne im Browser:
- `https://www.ressourcen.app/api/stripe-webhook` (falls diese URL in Stripe steht)
- ODER `https://www.ressourcen.app/api/stripe/webhook` (falls diese URL in Stripe steht)

**Erwartetes Ergebnis:**
```json
{"status":"ok","message":"Webhook endpoint is reachable","timestamp":"..."}
```

**Falls 404:** Endpoint existiert nicht → Route prüfen und redeployen

---

## Schritt 3: Prüfe Stripe Webhook-Logs

1. Stripe Dashboard → **Webhooks** → Dein Endpoint
2. Klicke auf **"Logbuch"** oder **"Events"**
3. Prüfe ob Events angezeigt werden

**Falls KEINE Events:**
- Stripe sendet nichts → Endpoint ist nicht aktiv oder URL ist falsch
- Prüfe ob Endpoint **"Aktiv"** ist (grüner Status)

**Falls Events vorhanden, aber mit Fehler:**
- Klicke auf das Event
- Prüfe **Status-Code** (sollte 200 sein)
- Prüfe **Antwort** (sollte `{"received": true}` sein)

---

## Schritt 4: Prüfe Vercel-Logs

1. Vercel Dashboard → **Deployments** → Neuestes Deployment
2. Klicke auf **"Logs"**
3. Suche nach: `[stripe/webhook]` oder `Stripe Webhook:`

**Erwartete Logs bei erfolgreichem Event:**
```
[stripe/webhook] Request received
[stripe/webhook] STRIPE EVENT RECEIVED checkout.session.completed
[stripe/webhook] HANDLING checkout.session.completed
[stripe/webhook] SESSION COMPLETED { sessionId: ..., userId: ..., ... }
[stripe/webhook] Creating access for user: ...
[stripe/webhook] Access created successfully for user ...
```

**Falls KEINE Logs:**
- Stripe sendet nichts an Vercel
- Prüfe Stripe Webhook-Konfiguration (Schritt 1)

**Falls Logs mit Fehler:**
- Kopiere die Fehlermeldung
- Häufig: "Signature verification failed" → Webhook-Secret stimmt nicht

---

## Schritt 5: Prüfe Webhook-Secret

1. Stripe Dashboard → **Webhooks** → Dein Endpoint
2. Klicke auf **"Signing-Geheimnis anzeigen"** oder **"Reveal signing secret"**
3. Kopiere das komplette Secret (beginnt mit `whsec_...`)

4. Vercel Dashboard → **Settings** → **Environment Variables**
5. Prüfe `STRIPE_WEBHOOK_SECRET`
6. **Vergleiche:** Stimmt das Secret überein?

**WICHTIG:**
- Secret muss EXAKT übereinstimmen (keine Leerzeichen, keine Zeilenumbrüche)
- Nach Änderung: **Redeploy** notwendig!

---

## Schritt 6: Test-Event manuell senden

1. Stripe Dashboard → **Webhooks** → Dein Endpoint
2. Klicke auf **"Testereignis senden"** oder **"Send test webhook"**
3. Wähle: `checkout.session.completed`
4. Klicke auf **"Ereignis senden"**

**Prüfe sofort:**
- Vercel-Logs: Erscheint `[stripe/webhook] Request received`?
- Stripe-Logs: Erscheint ein neues Event?

**Falls Test-Event funktioniert, aber echte Zahlung nicht:**
- Problem liegt in der Checkout-Session-Erstellung
- Prüfe ob `client_reference_id` oder `metadata.userId` gesetzt wird

---

## Schritt 7: Prüfe Checkout-Session-Erstellung

1. Öffne Browser-Konsole (F12)
2. Führe eine Testzahlung durch
3. Prüfe Logs:
   ```
   [createCheckoutSession] Calling /api/checkout with: ...
   checkout response { sessionId: ..., url: ... }
   ```

4. Prüfe ob `client_reference_id` und `metadata` in der Checkout-Session gesetzt werden:
   - Öffne `src/app/api/checkout/route.ts`
   - Prüfe ob `client_reference_id: userId` und `metadata: { userId, planType }` gesetzt werden

---

## Schritt 8: Häufige Probleme

### Problem: "Signature verification failed"
**Lösung:**
- Webhook-Secret in Vercel aktualisieren
- Redeploy
- Prüfe ob richtige Route verwendet wird

### Problem: "No userId found"
**Lösung:**
- Prüfe ob `client_reference_id` oder `metadata.userId` in Checkout-Session gesetzt wird
- Prüfe `src/app/api/checkout/route.ts`

### Problem: "Failed to create access"
**Lösung:**
- Prüfe ob RPC-Funktion `create_access_after_payment` in Supabase existiert
- Prüfe Supabase-Logs

### Problem: Keine Events in Stripe
**Lösung:**
- Endpoint ist nicht aktiv → Aktiviere in Stripe
- URL ist falsch → Prüfe und korrigiere
- Endpoint existiert nicht → Prüfe Route und redeploye

---

## Quick-Fix: Endpoint neu erstellen

Falls nichts funktioniert:

1. **Lösche alten Endpoint in Stripe**
2. **Erstelle neuen Endpoint:**
   - URL: `https://www.ressourcen.app/api/stripe-webhook` (ODER `/api/stripe/webhook`)
   - Ereignisse: `checkout.session.completed`
   - **WICHTIG:** Im richtigen Modus (Test/Live)!
3. **Kopiere neues Secret nach Vercel**
4. **Redeploy**
5. **Teste erneut**

---

## Debug-Commands

### Lokal testen (mit Stripe CLI):
```bash
stripe login
stripe trigger checkout.session.completed
```

### Endpoint-Erreichbarkeit prüfen:
```bash
curl https://www.ressourcen.app/api/stripe-webhook
# Sollte JSON zurückgeben, nicht 404
```
