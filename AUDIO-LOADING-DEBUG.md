# Audio-Loading Debugging Checklist

## Problem
Audio-Dateien laden nicht auf MacBook und Android, funktionieren aber auf iPhone und Windows.

## Mögliche Ursachen

### 1. Browser-Cache
- **MacBook**: Browser-Cache leeren (Cmd+Shift+Delete)
- **Android**: Browser-Cache leeren in den Einstellungen
- **Test**: Im Inkognito/Privat-Modus testen

### 2. Browser-Extensions
- Ad-Blocker könnten Audio-Requests blockieren
- Privacy-Extensions könnten Cross-Origin-Requests blockieren
- **Test**: Alle Extensions deaktivieren und testen

### 3. Browser-Einstellungen
- Sicherheitseinstellungen könnten Audio blockieren
- Content-Security-Policy könnte Audio blockieren
- **Test**: Anderen Browser testen (Chrome, Firefox, Safari)

### 4. Netzwerk-Proxy/VPN
- Proxy könnte Audio-Requests blockieren
- VPN könnte Audio-Requests blockieren
- **Test**: VPN/Proxy deaktivieren und testen

### 5. Browser-Version
- Ältere Browser-Versionen könnten Probleme haben
- **Test**: Browser aktualisieren

## Debug-Logging

Die folgenden Informationen werden jetzt in der Konsole geloggt:

1. **HTTP HEAD Request**: Prüft ob die Datei über HTTP erreichbar ist
2. **Browser/Device Info**: User-Agent, Platform, Vendor, etc.
3. **Network State**: Überwacht `networkState` Änderungen
4. **Error Details**: Detaillierte Fehlerinformationen

## Nächste Schritte

1. **Browser-Konsole öffnen** (F12 oder Cmd+Option+I)
2. **Audio abspielen versuchen**
3. **Logs prüfen**:
   - `[playAudio] HTTP HEAD request for audio URL` - Ist die Datei erreichbar?
   - `[playAudio] Browser/Device info` - Welcher Browser/Device?
   - `[playAudio] Network state is NETWORK_NO_SOURCE` - Warum wird die Quelle nicht gefunden?
4. **URL direkt im Browser testen**: Kopiere die Audio-URL aus den Logs und öffne sie direkt im Browser

## Häufige Probleme

### CORS-Fehler
- **Symptom**: `CORS policy` Fehler in der Konsole
- **Lösung**: Supabase Storage CORS-Einstellungen prüfen

### Format-Fehler
- **Symptom**: `Format error` oder `MEDIA_ELEMENT_ERROR`
- **Lösung**: Datei-Format prüfen (sollte MP3 sein)

### Netzwerk-Fehler
- **Symptom**: `NETWORK_NO_SOURCE` oder Timeout
- **Lösung**: Netzwerk-Verbindung prüfen, VPN/Proxy deaktivieren

## Vergleich mit funktionierendem Gerät

Wenn es bei der Schwester funktioniert:
1. **Browser-Version vergleichen**
2. **Extensions vergleichen**
3. **Netzwerk-Einstellungen vergleichen**
4. **Browser-Einstellungen vergleichen**


