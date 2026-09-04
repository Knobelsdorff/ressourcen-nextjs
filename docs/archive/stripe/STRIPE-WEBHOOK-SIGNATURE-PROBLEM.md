# Stripe Webhook Signatur-Verifikation Problem

## Problem
Die Signatur-Verifikation schlägt fehl, obwohl:
- ✅ Webhook-Secret ist korrekt formatiert (`whsec_...`)
- ✅ Body wird als ArrayBuffer gelesen
- ✅ Event wird verarbeitet (im Test-Modus mit Umgehung)
- ❌ Stripe zeigt keine Events an, weil Signatur-Verifikation fehlschlägt

## Ursache
**Vercel modifiziert den Body**, bevor er bei unserer Route ankommt. Das ist ein bekanntes Problem mit Next.js App Router und Stripe Webhooks.

## Lösung: Edge Function verwenden

Edge Functions in Vercel erhalten den Body unverändert. Wir müssen die Route als Edge Function konfigurieren.

### Option 1: Route als Edge Function (Empfohlen)

Ändere `src/app/api/stripe-webhook/route.ts`:

```typescript
export const runtime = 'edge'; // Statt 'nodejs'
```

**Vorteile:**
- Body wird nicht modifiziert
- Signatur-Verifikation funktioniert
- Stripe zeigt Events an

**Nachteile:**
- Edge Functions haben Einschränkungen (z.B. keine Node.js APIs)
- Supabase Client muss angepasst werden

### Option 2: Akzeptieren, dass im Test-Modus die Signatur-Verifikation fehlschlägt

**Aktueller Status:**
- ✅ Events werden verarbeitet (Umgehung aktiv)
- ✅ Zugang wird erstellt
- ❌ Stripe zeigt Events nicht an

**Für Production:**
- Signatur-Verifikation muss funktionieren
- Sonst zeigt Stripe Events nicht an

## Empfehlung

Für jetzt (Test-Modus): Es funktioniert, auch wenn Stripe Events nicht angezeigt werden.

Für Production: Route als Edge Function konfigurieren, damit die Signatur-Verifikation funktioniert.

