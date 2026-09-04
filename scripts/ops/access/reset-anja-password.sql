-- Setze ein temporäres Passwort für Anja (für Test-Zwecke)
-- Führe dieses Skript in der Supabase SQL Editor aus
-- WICHTIG: Dieses Skript funktioniert nur wenn du Admin-Rechte in Supabase hast

-- Option 1: Setze Passwort direkt (erfordert Supabase Auth Admin-API)
-- Diese Methode funktioniert nur über die Supabase Dashboard oder API

-- Option 2: Verwende Supabase Auth Admin API (empfohlen)
-- Im Supabase Dashboard: Authentication → Users → Finde Anja → Reset Password

-- Option 3: Erstelle einen Test-Link zum Passwort zurücksetzen
-- Dies sendet eine Email an Anja (nicht ideal für Tests)

-- Für Tests: Verwende besser die Supabase Dashboard UI
-- 1. Gehe zu: Supabase Dashboard → Authentication → Users
-- 2. Finde User: anja.musica@web.de
-- 3. Klicke auf "..." (drei Punkte) → "Send password reset email"
-- 4. ODER: Klicke auf "Reset password" → Setze neues Passwort direkt

-- Alternative: Verwende Supabase CLI (falls installiert)
-- supabase auth admin update-user-by-id <user-id> --password "TestPasswort123!"

-- WICHTIG: Nach dem Test solltest du das Passwort wieder zurücksetzen
-- oder Anja bitten, ihr Passwort selbst zu ändern

