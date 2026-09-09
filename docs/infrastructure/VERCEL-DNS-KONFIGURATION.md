# Vercel DNS-Konfiguration für ressourcen.app

## ⚠️ WICHTIG: Nameserver vs. DNS-Records

Wenn deine Domain bei **ALL-INKL.COM (Kasserver)** gehostet wird, aber für **Vercel** verwendet werden soll, gibt es **zwei Optionen**:

### Option 1: DNS-Records bei ALL-INKL.COM (EMPFOHLEN)

**Behalte die Nameserver bei ALL-INKL.COM** und konfiguriere A/CNAME Records:

1. **Gehe zu ALL-INKL.COM DNS-Verwaltung** (nicht Nameserver ändern!)
2. **Füge folgende DNS-Records hinzu:**

   **Für `www.ressourcen.app`:**
   ```
   Typ: CNAME
   Name: www
   Wert: cname.vercel-dns.com
   TTL: 3600
   ```

   **Für `ressourcen.app` (Root-Domain):**
   ```
   Typ: A
   Name: @ (oder leer)
   Wert: 76.76.21.21
   TTL: 3600
   ```
   
   ODER (wenn A-Record nicht funktioniert):
   ```
   Typ: CNAME
   Name: @ (oder leer)
   Wert: cname.vercel-dns.com
   TTL: 3600
   ```

3. **Warte 24-48 Stunden** für DNS-Propagierung

### Option 2: Vercel Nameserver verwenden

**NUR wenn du die Domain komplett zu Vercel übertragen willst:**

1. **Vercel Dashboard** → **Settings** → **Domains**
2. Klicke auf `ressourcen.app`
3. Kopiere die **Vercel Nameserver** (z.B. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
4. **Gehe zu deinem Domain-Registrar** (nicht ALL-INKL.COM, sondern wo du die Domain registriert hast)
5. **Ändere die Nameserver** zu den Vercel Nameservern

**⚠️ WICHTIG:** Wenn du Option 2 wählst, verlierst du die Kontrolle über die DNS-Einstellungen bei ALL-INKL.COM.

## Aktuelle Situation

Du hast aktuell:
- Nameserver: `ns5.kasserver.com` und `ns6.kasserver.com` (ALL-INKL.COM)

**Das ist korrekt, WENN:**
- Die Domain bei ALL-INKL.COM gehostet wird
- Du **DNS-Records** (A/CNAME) bei ALL-INKL.COM konfigurierst, die auf Vercel zeigen

**Das ist NICHT korrekt, WENN:**
- Du die Nameserver zu Vercel ändern willst (dann müsstest du die Vercel Nameserver verwenden)

## Empfehlung

**Option 1 verwenden** (DNS-Records bei ALL-INKL.COM):
- Behalte die Nameserver bei ALL-INKL.COM
- Konfiguriere A/CNAME Records, die auf Vercel zeigen
- Du behältst die volle Kontrolle über deine DNS-Einstellungen

## Prüfung

Nach der Konfiguration:
1. Prüfe ob `www.ressourcen.app` auf Vercel zeigt
2. Prüfe ob `ressourcen.app` auf Vercel zeigt (oder zu www weiterleitet)
3. Warte 24-48 Stunden für vollständige DNS-Propagierung

