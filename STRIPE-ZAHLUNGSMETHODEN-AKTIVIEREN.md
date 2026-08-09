# Stripe Zahlungsmethoden aktivieren - Schritt für Schritt

## Problem
Im Stripe Checkout werden nur Kreditkarten angezeigt, obwohl Card, SEPA und PayPal im Code konfiguriert sind.

## Lösung: Zahlungsmethoden im Stripe Dashboard aktivieren

### Schritt 1: Stripe Dashboard öffnen
1. Gehe zu [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Stelle sicher, dass du im **Live-Modus** bist (oben rechts: Toggle "Test-Modus" → "Live-Modus")
3. Falls du noch im Test-Modus bist: Wechsle zu Live-Modus

### Schritt 2: Zahlungsmethoden aktivieren

#### 2.1 Navigiere zu den Einstellungen
1. Klicke auf das **Zahnrad-Symbol** (⚙️) oben rechts
2. Oder gehe zu: **Einstellungen** → **Zahlungen** (Settings → Payments)

#### 2.2 Zahlungsmethoden aktivieren
1. Scrolle zu **"Zahlungsmethoden"** (Payment methods)
2. Du siehst eine Liste aller verfügbaren Zahlungsmethoden

**WICHTIG: Aktiviere folgende Methoden:**

✅ **Kreditkarten** (Card)
   - Sollte bereits aktiviert sein
   - Falls nicht: Klicke auf "Aktivieren"

✅ **SEPA Direct Debit**
   - Suche nach "SEPA Direct Debit" oder "SEPA Lastschrift"
   - Klicke auf "Aktivieren"
   - **Wichtig für Subscriptions**: SEPA funktioniert perfekt für wiederkehrende Zahlungen

✅ **PayPal**
   - Suche nach "PayPal"
   - Klicke auf "Aktivieren"
   - **Hinweis**: PayPal muss separat aktiviert werden und kann einige Minuten dauern

### Schritt 3: SEPA Direct Debit Setup (falls erforderlich)

Wenn SEPA noch nicht aktiviert ist, musst du möglicherweise:

1. **Bankverbindung hinzufügen:**
   - Gehe zu **Einstellungen** → **Bankverbindungen** (Settings → Bank accounts)
   - Füge deine Bankverbindung hinzu
   - Stripe benötigt dies für SEPA-Zahlungen

2. **SEPA-Mandat konfigurieren:**
   - Stripe erstellt automatisch SEPA-Mandate für Kunden
   - Diese werden beim ersten SEPA-Checkout erstellt

### Schritt 4: PayPal Setup (falls erforderlich)

Wenn PayPal noch nicht aktiviert ist:

1. **PayPal-Konto verbinden:**
   - Gehe zu **Einstellungen** → **Zahlungen** → **PayPal**
   - Klicke auf "PayPal verbinden" oder "Connect PayPal"
   - Folge den Anweisungen, um dein PayPal-Konto zu verbinden

2. **PayPal für Subscriptions aktivieren:**
   - Stelle sicher, dass PayPal für wiederkehrende Zahlungen aktiviert ist
   - Dies ist wichtig für monatliche Abos

### Schritt 5: Verfügbarkeit prüfen

Nach der Aktivierung:

1. **Warte 5-10 Minuten** (PayPal kann etwas länger dauern)
2. **Teste den Checkout:**
   - Gehe zu deiner Website
   - Starte einen Checkout-Flow
   - Prüfe, ob alle drei Zahlungsmethoden angezeigt werden:
     - 💳 Kredit-/Debitkarte
     - 🏦 SEPA Direct Debit
     - 💰 PayPal

### Schritt 6: Regionale Verfügbarkeit prüfen

**Wichtig:** Nicht alle Zahlungsmethoden sind in allen Ländern verfügbar:

- **SEPA Direct Debit**: Nur für SEPA-Länder (EU + einige andere)
- **PayPal**: Verfügbar in den meisten Ländern, aber nicht überall
- **Card**: Universell verfügbar

Wenn eine Zahlungsmethode nicht angezeigt wird:
- Prüfe, ob sie für dein Land verfügbar ist
- Prüfe, ob sie für deine Währung (EUR) aktiviert ist

## Troubleshooting

### Problem: SEPA wird nicht angezeigt
**Lösung:**
1. Prüfe, ob SEPA im Stripe Dashboard aktiviert ist
2. Prüfe, ob dein Stripe-Konto vollständig verifiziert ist
3. Prüfe, ob du eine Bankverbindung hinzugefügt hast
4. SEPA funktioniert nur für EUR-Währung

### Problem: PayPal wird nicht angezeigt
**Lösung:**
1. Prüfe, ob PayPal im Stripe Dashboard aktiviert ist
2. Prüfe, ob PayPal mit deinem Stripe-Konto verbunden ist
3. Warte 10-15 Minuten nach der Aktivierung
4. Prüfe, ob PayPal für deine Region verfügbar ist

### Problem: Nur Kreditkarte wird angezeigt
**Lösung:**
1. Prüfe die Vercel Logs: `Checkout API: Session created successfully`
2. Prüfe, welche `paymentMethodTypes` im Log stehen
3. Stelle sicher, dass alle Methoden im Stripe Dashboard aktiviert sind
4. Prüfe, ob du im Live-Modus bist (nicht Test-Modus)

## Code-Verifikation

Der Code sendet bereits die richtigen `payment_method_types`:

```typescript
payment_method_types: [
  'card',
  'sepa_debit',
  'paypal',
]
```

Wenn die Methoden im Stripe Dashboard aktiviert sind, sollten sie im Checkout erscheinen.

## Nächste Schritte

1. ✅ Aktiviere alle drei Zahlungsmethoden im Stripe Dashboard
2. ✅ Warte 5-10 Minuten
3. ✅ Teste den Checkout-Flow auf der Live-Website
4. ✅ Prüfe die Vercel Logs für Debugging-Informationen

## Support

Falls die Zahlungsmethoden nach der Aktivierung immer noch nicht angezeigt werden:
- Prüfe die Vercel Logs für Fehlermeldungen
- Kontaktiere Stripe Support für regionale Verfügbarkeit
- Prüfe die Stripe Dashboard-Logs für weitere Informationen

