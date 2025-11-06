# Webhook Debug Checkliste - Schritt für Schritt

## Schritt 1: Prüfe Vercel Logs

1. Gehe zu Vercel Dashboard → **Deployments**
2. Wähle den letzten Deployment aus
3. Klicke auf **"Logs"**
4. Suche nach folgenden Zeilen:
   - `"Stripe Webhook: Request received"`
   - `"Stripe Webhook: Body received, length:"`
   - `"Stripe Webhook: Signature check"`
   - `"Stripe Webhook: Signature verification failed"`

**Was zeigt die Log-Zeile "Signature check"?**
- `webhookSecretLength`: Sollte > 0 sein
- `hasWebhookSecret`: Sollte `true` sein

**Kopiere mir bitte die relevanten Log-Zeilen!**

## Schritt 2: Prüfe Stripe Webhook Events

1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf deinen Endpunkt (`https://ressourcen-nextjs.vercel.app/api/stripe-webhook`)
3. Klicke auf **"Ereignisse"** oder **"Events"**
4. Führe eine Testzahlung durch
5. Prüfe ob ein neues Event erscheint
6. Klicke auf das Event
7. Prüfe:
   - **Status**: Was steht dort? (Erfolgreich, Fehlgeschlagen, etc.)
   - **Antwort**: Was steht in der Antwort?
   - **Fehler**: Gibt es eine Fehlermeldung?

**Kopiere mir bitte:**
- Event-Status
- Fehlermeldung (falls vorhanden)
- Antwort-Code

## Schritt 3: Prüfe Webhook-Secret in Vercel

1. Gehe zu Vercel Dashboard → **Settings** → **Environment Variables**
2. Finde `STRIPE_WEBHOOK_SECRET`
3. Prüfe:
   - Ist es gesetzt?
   - Beginnt es mit `whsec_`?
   - Wie viele Zeichen hat es? (sollte ca. 50-60 Zeichen sein)

**Antwort:**
- Ist `STRIPE_WEBHOOK_SECRET` vorhanden? Ja/Nein
- Beginnt es mit `whsec_`? Ja/Nein
- Wie viele Zeichen hat es? (ungefähr)

## Schritt 4: Prüfe Webhook-Secret in Stripe

1. Gehe zu Stripe Dashboard → **Webhooks**
2. Klicke auf deinen Endpunkt
3. Klicke auf **"Signing-Geheimnis anzeigen"** oder **"Reveal signing secret"**
4. Kopiere das Secret (beginnt mit `whsec_...`)

**Antwort:**
- Beginnt das Secret in Stripe mit `whsec_`? Ja/Nein
- Wie viele Zeichen hat es? (ungefähr)

## Schritt 5: Vergleich

**Vergleiche:**
- Stimmt das Secret in Vercel mit dem Secret in Stripe überein?
- Haben beide die gleiche Länge?
- Beginnt beide mit `whsec_`?

**Antwort:**
- Stimmen die Secrets überein? Ja/Nein

## Schritt 6: Prüfe ob Code deployed ist

1. Gehe zu Vercel Dashboard → **Deployments**
2. Prüfe den letzten Deployment:
   - Wann wurde er erstellt?
   - Hat er die neuesten Code-Änderungen?

**Antwort:**
- Wann wurde der letzte Deployment erstellt?
- Wurden die Code-Änderungen gepusht?

