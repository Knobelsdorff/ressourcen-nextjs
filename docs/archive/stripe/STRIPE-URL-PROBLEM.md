# Problem: Stripe sendet an alte URL

## Symptom
- URL in Stripe wurde geändert zu `https://www.ressourcen.app/api/webhook/stripe`
- Aber Logs zeigen: `Request URL (internal): https://ressourcen-nextjs.vercel.app/api/stripe-webhook`
- Stripe sendet immer noch an die alte Route

## Mögliche Ursachen

### 1. Mehrere Endpoints in Stripe
Es gibt möglicherweise ZWEI Endpoints in Stripe:
- Alter Endpoint: `https://www.ressourcen.app/api/stripe-webhook` (noch aktiv)
- Neuer Endpoint: `https://www.ressourcen.app/api/webhook/stripe` (neu erstellt)

**Lösung:** Prüfe ALLE Endpoints in Stripe und deaktiviere/lösche den alten.

### 2. Änderung nicht gespeichert
Die URL-Änderung wurde möglicherweise nicht gespeichert.

**Lösung:** 
1. Gehe zu Stripe Dashboard → Webhooks
2. Prüfe ob die URL wirklich `https://www.ressourcen.app/api/webhook/stripe` ist
3. Falls nicht: Ändere erneut und speichere

### 3. Cache/Verzögerung
Stripe könnte die alte URL noch cached haben.

**Lösung:** Warte 1-2 Minuten und teste erneut.

## Lösung: Alle Endpoints prüfen

1. Gehe zu Stripe Dashboard → **Webhooks**
2. **Prüfe ALLE Endpoints** (nicht nur den ersten!)
3. Suche nach:
   - `https://www.ressourcen.app/api/stripe-webhook` (alter Endpoint - DEAKTIVIEREN/LÖSCHEN)
   - `https://www.ressourcen.app/api/webhook/stripe` (neuer Endpoint - sollte aktiv sein)
4. **Deaktiviere oder lösche** den alten Endpoint
5. **Aktiviere** den neuen Endpoint (falls nicht aktiv)

## Nach der Änderung

1. Warte 1-2 Minuten
2. Führe eine Testzahlung durch
3. Prüfe Vercel-Logs:
   - Sollte jetzt `[webhook/stripe]` zeigen (nicht `Stripe Webhook:`)
   - Request URL sollte `/api/webhook/stripe` sein

