# Zahlungsmethoden werden nicht angezeigt - Erweiterte Lösung

## ✅ Status

- ✅ Code sendet alle 3 Methoden: `['card', 'sepa_debit', 'paypal']`
- ✅ Stripe akzeptiert alle 3 Methoden: `paymentMethodTypes: [ 'card', 'sepa_debit', 'paypal' ]`
- ✅ Dashboard zeigt Methoden als aktiviert

**ABER:** Im Checkout werden nur Kreditkarten angezeigt.

## Mögliche Ursachen

### 1. Automatische Zahlungsmethoden-Filterung

Stripe filtert Zahlungsmethoden automatisch basierend auf:
- IP-Adresse des Browsers
- Browser-Sprache
- Regionale Verfügbarkeit
- Account-Verifizierungsstatus

**Lösung:** Code wurde aktualisiert, um `automatic_payment_methods` zu deaktivieren.

### 2. Regionale/IP-basierte Filterung

Stripe zeigt Zahlungsmethoden nur an, wenn:
- Der Browser-Standort in einem unterstützten Land ist
- Die IP-Adresse aus einem unterstützten Land kommt

**Test:** Versuche den Checkout von einem anderen Standort/IP-Adresse.

### 3. Account-Verifizierung

Manche Zahlungsmethoden benötigen einen vollständig verifizierten Account:
- Bankverbindung hinzugefügt
- Geschäftsinformationen ausgefüllt
- Steuerinformationen (falls erforderlich)

**Prüfe:** Stripe Dashboard → Einstellungen → Account → Ist alles ausgefüllt?

### 4. Währungskompatibilität

- SEPA: Funktioniert nur mit EUR ✅ (du verwendest EUR)
- PayPal: Funktioniert mit EUR ✅
- Card: Funktioniert mit allen Währungen ✅

**Status:** Währung sollte kein Problem sein.

### 5. Subscriptions-spezifische Einstellungen

Manche Zahlungsmethoden müssen explizit für Subscriptions aktiviert sein.

**Prüfe:** Stripe Dashboard → Einstellungen → Zahlungen → Zahlungsmethoden → Für jede Methode prüfen, ob "Subscriptions" aktiviert ist.

## Code-Änderungen

Ich habe den Code aktualisiert, um `automatic_payment_methods` zu deaktivieren:

```typescript
automatic_payment_methods: {
  enabled: false,
},
```

Dies sollte Stripe daran hindern, die Zahlungsmethoden automatisch zu filtern.

## Nächste Schritte

### Schritt 1: Code deployen

1. Committe die Änderungen:
   ```bash
   git add src/app/api/checkout/route.ts
   git commit -m "Disable automatic payment methods to force explicit methods"
   git push
   ```

2. Warte auf Vercel-Deployment (2-3 Minuten)

### Schritt 2: Test erneut

1. Starte einen neuen Checkout-Flow
2. Prüfe, ob alle 3 Methoden angezeigt werden

### Schritt 3: Falls immer noch nicht angezeigt

**Option A: Stripe Dashboard prüfen**

1. Gehe zu: Stripe Dashboard → Einstellungen → Zahlungen → Zahlungsmethoden
2. Für SEPA und PayPal:
   - Klicke auf die Methode
   - Prüfe, ob es eine Option "Für Subscriptions aktivieren" gibt
   - Aktiviere sie explizit für Subscriptions

**Option B: Stripe Support kontaktieren**

1. Gehe zu: [Stripe Support](https://support.stripe.com)
2. Erkläre das Problem:
   - Code sendet: `['card', 'sepa_debit', 'paypal']` ✅
   - Stripe akzeptiert: `['card', 'sepa_debit', 'paypal']` ✅
   - Dashboard zeigt Methoden als aktiviert ✅
   - Aber im Checkout werden nur Card angezeigt ❌
3. Frage nach:
   - Warum werden SEPA und PayPal nicht angezeigt?
   - Gibt es regionale/IP-basierte Filterung?
   - Ist eine zusätzliche Verifizierung erforderlich?
   - Gibt es eine Einstellung, die die Filterung deaktiviert?

**Option C: Test mit verschiedenen Browsern/IPs**

1. Teste mit verschiedenen Browsern
2. Teste mit VPN (verschiedene Länder)
3. Prüfe, ob die Methoden dann angezeigt werden

## Debugging

### Prüfe die Session-Details

Nach dem Erstellen einer Checkout-Session, prüfe in Stripe Dashboard:

1. Gehe zu: Stripe Dashboard → Zahlungen → Checkout-Sessions
2. Öffne die neueste Session
3. Prüfe:
   - **Payment methods**: Welche Methoden sind hier aufgelistet?
   - **Payment method types**: Stimmt das mit unseren Logs überein?

### Prüfe die Logs erneut

Nach dem Deployment, prüfe die Vercel-Logs:

```
Checkout API: Session created successfully {
  sessionId: 'cs_...',
  paymentMethodTypes: [ 'card', 'sepa_debit', 'paypal' ],
  url: 'https://checkout.stripe.com/...'
}
```

Falls `session.paymentMethodTypes` nur `['card']` zeigt, filtert Stripe die Methoden heraus.

## Häufige Probleme

### Problem: SEPA wird nicht angezeigt

**Mögliche Ursachen:**
1. Browser-IP kommt nicht aus einem SEPA-Land
2. Account nicht vollständig verifiziert
3. Keine Bankverbindung in Stripe-Konto

**Lösung:**
- Prüfe Account-Verifizierung
- Füge Bankverbindung hinzu
- Teste mit VPN aus Deutschland/Österreich/Schweiz

### Problem: PayPal wird nicht angezeigt

**Mögliche Ursachen:**
1. PayPal nicht mit Stripe-Konto verbunden
2. Browser-IP kommt nicht aus einem unterstützten Land
3. PayPal nicht für Subscriptions aktiviert

**Lösung:**
- Prüfe PayPal-Verbindung im Dashboard
- Prüfe, ob PayPal für Subscriptions aktiviert ist
- Teste mit VPN aus Deutschland/Österreich/Schweiz

## Zusammenfassung

- ✅ Code ist korrekt
- ✅ Stripe akzeptiert alle Methoden
- ✅ Dashboard zeigt Methoden als aktiviert
- ⚠️ Problem: Stripe filtert Methoden im Frontend-Checkout
- 🔧 Lösung: `automatic_payment_methods` deaktiviert + Stripe Support kontaktieren

## Wichtiger Hinweis

Wenn die Methoden nach allen Schritten immer noch nicht angezeigt werden, liegt das Problem wahrscheinlich bei Stripe's automatischer Filterung basierend auf IP-Adresse oder Account-Verifizierung. In diesem Fall sollte Stripe Support kontaktiert werden, da dies eine Account-spezifische Einstellung sein könnte.

