# DNS-Problem gelöst: Nameserver zeigen auf Vercel!

## 🔍 Problem gefunden!

Die Nameserver für `ressourcen.app` zeigen auf **Vercel**, nicht auf KAS:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Das bedeutet:**
- Die Domain-Registrierung hat Nameserver auf Vercel gesetzt
- Aber: Vercel's DNS-Einstellungen sind nicht korrekt konfiguriert
- Deshalb zeigt die Domain auf alte IPs (`85.13.144.46`, etc.)

## ✅ Lösung: Zwei Optionen

### Option 1: Nameserver zurück zu KAS ändern (EMPFOHLEN)

**Warum?**
- Du verwaltest DNS bereits in KAS
- Du hast dort alle Einstellungen korrekt
- Einfacher zu verwalten

**Schritte:**
1. Gehe zu deinem **Domain-Registrar** (nicht KAS, sondern wo du die Domain gekauft hast)
2. Finde **Nameserver-Einstellungen**
3. Ändere Nameserver zu:
   ```
   ns5.kasserver.com
   ns6.kasserver.com
   ```
4. Warte 24-48 Stunden auf DNS-Propagierung
5. Prüfe: `dig ressourcen.app NS +short` sollte KAS Nameserver zeigen

### Option 2: DNS-Einstellungen in Vercel konfigurieren

**Warum?**
- Wenn Nameserver auf Vercel zeigen, musst du DNS dort verwalten
- Nicht in KAS!

**Schritte:**
1. Gehe zu Vercel Dashboard → **Settings** → **Domains**
2. Klicke auf `ressourcen.app`
3. Gehe zu **"Vercel DNS"** Tab
4. Füge DNS-Records hinzu:
   - A-Record `@` → `216.150.1.1`
   - CNAME `www` → (Vercel zeigt dir den Wert)
5. Entferne alte/konfliktierende Records

## 🔍 Beweis

**Direkt bei KAS Nameservern abfragen:**
```bash
dig @ns5.kasserver.com ressourcen.app A +short
# Ergebnis: 216.150.1.1 ✅ (korrekt!)
```

**Bei aktuellen Nameservern (Vercel) abfragen:**
```bash
dig ressourcen.app A +short
# Ergebnis: 85.13.144.46 ❌ (falsch, weil Vercel DNS nicht konfiguriert ist)
```

## 🎯 Empfehlung

**Option 1 verwenden** (Nameserver zurück zu KAS):
- Du hast bereits alles in KAS konfiguriert
- Einfacher zu verwalten
- Keine doppelte DNS-Verwaltung nötig

## 📝 Zusammenfassung

**Das Problem:**
- Nameserver zeigen auf Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
- Aber: Vercel DNS ist nicht konfiguriert
- Deshalb: Domain zeigt auf alte IPs

**Die Lösung:**
- Nameserver zurück zu KAS ändern (`ns5.kasserver.com`, `ns6.kasserver.com`)
- Oder: DNS in Vercel konfigurieren (aber dann nicht mehr in KAS)

**Nach dem Fix:**
- `dig ressourcen.app NS +short` sollte KAS Nameserver zeigen
- `dig ressourcen.app A +short` sollte `216.150.1.1` zeigen
- Vercel Fehlermeldung sollte verschwinden

