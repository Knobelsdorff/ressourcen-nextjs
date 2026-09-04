# Test-Anleitung: Client-Ressource mit Email-Versand

## ✅ Implementierung abgeschlossen

### Was wurde implementiert:

1. **ClientResourceModal**: Namensfeld statt Figurenauswahl
2. **API-Endpoint**: Speichert Ressource mit `user_id: null` wenn `clientEmail` vorhanden
3. **Email-Versand**: Automatischer Versand von Magic Links/OTP Emails
4. **Automatische Zuordnung**: Ressourcen werden nach Login/Registrierung zugeordnet
5. **Dashboard-Filter**: Ressourcen mit `user_id: null` erscheinen nicht im Admin-Dashboard

---

## 🧪 Test-Schritte

### Test 1: Ressource OHNE Klienten-Email erstellen

1. **Als Admin einloggen** (z.B. `andreas@knobelsdorff-therapie.de`)
2. **Dashboard öffnen**: `http://localhost:3000/dashboard`
3. **Button klicken**: "Ressource für Klienten erstellen"
4. **Modal öffnet sich**:
   - Name eingeben: z.B. "Test-Ressource"
   - **KEINE Email eingeben**
   - Audio aufnehmen (oder Test-Audio verwenden)
5. **"Ressource erstellen" klicken**
6. **Erwartetes Ergebnis**:
   - ✅ Erfolgsmeldung erscheint
   - ✅ Ressource erscheint im Admin-Dashboard
   - ✅ `user_id` = Admin-ID
   - ✅ Keine Email wird verschickt

---

### Test 2: Ressource MIT Klienten-Email erstellen (neuer User)

1. **Als Admin einloggen**
2. **Dashboard öffnen**
3. **Button klicken**: "Ressource für Klienten erstellen"
4. **Modal ausfüllen**:
   - Name: z.B. "Meine Oma"
   - **Email eingeben**: z.B. `test-klient@example.com` (neue Email, die noch nicht existiert)
   - Audio aufnehmen
5. **"Ressource erstellen" klicken**
6. **Erwartetes Ergebnis**:
   - ✅ Erfolgsmeldung: "Eine Email wurde an test-klient@example.com verschickt..."
   - ✅ Ressource erscheint **NICHT** im Admin-Dashboard
   - ✅ `user_id` = `null` in Datenbank
   - ✅ Email wird verschickt (Signup-Email mit Bestätigungs-Link)

7. **Email prüfen** (oder Supabase Dashboard → Authentication → Users):
   - User wurde erstellt: `test-klient@example.com`
   - Bestätigungs-Email wurde verschickt
   - Link führt zu: `/dashboard?resource={resourceId}`

8. **Als Klient einloggen/registrieren**:
   - Klicke auf Link in Email (oder manuell einloggen)
   - Nach Login: Ressource sollte automatisch zugeordnet werden
   - Ressource erscheint im Klienten-Dashboard

---

### Test 3: Ressource MIT Klienten-Email erstellen (bestehender User)

1. **Erstelle zuerst einen Test-User**:
   - Registriere dich als `existing-user@example.com`
   - Bestätige Email

2. **Als Admin einloggen**
3. **Ressource erstellen**:
   - Name: z.B. "Mein Engel"
   - **Email**: `existing-user@example.com`
   - Audio aufnehmen
4. **"Ressource erstellen" klicken**
5. **Erwartetes Ergebnis**:
   - ✅ Erfolgsmeldung mit Email-Hinweis
   - ✅ Ressource erscheint **NICHT** im Admin-Dashboard
   - ✅ Magic Link Email wird verschickt (für Login)

6. **Als bestehender User einloggen**:
   - Klicke auf Magic Link in Email
   - Nach Login: Ressource wird automatisch zugeordnet
   - Ressource erscheint im User-Dashboard

---

### Test 4: Automatische Zuordnung nach Login

1. **Erstelle Ressource mit Email** (wie Test 2 oder 3)
2. **Logge dich als Klient ein** (mit der Email aus Schritt 1)
3. **Dashboard öffnen**
4. **Erwartetes Ergebnis**:
   - ✅ Ressource wird automatisch zugeordnet
   - ✅ Ressource erscheint im Dashboard
   - ✅ Console-Log: "Assigned X pending resources to user..."

---

## 🔍 Debugging

### Prüfe Datenbank:

```sql
-- Prüfe pending Ressourcen
SELECT id, title, user_id, client_email, is_audio_only, created_at
FROM saved_stories
WHERE user_id IS NULL
ORDER BY created_at DESC;

-- Prüfe zugeordnete Ressourcen
SELECT id, title, user_id, client_email, is_audio_only, created_at
FROM saved_stories
WHERE user_id IS NOT NULL
ORDER BY created_at DESC;
```

### Prüfe Console-Logs:

- Browser-Console: Suche nach "Assigned X pending resources"
- Server-Logs: Suche nach "Magic link generated" oder "Signup email sent"

### Prüfe Email-Versand:

1. **Supabase Dashboard** → **Authentication** → **Users**
2. Suche nach der Email-Adresse
3. Prüfe ob User erstellt wurde
4. Prüfe ob Email verschickt wurde (in Supabase Logs)

---

## ⚠️ Wichtige Hinweise

1. **Supabase SMTP muss konfiguriert sein**:
   - Gehe zu: **Authentication** → **Settings** → **SMTP Settings**
   - Aktiviere Custom SMTP oder verwende Supabase Standard

2. **Redirect URLs müssen konfiguriert sein**:
   - Gehe zu: **Authentication** → **Settings** → **URL Configuration**
   - Füge hinzu: `http://localhost:3000/dashboard?resource=*`

3. **Für lokale Tests**:
   - Emails werden möglicherweise nicht verschickt
   - Prüfe Supabase Dashboard → **Authentication** → **Users** für Bestätigungs-Links
   - Oder deaktiviere temporär Email-Bestätigung für Tests

---

## ✅ Checkliste

- [ ] Server läuft auf `http://localhost:3000`
- [ ] Als Admin eingeloggt
- [ ] Button "Ressource für Klienten erstellen" sichtbar
- [ ] Modal öffnet sich korrekt
- [ ] Audio-Recorder funktioniert
- [ ] Ressource ohne Email erscheint im Dashboard
- [ ] Ressource mit Email erscheint NICHT im Dashboard
- [ ] Email wird verschickt (oder in Supabase Dashboard sichtbar)
- [ ] Nach Login wird Ressource automatisch zugeordnet

---

## 🐛 Bekannte Probleme & Lösungen

### Problem: Email wird nicht verschickt
**Lösung**: 
- Prüfe Supabase SMTP-Konfiguration
- Prüfe Supabase Logs für Email-Fehler
- Für lokale Tests: Prüfe Supabase Dashboard für Bestätigungs-Links

### Problem: Ressource erscheint trotzdem im Admin-Dashboard
**Lösung**: 
- Prüfe ob `user_id` wirklich `null` ist in Datenbank
- Prüfe Dashboard-Filter: `.eq('user_id', user.id)`

### Problem: Ressource wird nicht automatisch zugeordnet
**Lösung**: 
- Prüfe Console-Logs für Fehler
- Prüfe ob `/api/resources/assign-pending` aufgerufen wird
- Prüfe ob `client_email` korrekt gesetzt ist

---

**Viel Erfolg beim Testen! 🚀**

