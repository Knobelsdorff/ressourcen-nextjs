# Vercel Logs prüfen - Zahlungsmethoden Debugging

## Schritt 1: Vercel Dashboard öffnen

1. Gehe zu [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Wähle dein Projekt aus (wahrscheinlich `ressourcen-nextjs`)
3. Klicke auf **"Deployments"** im oberen Menü

## Schritt 2: Neuestes Deployment finden

1. Suche das **neueste Deployment** (oben in der Liste)
2. Prüfe den Status:
   - ✅ **Ready** (grün) = Deployment erfolgreich
   - ⏳ **Building** = Deployment läuft noch
   - ❌ **Error** = Deployment fehlgeschlagen

## Schritt 3: Logs öffnen

1. Klicke auf das **neueste Deployment**
2. Klicke auf den Tab **"Logs"** (neben "Overview", "Build Logs", etc.)
3. Die Logs werden jetzt angezeigt

## Schritt 4: Checkout-API Logs finden

### Was du suchen solltest:

**Bei Checkout-Erstellung:**
```
Checkout API: Creating subscription session {
  userId: '...',
  planType: 'subscription',
  priceId: 'price_...',
  source: 'environment',
  paymentMethodTypes: [ 'card', 'sepa_debit', 'paypal' ],
  mode: 'subscription'
}
```

**Nach erfolgreicher Session-Erstellung:**
```
Checkout API: Session created successfully {
  sessionId: 'cs_...',
  paymentMethodTypes: [ 'card', 'sepa_debit', 'paypal' ],
  url: 'https://checkout.stripe.com/...'
}
```

### Wichtige Informationen:

1. **`paymentMethodTypes`** - Zeigt, welche Zahlungsmethoden gesendet wurden
   - Sollte sein: `['card', 'sepa_debit', 'paypal']`
   - Falls nur `['card']`: Code-Problem oder Stripe-Filter

2. **`session.paymentMethodTypes`** - Zeigt, welche Stripe akzeptiert hat
   - Falls hier nur `['card']`: Stripe hat SEPA/PayPal gefiltert
   - Grund: Nicht im Dashboard aktiviert oder nicht verfügbar

## Schritt 5: Logs während Checkout-Test

### So testest du:

1. **Öffne die Logs** in einem Tab (Vercel Dashboard → Deployments → Logs)
2. **Öffne deine Website** in einem anderen Tab
3. **Starte einen Checkout-Flow:**
   - Gehe zum Dashboard
   - Klicke auf "Unbegrenzte Ressourcen erstellen" oder ähnlich
   - Warte, bis der Checkout startet
4. **Gehe zurück zu den Logs** und prüfe:
   - Siehst du `Checkout API: Creating subscription session`?
   - Siehst du `Checkout API: Session created successfully`?
   - Welche `paymentMethodTypes` werden angezeigt?

## Schritt 6: Logs interpretieren

### Szenario 1: Code sendet alle 3 Methoden, aber Stripe zeigt nur Card

**Log zeigt:**
```
paymentMethodTypes: [ 'card', 'sepa_debit', 'paypal' ]
session.paymentMethodTypes: [ 'card' ]
```

**Problem:** Stripe filtert SEPA und PayPal heraus
**Lösung:** 
- Prüfe Stripe Dashboard → Einstellungen → Zahlungen → Zahlungsmethoden
- Aktiviere SEPA Direct Debit und PayPal
- Prüfe regionale Verfügbarkeit

### Szenario 2: Code sendet nur Card

**Log zeigt:**
```
paymentMethodTypes: [ 'card' ]
```

**Problem:** Code-Problem oder Environment-Variable
**Lösung:**
- Prüfe ob die neueste Version deployed wurde
- Prüfe ob `src/app/api/checkout/route.ts` die richtigen Methoden enthält
- Redeploy falls nötig

### Szenario 3: Keine Logs vorhanden

**Problem:** Checkout-API wird nicht aufgerufen
**Lösung:**
- Prüfe Browser-Konsole für Fehler
- Prüfe ob `/api/checkout` erreichbar ist
- Prüfe ob User-ID vorhanden ist

## Schritt 7: Stripe Dashboard prüfen

Nachdem du die Logs geprüft hast:

1. Gehe zu [Stripe Dashboard](https://dashboard.stripe.com)
2. Gehe zu: **Einstellungen** → **Zahlungen** → **Zahlungsmethoden**
3. Prüfe, welche Methoden aktiviert sind:
   - ✅ Card (sollte aktiv sein)
   - ❓ SEPA Direct Debit (aktivieren falls nicht aktiv)
   - ❓ PayPal (aktivieren falls nicht aktiv)

## Schritt 8: Test nach Aktivierung

1. **Aktiviere alle Methoden** im Stripe Dashboard
2. **Warte 5-10 Minuten**
3. **Teste den Checkout erneut**
4. **Prüfe die Logs erneut:**
   - `session.paymentMethodTypes` sollte jetzt alle 3 Methoden enthalten

## Häufige Fehler in Logs

### Fehler 1: "Stripe not configured"
```
Checkout API error { message: 'Stripe not configured' }
```
**Lösung:** `STRIPE_SECRET_KEY` fehlt in Vercel Environment Variables

### Fehler 2: "No subscription price ID found"
```
Checkout API: No subscription price ID found
```
**Lösung:** `STRIPE_SUBSCRIPTION_PRICE_ID` fehlt in Vercel Environment Variables

### Fehler 3: "User ID is required"
```
Checkout API error { message: 'User ID is required' }
```
**Lösung:** User ist nicht eingeloggt oder Session abgelaufen

## Was du mir senden solltest:

Wenn du die Logs geprüft hast, kopiere mir:

1. **Die Log-Zeile mit `Checkout API: Creating subscription session`**
   - Zeige mir die `paymentMethodTypes`

2. **Die Log-Zeile mit `Checkout API: Session created successfully`**
   - Zeige mir die `session.paymentMethodTypes`

3. **Falls Fehler vorhanden:**
   - Kopiere die komplette Fehlermeldung

4. **Screenshot aus Stripe Dashboard:**
   - Einstellungen → Zahlungen → Zahlungsmethoden
   - Zeige welche Methoden aktiviert sind

## Nächste Schritte

Nach der Log-Prüfung:
1. ✅ Aktiviere fehlende Zahlungsmethoden im Stripe Dashboard
2. ✅ Redeploy falls Code-Problem gefunden wurde
3. ✅ Teste erneut nach 5-10 Minuten
4. ✅ Prüfe Logs erneut

