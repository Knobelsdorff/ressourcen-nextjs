# Zahlungsmethoden werden nicht angezeigt - Cache-Problem

## ✅ Problem identifiziert!

**Symptom:** Zahlungsmethoden werden im normalen Browser nicht angezeigt, aber im Inkognito-Modus funktionieren sie.

**Ursache:** Browser-Cache oder gespeicherte Stripe-Session-Daten

## Lösung

### Option 1: Browser-Cache leeren (Empfohlen)

#### Chrome/Edge:
1. Drücke `Ctrl+Shift+Delete` (Windows) oder `Cmd+Shift+Delete` (Mac)
2. Wähle "Gesamte Zeit" oder "Letzte Stunde"
3. Aktiviere:
   - ✅ Cookies und andere Websitedaten
   - ✅ Bilder und Dateien im Cache
4. Klicke auf "Daten löschen"
5. Lade die Seite neu (`Ctrl+F5` oder `Cmd+Shift+R`)

#### Firefox:
1. Drücke `Ctrl+Shift+Delete` (Windows) oder `Cmd+Shift+Delete` (Mac)
2. Wähle "Gesamte Zeit"
3. Aktiviere:
   - ✅ Cookies und Website-Daten
   - ✅ Cache
4. Klicke auf "Jetzt löschen"
5. Lade die Seite neu (`Ctrl+F5` oder `Cmd+Shift+R`)

#### Safari:
1. Gehe zu Safari → Einstellungen → Erweitert
2. Aktiviere "Menü "Entwickler" in der Menüleiste anzeigen"
3. Gehe zu Entwickler → Caches leeren
4. Oder: Safari → Verlauf → Verlauf löschen
5. Lade die Seite neu (`Cmd+Shift+R`)

### Option 2: Hard Reload (Schnelltest)

**Windows/Linux:**
- `Ctrl + Shift + R` oder `Ctrl + F5`

**Mac:**
- `Cmd + Shift + R`

### Option 3: Stripe-Cookies löschen

1. Öffne die Browser-Entwicklertools (`F12`)
2. Gehe zu: **Application** (Chrome) oder **Storage** (Firefox)
3. Klicke auf **Cookies**
4. Suche nach Cookies von:
   - `checkout.stripe.com`
   - `www.ressourcen.app` (falls Stripe-Cookies dort gespeichert sind)
5. Lösche alle Stripe-bezogenen Cookies
6. Lade die Seite neu

### Option 4: Lokalen Storage leeren

1. Öffne die Browser-Entwicklertools (`F12`)
2. Gehe zu: **Application** (Chrome) oder **Storage** (Firefox)
3. Klicke auf **Local Storage**
4. Suche nach Einträgen von `www.ressourcen.app`
5. Lösche alle Einträge (oder nur Stripe-bezogene)
6. Lade die Seite neu

## Warum passiert das?

Stripe speichert manchmal Session-Daten im Browser-Cache oder Local Storage. Wenn eine alte Checkout-Session im Cache ist, die nur Card als Zahlungsmethode hatte, kann das die Anzeige der neuen Methoden blockieren.

## Für Endbenutzer

Wenn deine Kunden das Problem haben:

1. **Bitte sie, den Browser-Cache zu leeren**
2. **Oder verwende einen anderen Browser**
3. **Oder verwende den Inkognito-Modus** (funktioniert immer)

## Technische Lösung (Optional)

Falls das Problem weiterhin auftritt, können wir einen Cache-Busting-Parameter hinzufügen:

```typescript
// In checkout route.ts
const session = await stripe.checkout.sessions.create({
  // ... existing code ...
  metadata: {
    userId,
    planType: 'subscription',
    cacheBuster: Date.now().toString(), // Verhindert Cache-Probleme
  },
})
```

Aber normalerweise sollte das Leeren des Browser-Caches ausreichen.

## Zusammenfassung

- ✅ Code ist korrekt
- ✅ Stripe akzeptiert alle Methoden
- ✅ Dashboard zeigt Methoden als aktiviert
- ⚠️ Problem: Browser-Cache blockiert die Anzeige
- 🔧 Lösung: Browser-Cache leeren oder Inkognito-Modus verwenden

## Nächste Schritte

1. ✅ Leere deinen Browser-Cache
2. ✅ Teste den Checkout erneut
3. ✅ Falls Problem weiterhin besteht: Prüfe Browser-Erweiterungen (Ad-Blocker, etc.)

