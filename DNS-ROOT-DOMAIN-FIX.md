# DNS-Fix für Root-Domain ressourcen.app

## Problem

- ✅ `www.ressourcen.app` funktioniert (zeigt auf Vercel)
- ❌ `ressourcen.app` (ohne www) funktioniert NICHT (zeigt nicht auf Vercel)

## Lösung: Root-Domain A-Record hinzufügen
 
### Schritt 1: In ALL-INKL.COM DNS-Verwaltung

1. Gehe zu deiner DNS-Verwaltung bei ALL-INKL.COM
2. **Füge einen neuen A-Record hinzu:**

   ```
   Name: @ (oder leer lassen)
   Typ: A
   Wert: 76.76.21.21
   TTL: 3600 (oder Standard)
   ```

   **WICHTIG:** 
   - Name muss `@` sein (oder leer) für die Root-Domain
   - NICHT `1` oder eine andere Zahl!

### Schritt 2: In Vercel prüfen

1. Gehe zu Vercel Dashboard → **Settings** → **Domains**
2. Prüfe ob `ressourcen.app` (ohne www) hinzugefügt ist
3. Falls nicht: Füge `ressourcen.app` hinzu

### Schritt 3: Warten

- DNS-Änderungen können 24-48 Stunden dauern
- Meistens funktioniert es nach 1-2 Stunden

## Alternative: CNAME für Root-Domain

Falls A-Record nicht funktioniert, verwende CNAME:

```
Name: @ (oder leer)
Typ: CNAME
Wert: cname.vercel-dns.com
TTL: 3600
```

**Hinweis:** Nicht alle DNS-Provider erlauben CNAME für Root-Domain. A-Record ist meistens besser.

## Aktuelle DNS-Records (was du hast)

- ✅ `www` → CNAME → Vercel (funktioniert)
- ❌ Root-Domain (`@`) → fehlt! (funktioniert nicht)
- ✅ Email-Records (MX, SPF, DMARC, DKIM) - behalten
- ✅ Nameserver (NS) - behalten

## Nach dem Fix

Nach dem Hinzufügen des A-Records:
1. Warte 1-2 Stunden
2. Teste: `https://ressourcen.app` sollte auf Vercel zeigen
3. Teste: `https://www.ressourcen.app` sollte weiterhin funktionieren

