# DNS Nameserver-Problem: KAS vs. Vercel

## Situation

**In KAS DNS-Verwaltung:**
- ✅ Nameserver sind korrekt: `ns5.kasserver.com` und `ns6.kasserver.com`
- ✅ A-Record ist korrekt: `216.150.1.1`
- ✅ CNAME ist korrekt: `www` → Vercel

**Aber:**
- ❌ `dig ressourcen.app NS +short` zeigt: `ns1.vercel-dns.com` und `ns2.vercel-dns.com`
- ❌ DNS-Checks zeigen falsche IPs (`85.13.144.46`)

## Problem

Die Nameserver in **KAS DNS-Verwaltung** sind korrekt, aber die Nameserver beim **Domain-Registrar** zeigen noch auf Vercel.

## Lösung

Du musst die Nameserver beim **Domain-Registrar** ändern (nicht in der DNS-Verwaltung, sondern bei der Domain-Registrierung):

### Schritt 1: Domain-Registrar finden

Da die Domain bei KAS registriert wurde:
1. Gehe zu **KAS/ALL-INKL.COM Dashboard**
2. Suche nach **"Domain-Verwaltung"** oder **"Domain-Einstellungen"**
3. Oder: **"Nameserver-Einstellungen"** oder **"DNS-Einstellungen"**

**WICHTIG:** Es gibt zwei verschiedene Bereiche:
- **DNS-Verwaltung** (wo du A/CNAME Records setzt) ✅ - hier ist alles korrekt
- **Domain-Registrierung/Nameserver** (wo die Nameserver für die Domain gesetzt werden) ❌ - hier müssen sie geändert werden

### Schritt 2: Nameserver beim Registrar ändern

1. Finde die **Nameserver-Einstellungen** für die Domain-Registrierung
2. Ändere Nameserver zu:
   ```
   ns5.kasserver.com
   ns6.kasserver.com
   ```
3. Speichere die Änderungen

### Schritt 3: Prüfen

Nach 1-2 Stunden:
```bash
dig ressourcen.app NS +short
```

**Sollte zeigen:**
```
ns5.kasserver.com.
ns6.kasserver.com.
```

**NICHT mehr:**
```
ns1.vercel-dns.com.
ns2.vercel-dns.com.
```

## Warum passiert das?

Es gibt **zwei verschiedene Ebenen**:

1. **Domain-Registrierung (Registrar-Level):**
   - Hier werden die Nameserver für die Domain gesetzt
   - Diese bestimmen, welche DNS-Server für die Domain zuständig sind
   - Aktuell: Zeigen auf Vercel ❌

2. **DNS-Verwaltung (DNS-Level):**
   - Hier werden die DNS-Records (A, CNAME, etc.) gesetzt
   - Diese sind nur aktiv, wenn die Nameserver auf diesen Provider zeigen
   - Aktuell: Korrekt in KAS ✅, aber nicht aktiv, weil Nameserver auf Vercel zeigen

## Zusammenfassung

**Was du tun musst:**
- Gehe zu KAS Domain-Verwaltung (nicht DNS-Verwaltung!)
- Finde Nameserver-Einstellungen für die Domain-Registrierung
- Ändere Nameserver zu `ns5.kasserver.com` und `ns6.kasserver.com`
- Warte 1-2 Stunden
- Prüfe mit `dig ressourcen.app NS +short`

**Nach dem Fix:**
- Nameserver zeigen auf KAS ✅
- DNS-Records in KAS werden verwendet ✅
- Domain zeigt auf Vercel (`216.150.1.1`) ✅
- Vercel Fehlermeldung verschwindet ✅

