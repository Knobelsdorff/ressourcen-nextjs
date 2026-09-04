# Klienten-Zugang: Ops & Diagnose

## Diagnose (Admin)

```http
GET /api/admin/resources/client-access?email=karingreiling@googlemail.com
```

Als eingeloggter Admin im Browser oder per `fetch` mit Session-Cookies.

Antwort enthält: Auth-User (`password_set`), Stories (`pending` / `assigned` / `orphaned`), `recommendations`.

## Sofort-Hilfe für Klientin (z. B. Karin)

1. Diagnose-Endpoint oben aufrufen.
2. **Neuen Link senden:** Admin Analytics → „Erneut“ oder `POST /api/admin/resources/resend` mit `{ "clientEmail": "karingreiling@googlemail.com" }`.
3. **Karin anleiten:**
   - E-Mail-Link funktioniert **nur einmal** (Passwort einrichten / Reset).
   - Danach immer: **https://www.power-storys.de/zugang**
   - **Exakt dieselbe E-Mail** wie bei der Ressource (`@googlemail.com`, nicht `@gmail.com`).
   - Link im **gleichen Browser** öffnen (nicht Mail-Vorschau → Safari wechseln).
   - Kein privater Modus.

## Häufige Ursachen

| Symptom | Ursache |
|--------|---------|
| Link nur 1× gültig | Supabase Recovery/Magic Link (by design) |
| Nach Reload leer | Session weg → `/zugang` mit Passwort |
| Ressource „weg“ | `user_id` noch null → nach Login `assign-pending` |
| Nach Passwort-Reset | Login mit **neuem** Passwort auf `/zugang` |
