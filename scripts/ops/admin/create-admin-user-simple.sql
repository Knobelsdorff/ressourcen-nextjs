-- Einfacheres Skript: Erstelle Admin-User mit Supabase Admin-Funktion
-- Führe dieses Skript in der Supabase SQL Editor aus
-- 
-- WICHTIG: Dieses Skript funktioniert nur, wenn du Service Role Key verwendest
-- Für lokale Entwicklung: Verwende stattdessen das Supabase Dashboard

-- Alternative: Verwende Supabase Dashboard
-- 1. Gehe zu: Authentication → Users → Add User
-- 2. Email: andreas@knobelsdorff-therapie.de
-- 3. Passwort: (wähle ein Passwort)
-- 4. Auto Confirm User: ✅ (aktivieren für localhost)
-- 5. Klicke auf "Create User"

-- Oder verwende die Supabase CLI:
-- supabase auth admin create-user --email andreas@knobelsdorff-therapie.de --password DEIN_PASSWORT --email-confirm

-- Prüfe ob User existiert
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'andreas@knobelsdorff-therapie.de';

