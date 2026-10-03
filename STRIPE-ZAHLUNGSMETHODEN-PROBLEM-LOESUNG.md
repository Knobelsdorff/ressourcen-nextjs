# Zahlungsmethoden Problem - Lösung

## ✅ Status: Code funktioniert korrekt!

Die Logs zeigen:
- ✅ Code sendet: `['card', 'sepa_debit', 'paypal']`
- ✅ Stripe akzeptiert: `['card', 'sepa_debit', 'paypal']`

**ABER:** Im Checkout werden nur Kreditkarten angezeigt.

## Problem: Stripe Dashboard-Konfiguration

Stripe filtert Zahlungsmethoden heraus, wenn:
1. Sie nicht im Dashboard aktiviert sind
2. Sie für deine Region/Währung nicht verfügbar sind
3. Dein Account nicht vollständig verifiziert ist
4. Sie für Subscriptions nicht aktiviert sind

## Lösung: Zahlungsmethoden im Stripe Dashboard aktivieren

### Schritt 1: Stripe Dashboard öffnen

1. Gehe zu [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **WICHTIG:** Stelle sicher, dass du im **Live-Modus** bist (oben rechts)
3. Gehe zu: **Einstellungen** (⚙️) → **Zahlungen** (Payments)

### Schritt 2: Zahlungsmethoden aktivieren

1. Scrolle zu **"Zahlungsmethoden"** (Payment methods)
2. Du siehst eine Liste aller verfügbaren Methoden

**Aktiviere folgende Methoden:**

#### ✅ Kreditkarten (Card)
- Sollte bereits aktiviert sein
- Falls nicht: Klicke auf "Aktivieren"

#### ✅ SEPA Direct Debit
- Suche nach "SEPA Direct Debit" oder "SEPA Lastschrift"
- Klicke auf "Aktivieren"
- **Wichtig:** 
  - SEPA funktioniert nur für EUR-Währung ✅ (du verwendest EUR)
  - Benötigt manchmal eine Bankverbindung in deinem Stripe-Konto
  - Für Subscriptions muss es explizit aktiviert sein

#### ✅ PayPal
- Suche nach "PayPal"
- Klicke auf "Aktivieren" oder "Verbinden"
- **Wichtig:**
  - PayPal muss mit deinem PayPal-Konto verbunden sein
  - Kann 10-15 Minuten dauern, bis es aktiv ist
  - Für Subscriptions muss es aktiviert sein

### Schritt 3: Subscriptions-spezifische Einstellungen prüfen

1. Gehe zu: **Einstellungen** → **Zahlungen** → **Zahlungsmethoden**
2. Für jede Methode (SEPA, PayPal):
   - Prüfe, ob sie für **"Subscriptions"** aktiviert ist
   - Falls nicht: Aktiviere es explizit für Subscriptions

### Schritt 4: Account-Verifizierung prüfen

Manche Zahlungsmethoden benötigen einen vollständig verifizierten Account:

1. Gehe zu: **Einstellungen** → **Account**
2. Prüfe, ob alle erforderlichen Informationen ausgefüllt sind:
   - Geschäftsinformationen
   - Bankverbindung
   - Steuerinformationen (falls erforderlich)

### Schritt 5: Regionale Verfügbarkeit prüfen

**SEPA Direct Debit:**
- ✅ Verfügbar in: Deutschland, Österreich, Schweiz, alle EU-Länder
- ✅ Funktioniert mit EUR-Währung
- ❌ Nicht verfügbar außerhalb SEPA-Zone

**PayPal:**
- ✅ Verfügbar in: Deutschland, Österreich, Schweiz
- ✅ Funktioniert mit EUR-Währung
- ⚠️ Kann in manchen Ländern eingeschränkt sein

### Schritt 6: Wartezeit

Nach der Aktivierung:
- **Card:** Sofort verfügbar
- **SEPA:** 5-10 Minuten
- **PayPal:** 10-15 Minuten (kann länger dauern)

### Schritt 7: Test erneut

1. **Warte 10-15 Minuten** nach der Aktivierung
2. **Starte einen neuen Checkout-Flow**
3. **Prüfe, ob alle 3 Methoden angezeigt werden**

## Troubleshooting

### Problem: SEPA wird immer noch nicht angezeigt

**Mögliche Ursachen:**
1. SEPA nicht für Subscriptions aktiviert
2. Keine Bankverbindung in Stripe-Konto hinzugefügt
3. Account nicht vollständig verifiziert

**Lösung:**
1. Prüfe: Einstellungen → Bankverbindungen → Ist eine Bankverbindung hinzugefügt?
2. Prüfe: Einstellungen → Zahlungen → Zahlungsmethoden → SEPA → Ist "Subscriptions" aktiviert?
3. Prüfe: Einstellungen → Account → Sind alle Informationen ausgefüllt?

### Problem: PayPal wird immer noch nicht angezeigt

**Mögliche Ursachen:**
1. PayPal nicht mit Stripe-Konto verbunden
2. PayPal nicht für Subscriptions aktiviert
3. Regionale Einschränkungen

**Lösung:**
1. Prüfe: Einstellungen → Zahlungen → PayPal → Ist PayPal verbunden?
2. Prüfe: Ist PayPal für Subscriptions aktiviert?
3. Warte weitere 10-15 Minuten

### Problem: Nur Card wird angezeigt (trotz Aktivierung)

**Mögliche Ursachen:**
1. Stripe-Cache (kann bis zu 30 Minuten dauern)
2. Account-Verifizierung fehlt
3. Regionale Einschränkungen

**Lösung:**
1. Warte weitere 15-30 Minuten
2. Prüfe Account-Verifizierung
3. Kontaktiere Stripe Support, falls Problem weiterhin besteht

## Stripe Support kontaktieren

Falls die Methoden nach der Aktivierung immer noch nicht angezeigt werden:

1. Gehe zu: [Stripe Support](https://support.stripe.com)
2. Erkläre das Problem:
   - Code sendet alle 3 Methoden ✅
   - Stripe akzeptiert alle 3 Methoden ✅
   - Aber im Checkout werden nur Card angezeigt ❌
3. Frage nach:
   - Warum werden SEPA und PayPal nicht angezeigt?
   - Gibt es Account-Einschränkungen?
   - Ist eine zusätzliche Verifizierung erforderlich?

## Nächste Schritte

1. ✅ Aktiviere SEPA Direct Debit im Stripe Dashboard
2. ✅ Aktiviere PayPal im Stripe Dashboard
3. ✅ Prüfe, ob beide für Subscriptions aktiviert sind
4. ✅ Warte 10-15 Minuten
5. ✅ Teste den Checkout erneut
6. ✅ Falls Problem weiterhin besteht: Kontaktiere Stripe Support

## Zusammenfassung

- ✅ Code ist korrekt
- ✅ Stripe akzeptiert alle Methoden
- ⚠️ Problem: Dashboard-Konfiguration
- 🔧 Lösung: Methoden im Dashboard aktivieren

