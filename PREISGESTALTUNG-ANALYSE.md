# Preisgestaltung: Analyse und Vorschläge

## Aktuelle Situation

**Aktuelle Preise:**
- Standard: **179€** für 3 Monate, 3 Ressourcen
- Premium: **249€** für 3 Monate, 3 Ressourcen + Audio-Downloads

**Vergleich:**
- 1,5 persönliche Sitzungen = 330€
- App-Paket = 179€ (54% des Preises)

## Erkenntnisse

### ✅ Positive Aspekte
- Klienten nutzen die Ressourcen **regelmäßig** (laut Analytics)
- Die Ressourcen **funktionieren** für die Klienten
- Gute Akzeptanz trotz des Preises

### ⚠️ Herausforderungen
- App-Ressourcen sind **weniger wertvoll** als persönliche (maßgeschneidert vs. von der Stange)
- Der Preis sollte diesen **Wertunterschied widerspiegeln**
- Aktuell: 54% des Preises für deutlich weniger Wert

## Preisvorschläge

### Option 1: Konservativer Ansatz (Empfohlen)
**Ziel:** Preis senken, aber nicht zu aggressiv

- **Standard:** **99€** (statt 179€) für 3 Monate, 3 Ressourcen
  - 30% des Preises für persönliche Sitzungen
  - Deutlich günstiger, aber nicht zu billig
  - Zeigt Wertunterschied, bleibt aber attraktiv

- **Premium:** **149€** (statt 249€) für 3 Monate, 3 Ressourcen + Downloads
  - 45% des Preises für persönliche Sitzungen
  - Guter Mittelweg

**Vorteile:**
- Klienten sehen klaren Wertunterschied
- Bleibt attraktiv für regelmäßige Nutzer
- Nicht zu aggressiv (schützt dein Geschäft)

### Option 2: Aggressiver Ansatz
**Ziel:** Maximale Attraktivität, klarer Wertunterschied

- **Standard:** **79€** für 3 Monate, 3 Ressourcen
  - 24% des Preises für persönliche Sitzungen
  - Sehr attraktiv, klarer Wertunterschied

- **Premium:** **119€** für 3 Monate, 3 Ressourcen + Downloads
  - 36% des Preises für persönliche Sitzungen

**Vorteile:**
- Sehr attraktiv für Klienten
- Klarer Wertunterschied zu persönlichen Sitzungen
- Höhere Conversion-Rate möglich

**Nachteile:**
- Deutlich weniger Umsatz pro Kunde
- Könnte persönliche Sitzungen zu sehr konkurrenzieren

### Option 3: Monatliches Modell
**Ziel:** Flexibleres Angebot, niedrigere Einstiegshürde

- **Standard:** **39€/Monat** (statt 179€ einmalig)
  - 3 Ressourcen pro Monat
  - Kündbar jederzeit

- **Premium:** **59€/Monat** (statt 249€ einmalig)
  - 3 Ressourcen pro Monat + Downloads
  - Kündbar jederzeit

**Vorteile:**
- Niedrigere Einstiegshürde (39€ vs. 179€)
- Flexibler für Klienten
- Recurring Revenue für dich

**Nachteile:**
- Komplexere Implementierung (Subscription statt einmalige Zahlung)
- Höherer Verwaltungsaufwand

## Empfehlung

### Option 1: Konservativer Ansatz (99€/149€)

**Warum:**
1. **Wertunterschied wird klar:** 30% des Preises zeigt, dass es weniger wertvoll ist
2. **Bleibt attraktiv:** 99€ ist immer noch günstiger als 179€
3. **Schützt dein Geschäft:** Persönliche Sitzungen bleiben deutlich teurer
4. **Einfache Implementierung:** Nur Preise ändern, keine strukturellen Änderungen

**Neue Preise:**
- Standard: **99€** (statt 179€) - **-45%**
- Premium: **149€** (statt 249€) - **-40%**

**Neue Beschreibungen:**
- Standard: "3 Ressourcen, 3 Monate Zugang - Günstige Alternative zu persönlichen Sitzungen (330€)"
- Premium: "3 Ressourcen, 3 Monate Zugang, Audio-Downloads - Günstige Alternative zu persönlichen Sitzungen (330€)"

## Implementierung

Die Preise sind in zwei Dateien zu ändern:

1. **`src/app/api/checkout/route.ts`** - Backend-Preise
2. **`src/components/Paywall.tsx`** - Frontend-Anzeige

## Nächste Schritte

1. Entscheide dich für einen Preisvorschlag
2. Ich passe die Preise im Code an
3. Teste die Änderungen
4. Optional: A/B-Test mit verschiedenen Preisen

## Fragen zur Entscheidung

1. **Wie wichtig ist dir der Wertunterschied?**
   - Sehr wichtig → Option 2 (79€/119€)
   - Wichtig, aber nicht zu aggressiv → Option 1 (99€/149€)

2. **Willst du mehr Kunden oder mehr Umsatz pro Kunde?**
   - Mehr Kunden → Option 2 (niedrigere Preise)
   - Mehr Umsatz pro Kunde → Option 1 (höhere Preise)

3. **Wie wichtig ist Flexibilität?**
   - Sehr wichtig → Option 3 (monatliches Modell)
   - Nicht so wichtig → Option 1 oder 2 (einmalige Zahlung)

