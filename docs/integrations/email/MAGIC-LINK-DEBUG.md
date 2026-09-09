# 🔍 Magic Link Debugging

## Problem
Magic Links führen zu `ressourcen.app` statt `localhost:3000`, obwohl die Ressource auf localhost erstellt wurde.

## Mögliche Ursachen

### 1. Supabase Site URL
Supabase verwendet möglicherweise die **Site URL** aus den Einstellungen für Magic Links, auch wenn `redirectTo` gesetzt ist.

**Lösung:**
1. Gehe zu **Supabase Dashboard** → **Authentication** → **Settings** → **URL Configuration**
2. Prüfe die **Site URL** - sollte auf `https://www.ressourcen.app` gesetzt sein
3. **WICHTIG:** Die **Redirect URLs** müssen **beide** enthalten:
   - `http://localhost:3000/**`
   - `https://www.ressourcen.app/**`

### 2. Origin-Erkennung
Die Origin-Erkennung wurde verbessert, aber prüfe die Server-Logs:

**Server-Logs prüfen:**
Nach dem Erstellen einer Ressource solltest du sehen:
```
[API/resources/client/create] Determined origin: http://localhost:3000
[API/resources/client/create] Redirect URL: http://localhost:3000/dashboard?resource=...
[API/resources/client/create] Magic link generated: { hasLink: true, linkPreview: '...', redirectTo: '...' }
```

### 3. Magic Link im Email-HTML
Prüfe, ob der Magic Link im Email-HTML korrekt ist:

**Server-Logs prüfen:**
```
=== 📧 EMAIL VERSENDEN ===
Magic Link: https://... (sollte localhost:3000 enthalten, nicht ressourcen.app)
```

## Lösung: Magic Link manuell anpassen

Falls Supabase den Magic Link mit der falschen URL generiert, können wir den Link in der Email manuell anpassen:

**Option 1:** Ersetze die Domain im Magic Link
- Wenn der Link `https://www.ressourcen.app/#access_token=...` ist
- Ersetze `www.ressourcen.app` mit `localhost:3000`
- Der Link sollte dann funktionieren

**Option 2:** Verwende die Site URL für localhost (nur für Development)
- Temporär in Supabase: Site URL auf `http://localhost:3000` setzen
- **WICHTIG:** Für Produktion wieder auf `https://www.ressourcen.app` setzen!

## Testen

1. Erstelle eine neue Ressource auf `localhost:3000`
2. Prüfe die Server-Logs für:
   - `[API/resources/client/create] Determined origin: ...`
   - `[API/resources/client/create] Redirect URL: ...`
   - `[API/resources/client/create] Magic link generated: ...`
3. Prüfe die Email - kopiere den Magic Link
4. Prüfe, ob der Link `localhost:3000` oder `ressourcen.app` enthält

## Workaround

Falls der Magic Link immer noch zu `ressourcen.app` führt:
1. Kopiere den Magic Link aus der Email
2. Ersetze `www.ressourcen.app` mit `localhost:3000` im Link
3. Öffne den angepassten Link im Browser

