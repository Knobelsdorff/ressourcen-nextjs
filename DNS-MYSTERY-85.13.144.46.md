# DNS-Mystery: 85.13.144.46 erscheint, obwohl nicht in KAS

## Problem

- ❌ DNS-Check zeigt `85.13.144.46` für `ressourcen.app` (Root-Domain)
- ❌ DNS-Check zeigt `64.29.17.x` und `216.198.79.x` für `www.ressourcen.app` (nicht Vercel IPs!)
- ✅ Du hast `85.13.144.46` NICHT in KAS DNS-Verwaltung
- ✅ Du verwaltest DNS nirgendwo anders

## Mögliche Ursachen

### 1. Domain-Registrar hat eigene DNS-Einstellungen

**Wo wurde die Domain registriert?**
- ALL-INKL.COM (Kasserver)?
- Ein anderer Registrar (z.B. IONOS, Strato, etc.)?

**Prüfung:**
- Gehe zu deinem Domain-Registrar (nicht KAS, sondern wo du die Domain gekauft hast)
- Prüfe ob dort DNS-Einstellungen existieren
- Prüfe ob dort Nameserver auf KAS zeigen

### 2. Secondary DNS oder DNS-Cache

**Möglichkeit:**
- Es gibt einen Secondary DNS-Server, der alte Werte cached hat
- Oder: Ein DNS-Server zeigt noch alte Werte

### 3. Nameserver zeigen nicht auf KAS

**Prüfung:**
- Welche Nameserver sind für `ressourcen.app` konfiguriert?
- Zeigen sie wirklich auf `ns5.kasserver.com` und `ns6.kasserver.com`?
- Oder zeigen sie auf einen anderen Provider?

### 4. Domain wurde früher woanders verwaltet

**Möglichkeit:**
- Die Domain wurde früher bei einem anderen Provider gehostet
- Die alten DNS-Einstellungen sind noch aktiv
- Die Nameserver zeigen noch auf den alten Provider

## Was die DNS-Checks zeigen

### Für `ressourcen.app` (Root-Domain):
- `85.13.144.46` - **NICHT Vercel, NICHT in KAS**
- `216.198.79.1` - **NICHT Vercel, NICHT in KAS**

### Für `www.ressourcen.app`:
- `64.29.17.x` - **NICHT Vercel**
- `216.198.79.x` - **NICHT Vercel**

**Das bedeutet:** Die Domain zeigt NICHT auf Vercel, obwohl du es in KAS konfiguriert hast!

## Lösung: Prüfe Nameserver

### Schritt 1: Prüfe welche Nameserver aktiv sind

```bash
dig ressourcen.app NS +short
```

**Erwartet:**
- `ns5.kasserver.com`
- `ns6.kasserver.com`

**Falls andere Nameserver:**
- Die Nameserver zeigen nicht auf KAS
- Du musst die Nameserver beim Domain-Registrar ändern

### Schritt 2: Prüfe DNS direkt bei KAS Nameservern

```bash
dig @ns5.kasserver.com ressourcen.app A +short
```

**Erwartet:**
- `216.150.1.1` (oder was du in KAS konfiguriert hast)

**Falls andere IPs:**
- KAS Nameserver zeigen andere Werte als deine DNS-Verwaltung
- Möglicherweise Cache-Problem bei KAS

### Schritt 3: Prüfe Domain-Registrar

1. **Wo wurde die Domain registriert?**
   - Gehe zu deinem Domain-Registrar (nicht KAS!)
   - Prüfe DNS-Einstellungen dort
   - Prüfe Nameserver-Einstellungen dort

2. **Sind Nameserver auf KAS gesetzt?**
   - Nameserver sollten sein: `ns5.kasserver.com` und `ns6.kasserver.com`
   - Falls nicht: Ändere sie zu KAS Nameservern

## Verdacht

Die IPs `85.13.144.46`, `216.198.79.x` und `64.29.17.x` gehören **NICHT zu Vercel** und **NICHT zu KAS**.

**Mögliche Erklärung:**
- Die Domain wurde früher bei einem anderen Provider gehostet
- Die Nameserver zeigen noch auf diesen Provider
- Oder: Es gibt einen Secondary DNS, der alte Werte hat

## Nächste Schritte

1. **Prüfe Nameserver:** `dig ressourcen.app NS +short`
2. **Prüfe DNS direkt bei KAS:** `dig @ns5.kasserver.com ressourcen.app A +short`
3. **Prüfe Domain-Registrar:** Wo wurde die Domain registriert? Welche Nameserver sind dort gesetzt?
4. **Prüfe KAS DNS-Verwaltung:** Sind die Einstellungen wirklich gespeichert?

Die Tatsache, dass die DNS-Checks andere IPs zeigen als in KAS, deutet darauf hin, dass die Nameserver nicht auf KAS zeigen oder es ein Cache-Problem gibt.

