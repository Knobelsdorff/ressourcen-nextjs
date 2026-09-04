# 🔧 Password Reset auf localhost

## Problem
Wenn du auf localhost testest und einen Password-Reset-Link aus der E-Mail öffnest, funktioniert der Link möglicherweise nicht, weil Supabase die **Site URL** verwendet, um den Reset-Link zu generieren.

## Warum passiert das?
- Supabase verwendet die **Site URL** aus der Konfiguration, um Reset-Links zu generieren
- Wenn die Site URL auf `https://www.ressourcen.app` gesetzt ist, wird der Code für diese Domain generiert
- Wenn du den Link dann auf localhost öffnest, funktioniert der Code möglicherweise nicht, weil er an die Production-Domain gebunden ist

## Lösung: Site URL temporär ändern

### Für lokale Tests:
1. Gehe zu **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Ändere die **Site URL** von `https://www.ressourcen.app` zu `http://localhost:3000`
3. Speichere die Änderung
4. Teste den Password-Reset auf localhost
5. **WICHTIG:** Ändere die Site URL **zurück** zu `https://www.ressourcen.app` für Production!

### Alternative: Manueller Link-Wechsel
Wenn du die Site URL nicht ändern möchtest:
1. Kopiere den Reset-Link aus der E-Mail (z.B. `https://www.ressourcen.app/?code=...`)
2. Ersetze `https://www.ressourcen.app` mit `http://localhost:3000`
3. Öffne den geänderten Link im Browser
4. **Hinweis:** Diese Methode funktioniert möglicherweise nicht, wenn der Code an die Domain gebunden ist

## Automatische Erkennung (implementiert)
Die App erkennt automatisch, wenn du auf localhost bist, und leitet dich zur Reset-Seite weiter. Aber wenn der Link zu Production führt, muss der Code möglicherweise für die Production-Domain generiert werden.

## Empfehlung
Für lokale Tests: **Ändere die Site URL temporär auf localhost**, dann zurück auf Production.



