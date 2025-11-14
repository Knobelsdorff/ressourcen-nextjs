# Stripe: Von Test-Modus zu Live-Modus wechseln

## Übersicht
Um echte Zahlungen zu ermöglichen, musst du von Stripe Test-Modus (Sandbox) zu Live-Modus wechseln.

## Schritt 1: Stripe Dashboard - Modus wechseln

### 1.1 Test-Modus erkennen
- Im Stripe Dashboard oben rechts siehst du einen Toggle: **"Test-Modus"** (grau/blau)
- Test-Keys beginnen mit `sk_test_` und `pk_test_`
- Live-Keys beginnen mit `sk_live_` und `pk_live_`

### 1.2 Zu Live-Modus wechseln
1. Gehe zu [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Klicke oben rechts auf den **Toggle "Test-Modus"**
3. Wähle **"Live-Modus"** aus
4. Stripe fragt nach Bestätigung → **"Zu Live-Modus wechseln"** bestätigen

## Schritt 2: Live API Keys holen

### 2.1 Secret Key (Backend)
1. Im Live-Modus: **"Entwickler"** → **"API-Schlüssel"**
2. Unter **"Geheimer Schlüssel"** → **"Schlüssel anzeigen"**
3. Kopiere den **Live Secret Key** (beginnt mit `sk_live_`)
4. **WICHTIG**: Niemals teilen oder committen!

### 2.2 Publishable Key (Frontend)
1. Unter **"Veröffentlichbarer Schlüssel"**
2. Kopiere den **Live Publishable Key** (beginnt mit `pk_live_`)
3. Kann öffentlich verwendet werden (sicher für Frontend)

## Schritt 3: Environment Variables aktualisieren

### 3.1 Lokale Entwicklung (.env.local)
```bash
# STRIPE KEYS - LIVE MODUS
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx

# STRIPE WEBHOOK SECRET - LIVE
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# STRIPE SUBSCRIPTION PRICE ID - LIVE
STRIPE_SUBSCRIPTION_PRICE_ID=price_xxxxxxxxxxxxx
```

### 3.2 Production (Vercel Environment Variables)
1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Wähle dein Projekt
3. **Settings** → **Environment Variables**
4. Aktualisiere:
   - `STRIPE_SECRET_KEY` → Live Secret Key
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Live Publishable Key
   - `STRIPE_WEBHOOK_SECRET` → Live Webhook Secret
   - `STRIPE_SUBSCRIPTION_PRICE_ID` → Live Price ID

## Schritt 4: Live Price ID holen

### 4.1 Produkt und Preis erstellen (falls noch nicht vorhanden)
1. Im **Live-Modus**: **"Produkte"** → **"Produkt hinzufügen"**
2. Name: "Ressourcen-App: Monatliches Abo"
3. Preis: 39€ / Monat
4. Abrechnungsintervall: Monatlich
5. **"Erstellen"** klicken
6. Kopiere die **Price ID** (beginnt mit `price_`)

### 4.2 Price ID in Environment Variables setzen
```bash
STRIPE_SUBSCRIPTION_PRICE_ID=price_xxxxxxxxxxxxx
```

## Schritt 5: Live Webhook Endpoint erstellen

### 5.1 Webhook Endpoint in Stripe erstellen
1. Im **Live-Modus**: **"Entwickler"** → **"Webhooks"**
2. **"Endpoint hinzufügen"** klicken
3. Endpoint URL: `https://deine-domain.com/api/stripe/webhook`
   - Beispiel: `https://ressourcen-app.vercel.app/api/stripe/webhook`
4. Ereignisse auswählen:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.paused`
   - ✅ `customer.subscription.resumed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. **"Endpoint hinzufügen"** klicken

### 5.2 Webhook Secret kopieren
1. Nach dem Erstellen: Klicke auf den neuen Webhook
2. Unter **"Signing secret"** → **"Anzeigen"**
3. Kopiere den Secret (beginnt mit `whsec_`)
4. In Environment Variables setzen: `STRIPE_WEBHOOK_SECRET`

## Schritt 6: Customer Portal für Live-Modus konfigurieren

### 6.1 Portal aktivieren
1. Im **Live-Modus**: **"Einstellungen"** → **"Abonnements"** → **"Kundenportal"**
2. **"Kundenportal aktivieren"** (falls noch nicht aktiviert)
3. Gleiche Einstellungen wie im Test-Modus:
   - ✅ Abonnements verwalten
   - ✅ Zahlungsmethoden verwalten
   - ✅ Rechnungsverlauf anzeigen
   - ✅ Kündigungsoptionen aktivieren
4. **"Speichern"**

## Schritt 7: Testen im Live-Modus

### 7.1 Vorsicht!
- **Live-Modus = Echte Zahlungen!**
- Teste nur mit kleinen Beträgen oder eigenen Karten
- Verwende echte Kreditkarten (keine Test-Karten wie `4242 4242 4242 4242`)

### 7.2 Test-Ablauf
1. Stelle sicher, dass alle Environment Variables auf Live-Keys gesetzt sind
2. Deploy auf Production (Vercel)
3. Teste mit einer echten Kreditkarte (kleiner Betrag)
4. Prüfe ob Webhook ankommt
5. Prüfe ob Abo in Supabase erstellt wird

## Schritt 8: Checkliste vor Go-Live

### Environment Variables
- [ ] `STRIPE_SECRET_KEY` → Live Secret Key (`sk_live_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Live Publishable Key (`pk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` → Live Webhook Secret (`whsec_...`)
- [ ] `STRIPE_SUBSCRIPTION_PRICE_ID` → Live Price ID (`price_...`)

### Stripe Konfiguration
- [ ] Live-Modus aktiviert
- [ ] Produkt und Preis erstellt (39€/Monat)
- [ ] Webhook Endpoint erstellt (Production URL)
- [ ] Alle Webhook-Events aktiviert
- [ ] Customer Portal aktiviert (Live-Modus)

### Code
- [ ] Alle Environment Variables in Vercel gesetzt
- [ ] Code deployed auf Production
- [ ] Webhook URL ist korrekt (Production Domain)

### Testing
- [ ] Test-Zahlung mit echter Karte erfolgreich
- [ ] Webhook wird empfangen
- [ ] Abo wird in Supabase erstellt
- [ ] Customer Portal funktioniert

## Wichtige Sicherheitshinweise

### ⚠️ NIEMALS:
- Live Secret Keys committen (Git)
- Live Secret Keys teilen
- Live Secret Keys in Client-Side Code verwenden
- Test-Keys in Production verwenden

### ✅ IMMER:
- Secret Keys nur in Environment Variables speichern
- `.env.local` in `.gitignore` haben
- Separate Keys für Test und Live verwenden
- Webhook Secrets für Test und Live getrennt halten

## Unterschiede: Test vs. Live

| Feature | Test-Modus | Live-Modus |
|---------|-----------|------------|
| API Keys | `sk_test_...` / `pk_test_...` | `sk_live_...` / `pk_live_...` |
| Zahlungen | Fake (Test-Karten) | Echt (echte Karten) |
| Webhooks | Test-Endpoint | Production-Endpoint |
| Customer Portal | Test-Konfiguration | Live-Konfiguration |
| Preise | Test-Preise | Live-Preise |

## Troubleshooting

### Problem: "Invalid API Key"
- **Lösung**: Prüfe ob Live-Keys verwendet werden (nicht Test-Keys)
- **Lösung**: Prüfe ob Keys korrekt kopiert wurden (keine Leerzeichen)

### Problem: Webhook funktioniert nicht
- **Lösung**: Prüfe ob Live Webhook Endpoint erstellt wurde
- **Lösung**: Prüfe ob Webhook Secret korrekt ist (Live, nicht Test)
- **Lösung**: Prüfe ob URL korrekt ist (Production Domain)

### Problem: Zahlung funktioniert nicht
- **Lösung**: Prüfe ob Live Publishable Key im Frontend verwendet wird
- **Lösung**: Prüfe ob Live Price ID korrekt ist
- **Lösung**: Prüfe Browser-Konsole auf Fehler

## Nächste Schritte nach Go-Live

1. ✅ Monitoring einrichten (Stripe Dashboard)
2. ✅ E-Mail-Benachrichtigungen aktivieren
3. ✅ Rechnungen automatisch versenden lassen
4. ✅ Support-Prozess für Zahlungsprobleme definieren

