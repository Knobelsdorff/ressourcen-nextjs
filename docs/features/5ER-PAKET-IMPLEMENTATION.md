# 5er-Paket Implementation - Dokumentation

## Übersicht

Das 5er-Paket-System wurde implementiert: 
- **Preis:** 50€ einmalig
- **Inhalt:** 4 weitere Ressourcen (insgesamt 5 mit der ersten kostenlosen)
- **Zeitlimit:** Keines - dauerhafter Zugang
- **Erste Ressource:** 3 Tage kostenlos (Trial)

## Implementierte Änderungen

### 1. Datenbank-Migration (`supabase-5er-paket-migration.sql`)

- `create_access_after_payment`: Unterstützt jetzt `plan_type = '5-pack'` mit `resources_limit = 4` (4 weitere Ressourcen nach der ersten kostenlosen) und `access_expires_at = NULL` (kein Zeitlimit)
- `can_create_resource`: Prüft ob User noch Ressourcen erstellen kann (1. gratis, ab 2. benötigt Paket)
- `has_active_access`: Unterstützt Zugänge ohne Zeitlimit (NULL)

### 2. Paywall-Komponente (`src/components/Paywall.tsx`)

- Vereinfacht auf nur ein 5er-Paket für 50€
- Entfernt: Standard/Premium Auswahl
- Neue UI: Zentriertes 5er-Paket mit klaren Vorteilen

### 3. Checkout-API (`src/app/api/checkout/route.ts`)

- `PLAN_CONFIG` aktualisiert: `'5-pack'` mit Preis 5000 Cent (50€)
- Legacy-Pläne (`standard`, `premium`) als Fallback auf 5er-Paket

### 4. Webhook-Handler

- `src/app/api/webhook/stripe/route.ts`: Default `planType = '5-pack'`
- `src/app/api/stripe/webhook/route.ts`: Default `planType = '5-pack'`
- `src/app/api/stripe-webhook/route.ts`: Default `planType = '5-pack'`

### 5. Access-Logik (`src/lib/access.ts`)

- `createCheckoutSession`: Unterstützt `planType = '5-pack'`
- `canCreateResource`: Bereits korrekt implementiert (1. gratis, ab 2. Paket)
- `canAccessResource`: Unterstützt 3-Tage-Trial für erste Ressource

## Flow

### 1. Erste Ressource (Trial)
- User erstellt erste Ressource → **Kostenlos**
- Audio kann **3 Tage lang** kostenlos abgespielt werden
- Nach 3 Tagen → Paywall erscheint

### 2. Paywall
- Nach 3 Tagen oder bei 2. Ressource → Paywall erscheint
- User sieht: "5er-Paket für 50€"
- Klickt auf "5er-Paket für 50€ kaufen"

### 3. Zahlung
- Stripe Checkout öffnet sich
- User zahlt 50€
- Webhook erstellt Zugang: `resources_limit = 4` (4 weitere Ressourcen), `access_expires_at = NULL`

### 4. Nach Zahlung (Erstes Paket)
- User kann **4 weitere Ressourcen** erstellen (insgesamt 5: 1 gratis + 4 bezahlt)
- **Kein Zeitlimit** - User kann Ressourcen wann immer er will erstellen
- Nach 5 Ressourcen insgesamt → Paywall erscheint wieder für neues Paket

### 5. Zweites Paket
- User hat bereits 5 Ressourcen (1 gratis + 4 bezahlt)
- Kauft zweites 5er-Paket → **5 Ressourcen** müssen bezahlt werden (keine gratis Ressource mehr)
- User kann **5 weitere Ressourcen** erstellen (insgesamt 10: 1 gratis + 4 vom ersten Paket + 5 vom zweiten Paket)

## SQL-Migration ausführen

**WICHTIG:** Führe die SQL-Migration in Supabase aus:

```sql
-- Führe aus: supabase-5er-paket-migration.sql
-- In Supabase Dashboard → SQL Editor
```

Die Migration aktualisiert:
- `create_access_after_payment` Funktion
- `can_create_resource` Funktion
- `has_active_access` Funktion

## Testing

### Test-Szenario 1: Erste Ressource (Trial)
1. Neuer User registriert sich
2. Erstellt erste Ressource → ✅ Erfolgreich
3. Spielt Audio ab → ✅ Erfolgreich (3 Tage)
4. Nach 3 Tagen → Paywall erscheint

### Test-Szenario 2: 5er-Paket kaufen
1. User klickt auf Paywall → "5er-Paket für 50€ kaufen"
2. Stripe Checkout öffnet sich
3. Zahlung mit Test-Karte: `4242 4242 4242 4242`
4. Nach Zahlung → Zurück zum Dashboard
5. User kann jetzt 4 weitere Ressourcen erstellen (insgesamt 5 mit der ersten kostenlosen)

### Test-Szenario 3: Zweites Paket
1. User hat bereits 5 Ressourcen (1 gratis + 4 bezahlt)
2. Versucht 6. Ressource zu erstellen → Paywall erscheint
3. Kauft zweites 5er-Paket → kann jetzt 5 weitere Ressourcen erstellen
4. Insgesamt: 10 Ressourcen (1 gratis + 4 vom ersten Paket + 5 vom zweiten Paket)

## Wichtige Hinweise

1. **Erste Ressource ist immer gratis** - auch ohne Paket (nur beim ersten Paket)
2. **3-Tage-Trial** gilt nur für Audio-Abspielung der ersten Ressource
3. **Ab 2. Ressource** benötigt User das 5er-Paket
4. **Kein Zeitlimit** - User kann Ressourcen wann immer er will erstellen
5. **Nach 5 Ressourcen** muss User neues Paket kaufen
6. **Zweites+ Paket**: Keine gratis Ressource mehr - alle 4 Ressourcen müssen bezahlt werden

## Stripe Setup

Stelle sicher, dass Stripe korrekt konfiguriert ist:
- `STRIPE_SECRET_KEY` in `.env.local`
- `STRIPE_WEBHOOK_SECRET` in `.env.local`
- Webhook-Endpoint: `/api/webhook/stripe` oder `/api/stripe/webhook`

## Troubleshooting

### Problem: Paywall erscheint nicht
- Prüfe: `NEXT_PUBLIC_PAYWALL_ENABLED` Feature Flag
- Prüfe: SQL-Migration wurde ausgeführt

### Problem: User kann nach Zahlung keine Ressourcen erstellen
- Prüfe: Webhook wurde korrekt verarbeitet
- Prüfe: `user_access` Tabelle hat Eintrag mit `resources_limit = 4` (4 weitere Ressourcen)
- Prüfe: `resources_created < resources_limit`

### Problem: Zeitlimit wird trotzdem angezeigt
- Prüfe: `access_expires_at` ist `NULL` in `user_access` Tabelle
- Prüfe: SQL-Migration wurde korrekt ausgeführt

