# Paywall Feature Flag

Die Paywall-Funktionalität kann jetzt über ein Feature Flag ein- und ausgeschaltet werden.

## Umgebungsvariable

```bash
NEXT_PUBLIC_PAYWALL_ENABLED=true   # Paywall aktiviert
NEXT_PUBLIC_PAYWALL_ENABLED=false  # Paywall deaktiviert (Standard)
```

## Verwendung

### Für lokale Entwicklung (Paywall aktiviert):
```bash
# In .env.local
NEXT_PUBLIC_PAYWALL_ENABLED=true
```

### Für Live-Deployment (Paywall deaktiviert):
```bash
# In der Live-Umgebung (z.B. Vercel Environment Variables)
NEXT_PUBLIC_PAYWALL_ENABLED=false
```

Oder einfach die Variable nicht setzen - Standard ist `false`.

## Betroffene Dateien

Die Paywall-Prüfungen wurden in folgenden Dateien mit Feature Flags umgeben:

1. **src/app/page.tsx**
   - `handleNextStep` - Paywall-Prüfung beim Übergang Step 1 → Step 2

2. **src/components/AudioPlayback.tsx**
   - `handleSaveStory` - Paywall-Prüfung beim Speichern
   - `saveStoryToDatabase` - Paywall-Prüfung beim Speichern
   - `savePendingStoryToDatabase` - Paywall-Prüfung beim Speichern von Pending Stories
   - `togglePlayPause` - Paywall-Prüfung beim Abspielen
   - `restart` - Paywall-Prüfung beim Restart

3. **src/app/dashboard/page.tsx**
   - `playAudio` - Paywall-Prüfung beim Abspielen
   - Play-Button onClick - Paywall-Prüfung vor dem Abspielen

## Deployment-Strategie

### Admin Analytics deployen (ohne Paywall):

1. **Alle Dateien committen** (inkl. Paywall-Code)
2. **In Live-Umgebung setzen:**
   - `NEXT_PUBLIC_PAYWALL_ENABLED=false` (oder nicht setzen)
   - `NEXT_PUBLIC_ADMIN_EMAILS=deine-admin-email@example.com`
   - `SUPABASE_SERVICE_ROLE_KEY=dein-service-role-key`

3. **Ergebnis:**
   - ✅ Admin Analytics funktionieren (`/admin/analytics`)
   - ✅ Paywall ist deaktiviert (alle Ressourcen können erstellt werden)
   - ✅ Paywall-Code bleibt im Codebase, wird aber nicht ausgeführt

### Paywall später aktivieren:

1. **In Live-Umgebung ändern:**
   - `NEXT_PUBLIC_PAYWALL_ENABLED=true`
2. **Server neu starten** (oder warten bis nächster Deployment)
3. **Paywall ist jetzt aktiv**

## Wichtig

- Die Paywall-Komponente (`src/components/Paywall.tsx`) bleibt immer im Code
- Die Paywall-Logik wird nur ausgeführt, wenn `NEXT_PUBLIC_PAYWALL_ENABLED=true` gesetzt ist
- Standard ist `false` (Paywall deaktiviert), wenn Variable nicht gesetzt ist

