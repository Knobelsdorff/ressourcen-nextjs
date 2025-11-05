# Multi-Account-Prävention

## Problem
User können sich mit verschiedenen Email-Adressen mehrere Accounts erstellen, um mehrere kostenlose Ressourcen zu erhalten.

## Mögliche Lösungen

### 1. IP-basiertes Rate-Limiting (Empfohlen)
**Einfachste Lösung** - Verhindert mehrere Registrierungen von derselben IP

**Vorteile:**
- Einfach zu implementieren
- Verhindert offensichtliche Missbrauch

**Nachteile:**
- VPN/Proxy können umgangen werden
- Falsche Positives (z.B. mehrere User im selben Netzwerk)

**Implementierung:**
- Supabase Edge Functions oder Next.js Middleware
- Prüfe IP-Adresse bei Registrierung
- Maximal 1-2 Accounts pro IP pro Tag

### 2. Device-Fingerprinting
**Mittlere Lösung** - Erkennt dieselben Geräte über verschiedene Accounts

**Vorteile:**
- Funktioniert auch bei verschiedenen IPs
- Bessere Erkennung als IP allein

**Nachteile:**
- Kann von technisch versierten Usern umgangen werden
- Datenschutz-Bedenken (muss in DSGVO konform sein)

**Implementierung:**
- Browser-Fingerprinting (Canvas, WebGL, etc.)
- Speichere Fingerprint in Datenbank
- Prüfe bei Registrierung

### 3. Kreditkarten-Validierung (Stripe)
**Beste Lösung** - Eine Karte = Ein Account

**Vorteile:**
- Sehr effektiv
- Nutzt bestehende Stripe-Integration
- Kann auch für Zahlungen verwendet werden

**Nachteile:**
- User müssen Karte eingeben (auch für kostenlose Ressource)
- Komplexer zu implementieren
- Datenschutz (Kartendaten)

**Implementierung:**
- Stripe Payment Method beim ersten Speichern erfassen (Setup Intent)
- Karte wird nicht belastet, nur validiert
- Prüfe ob Karte bereits verwendet wurde

### 4. Email-Domain-Blocking
**Einfache Lösung** - Blockiere bekannte Temp-Mail-Dienste

**Vorteile:**
- Sehr einfach
- Verhindert offensichtliche Missbrauch

**Nachteile:**
- Liste muss gepflegt werden
- Neue Temp-Mail-Dienste werden nicht erfasst

**Implementierung:**
- Liste bekannter Temp-Mail-Domains
- Prüfe bei Registrierung
- Blockiere oder warne

### 5. Kombination (Empfohlen)
**Beste Praxis** - Kombiniere mehrere Methoden

**Empfohlene Kombination:**
1. **IP-Rate-Limiting** (3 Accounts pro IP pro Tag)
2. **Email-Domain-Blocking** (bekannte Temp-Mail-Dienste)
3. **Device-Fingerprinting** (optional, für später)

## Empfohlene Implementierung

### Phase 1: Sofort umsetzbar
1. Email-Domain-Blocking (Temp-Mail-Dienste)
2. IP-basiertes Rate-Limiting (2 Accounts pro IP pro 24h)

### Phase 2: Später
3. Device-Fingerprinting (wenn mehr Missbrauch)
4. Kreditkarten-Validierung (optional, wenn Budget vorhanden)

## Technische Umsetzung

### Option A: Next.js Middleware
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // Prüfe IP bei Registrierung
  const ip = request.ip || request.headers.get('x-forwarded-for')
  // Prüfe Rate-Limit
  // Blockiere bekannte Temp-Mail-Domains
}
```

### Option B: Supabase Edge Function
```typescript
// Prüfe bei User-Erstellung
// Rate-Limit über Supabase Storage/Cache
```

### Option C: Supabase Database Trigger
```sql
-- Trigger bei User-Erstellung
-- Prüfe IP, Email-Domain, etc.
```

## Kompromiss-Lösung (Empfohlen für Start)

1. **Email-Domain-Blocking** - Blockiere offensichtliche Temp-Mail-Dienste
2. **Kreditkarten-Validierung** - Erfasse Karte beim ersten Speichern (Setup Intent, nicht belastet)
3. **Limit:** Maximal 2 Accounts pro Karte

**Warum diese Lösung?**
- Effektiv gegen Missbrauch
- User muss Karte haben (filtert viele Missbraucher)
- Nutzt bestehende Stripe-Integration
- Karte wird nicht belastet (nur validiert)

## Nächste Schritte

1. Entscheide welche Lösung(n) du implementieren möchtest
2. Ich kann die Implementierung für dich erstellen
3. Teste die Lösung mit verschiedenen Szenarien

