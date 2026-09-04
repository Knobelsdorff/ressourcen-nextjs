# Stripe Customer Portal Setup - Schritt für Schritt

## Übersicht
Das Stripe Customer Portal ermöglicht es Usern, ihr Abo selbstständig zu verwalten (kündigen, Zahlungsmethode ändern, Rechnungen ansehen).

## Schritt-für-Schritt Anleitung

### Schritt 1: Stripe Dashboard öffnen
1. Gehe zu [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Stelle sicher, dass du eingeloggt bist
3. Wähle den richtigen Account (Test- oder Live-Modus)

### Schritt 2: Customer Portal finden
1. Im linken Menü: Klicke auf **"Einstellungen"** (Settings)
2. Dann auf **"Abonnements"** (Billing)
3. Scrolle nach unten zu **"Kundenportal"** (Customer Portal)

### Schritt 3: Customer Portal aktivieren
1. Klicke auf **"Kundenportal aktivieren"** (Activate customer portal)
2. Oder wenn bereits aktiviert: Klicke auf **"Bearbeiten"** (Edit)

### Schritt 4: Portal-Einstellungen konfigurieren

#### 4.1 Allgemeine Einstellungen
- **Portal-Name**: Kann leer bleiben oder einen Namen eingeben (z.B. "Ressourcen-App")
- **Beschreibung**: Optional - wird dem User angezeigt

#### 4.2 Funktionen aktivieren
Aktiviere folgende Funktionen:

✅ **Abonnements verwalten** (Manage subscriptions)
   - User können Abos kündigen
   - User können Abos wieder aktivieren (falls gekündigt)

✅ **Zahlungsmethoden verwalten** (Manage payment methods)
   - User können Zahlungsmethoden hinzufügen/ändern

✅ **Rechnungsverlauf anzeigen** (View invoice history)
   - User können vergangene Rechnungen einsehen

#### 4.3 Kündigungsoptionen
- **Sofortige Kündigung**: Aktivieren
- **Kündigung am Ende der Abrechnungsperiode**: Aktivieren (empfohlen)
  - User kann wählen, ob sofort oder am Ende der Periode gekündigt wird

#### 4.4 Rückerstattungen (optional)
- Kann deaktiviert bleiben (Standard: keine automatischen Rückerstattungen)

### Schritt 5: E-Mail-Benachrichtigungen konfigurieren
1. Scrolle zu **"E-Mail-Benachrichtigungen"** (Email notifications)
2. Aktiviere:
   - ✅ E-Mail senden, wenn Abo gekündigt wird
   - ✅ E-Mail senden, wenn Zahlungsmethode geändert wird
   - ✅ E-Mail senden, wenn Zahlung fehlschlägt

### Schritt 6: Speichern
1. Klicke auf **"Speichern"** (Save) oder **"Änderungen speichern"** (Save changes)
2. Stripe zeigt eine Bestätigung: "Kundenportal wurde aktualisiert"

### Schritt 7: Testen (Test-Modus)
1. Stelle sicher, dass du im **Test-Modus** bist (Toggle oben rechts)
2. Gehe zu deiner App: `/dashboard` → Tab "Profil"
3. Als Test-User mit aktivem Abo einloggen
4. Klicke auf **"Abo verwalten"**
5. Du solltest zum Stripe Customer Portal weitergeleitet werden

### Schritt 8: Live-Modus aktivieren
1. Wechsle zum **Live-Modus** (Toggle oben rechts)
2. Wiederhole Schritt 3-7 für den Live-Modus
3. Stelle sicher, dass alle Einstellungen identisch sind

## Wichtige Hinweise

### Return-URL
- Die Return-URL ist in der API-Route auf `/dashboard?tab=profile` gesetzt
- Nach dem Verlassen des Portals kommt der User zurück zum Dashboard

### Sicherheit
- Das Customer Portal ist sicher - Stripe verwaltet alles
- User können nur ihr eigenes Abo verwalten (durch Stripe authentifiziert)

### Webhooks
- Wenn ein User das Abo kündigt, sendet Stripe automatisch Webhooks
- Die Webhooks werden bereits von `/api/stripe/webhook` verarbeitet
- Das Abo wird automatisch in der Datenbank aktualisiert

## Troubleshooting

### Problem: "Kein aktives Abo gefunden"
- **Lösung**: Stelle sicher, dass der User ein aktives Abo hat (`subscription_status = 'active'`)

### Problem: Portal öffnet sich nicht
- **Lösung**: Prüfe, ob das Customer Portal in Stripe aktiviert ist
- **Lösung**: Prüfe die Browser-Konsole auf Fehler

### Problem: User wird nicht zurückgeleitet
- **Lösung**: Prüfe die Return-URL in der API-Route (`/api/stripe/customer-portal/route.ts`)

## Screenshots (deutsche Stripe-Oberfläche)

Die wichtigsten Stellen im Stripe Dashboard:
1. **Einstellungen** → **Abonnements** → **Kundenportal**
2. **Funktionen aktivieren**: Abonnements verwalten, Zahlungsmethoden verwalten, Rechnungsverlauf anzeigen
3. **Kündigungsoptionen**: Sofortige Kündigung + Kündigung am Ende der Periode

## Nächste Schritte

Nach der Konfiguration:
1. ✅ Teste im Test-Modus mit einer Test-Karte
2. ✅ Teste Kündigung und Reaktivierung
3. ✅ Teste Zahlungsmethode ändern
4. ✅ Aktiviere für Live-Modus
5. ✅ Informiere User über die neue Funktion

