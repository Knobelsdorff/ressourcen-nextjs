#!/bin/bash
# Script zum Prüfen der Admin-E-Mail-Logs
# Führe aus mit: bash check-admin-email-sent.sh

echo "🔍 Prüfe Server-Logs nach Admin-Bestätigungs-E-Mails..."
echo ""

# Prüfe ob npm run dev läuft
if pgrep -f "next dev" > /dev/null; then
    echo "✅ Next.js Dev-Server läuft"
    echo ""
    echo "📧 Suche nach Admin-E-Mail-Logs..."
    echo ""
    
    # Hinweis: Die Logs sind in der Konsole, wo npm run dev läuft
    echo "⚠️  WICHTIG: Die Logs sind in der Konsole, wo 'npm run dev' läuft!"
    echo ""
    echo "Suche in den Logs nach folgenden Zeilen:"
    echo ""
    echo "✅ Erfolgreich:"
    echo "   [Email] sendAdminConfirmationEmail called:"
    echo "   [Email] ✅ Admin confirmation email sent via SMTP:"
    echo "   [API/resources/client/create-batch] ✅ Admin confirmation email sent to:"
    echo ""
    echo "❌ Fehler:"
    echo "   [Email] ❌ SMTP error sending admin confirmation:"
    echo "   [API/resources/client/create-batch] ❌ Failed to send admin confirmation:"
    echo ""
    echo "📋 Prüfe auch:"
    echo "   - Welche E-Mail-Adresse wurde verwendet? (siehe 'to:' in den Logs)"
    echo "   - Wurde die Klienten-E-Mail erfolgreich versendet?"
    echo "   - Gibt es SMTP-Fehler?"
    echo ""
else
    echo "⚠️  Next.js Dev-Server läuft nicht"
    echo "   Starte den Server mit: npm run dev"
    echo "   Dann prüfe die Logs in dieser Konsole"
fi

