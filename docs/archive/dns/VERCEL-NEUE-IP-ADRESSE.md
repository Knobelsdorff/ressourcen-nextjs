# Vercel neue IP-Adresse für A-Record

## ⚠️ WICHTIG: Vercel hat IP-Adressen aktualisiert!

Vercel hat eine **IP-Range-Erweiterung** durchgeführt:

### Neue IP-Adresse (EMPFOHLEN):
- **A-Record für Root-Domain (`@`):** `216.150.1.1`

### Alte IP-Adresse (funktioniert noch, aber nicht mehr empfohlen):
- **A-Record für Root-Domain (`@`):** `76.76.21.21`

## Was du tun solltest:

### Option 1: Nur neue IP verwenden (EMPFOHLEN)
1. **Entferne** den A-Record mit `76.76.21.21`
2. **Behalte** den A-Record mit `216.150.1.1`
3. **Entferne** alle anderen A-Records für Root-Domain (z.B. `85.13.144.46`)

### Option 2: Beide IPs behalten (funktioniert auch)
- Beide A-Records (`76.76.21.21` und `216.150.1.1`) können gleichzeitig existieren
- Vercel sagt: "The old records will continue to work"
- Aber: Neue IP (`216.150.1.1`) wird empfohlen

## Konfliktierende Records entfernen

Vercel zeigt auch einen **konfliktierenden A-Record** an:
- **Entfernen:** A-Record mit Wert `85.13.144.46` (falls vorhanden)

## Zusammenfassung

**Korrekte Konfiguration:**
- ✅ A-Record `@` → `216.150.1.1` (neu, empfohlen)
- ✅ CNAME `www` → `024503c384718fa8.vercel-dns-017.com.`
- ❌ Entfernen: A-Record `@` → `85.13.144.46` (konfliktierend)
- ⚠️ Optional: A-Record `@` → `76.76.21.21` (alt, funktioniert noch, aber nicht mehr empfohlen)

## Nächste Schritte

1. **Prüfe** ob A-Record `@` → `85.13.144.46` existiert → **LÖSCHEN**
2. **Behalte** A-Record `@` → `216.150.1.1` (neu, empfohlen)
3. **Optional:** Entferne A-Record `@` → `76.76.21.21` (alt, nicht mehr empfohlen)
4. **Warte** 1-2 Stunden auf DNS-Propagierung
5. **Teste:** `https://ressourcen.app` sollte auf Vercel zeigen

