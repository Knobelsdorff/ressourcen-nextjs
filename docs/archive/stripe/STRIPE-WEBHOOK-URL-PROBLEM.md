# Problem: Stripe sendet an falsche URL

## Symptom
- In Stripe ist `https://www.ressourcen.app/api/stripe-webhook` konfiguriert
- Aber Stripe sendet Events an `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
- Vercel-Logs zeigen: `Request URL: https://ressourcen-nextjs.vercel.app/api/stripe-webhook`

## Ursache
**Es gibt wahrscheinlich ZWEI aktive Endpoints in Stripe:**
1. `https://www.ressourcen.app/api/stripe-webhook` (korrekt)
2. `https://ressourcen-nextjs.vercel.app/api/stripe-webhook` (falsch, sollte deaktiviert werden)

Stripe sendet Events an **ALLE aktiven Endpoints**!

## Lösung

### Schritt 1: Alle Endpoints in Stripe prüfen

1. Gehe zu Stripe Dashboard → **Webhooks**
2. **Prüfe ALLE Endpoints** (nicht nur den ersten!)
3. Suche nach:
   - `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
   - `https://www.ressourcen.app/api/stripe-webhook`

### Schritt 2: Falschen Endpoint deaktivieren/löschen

**Option A: Deaktivieren (empfohlen für Tests)**
1. Klicke auf den Endpoint `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
2. Klicke auf **"Deaktivieren"** oder **"Disable"**
3. Status sollte jetzt "Inaktiv" sein

**Option B: Löschen (empfohlen für Production)**
1. Klicke auf den Endpoint `https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
2. Klicke auf **"Löschen"** oder **"Delete"**
3. Bestätige die Löschung

### Schritt 3: Korrekten Endpoint prüfen

1. Klicke auf `https://www.ressourcen.app/api/stripe-webhook`
2. Prüfe:
   - **Status:** Muss "Aktiv" sein
   - **URL:** Muss exakt `https://www.ressourcen.app/api/stripe-webhook` sein
   - **Ereignisse:** Muss `checkout.session.completed` enthalten

### Schritt 4: Webhook-Secret prüfen

1. Klicke auf `https://www.ressourcen.app/api/stripe-webhook`
2. Klicke auf **"Signing-Geheimnis anzeigen"**
3. Kopiere das Secret (beginnt mit `whsec_...`)
4. Prüfe in Vercel:
   - **Settings** → **Environment Variables**
   - `STRIPE_WEBHOOK_SECRET` muss exakt übereinstimmen
5. **WICHTIG:** Nach Änderung → **Redeploy**!

### Schritt 5: Test

1. Führe eine Testzahlung durch
2. Prüfe Vercel-Logs:
   - `Request URL` sollte jetzt `https://www.ressourcen.app/api/stripe-webhook` sein
   - Nicht mehr `ressourcen-nextjs.vercel.app`!

## Warum passiert das?

- Vercel erstellt automatisch Preview-Deployments für jeden Branch
- Diese haben URLs wie `ressourcen-nextjs.vercel.app`
- Wenn du früher einen Webhook für diese URL erstellt hast, existiert er noch
- Stripe sendet an **alle aktiven Endpoints**

## Prävention

- **Nur Production-URL verwenden:** `https://www.ressourcen.app/api/stripe-webhook`
- **Preview-Deployments ignorieren:** Keine Webhooks für Vercel-Preview-URLs erstellen
- **Regelmäßig prüfen:** Alle Endpoints in Stripe überprüfen und alte löschen

