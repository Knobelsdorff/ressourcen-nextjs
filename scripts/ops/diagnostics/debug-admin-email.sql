-- Debug: Prüfe welche Admin-E-Mail-Adressen verwendet werden
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Prüfe welche Admin-E-Mail-Adressen konfiguriert sind
-- (Diese werden aus NEXT_PUBLIC_ADMIN_EMAILS verwendet)
SELECT 
  'Admin E-Mails aus NEXT_PUBLIC_ADMIN_EMAILS' as info,
  'heilung@knobelsdorff-therapie.de,tahirwaleed399@gmail.com' as configured_emails;

-- 2. Prüfe alle User mit Admin-E-Mail-Adressen
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email = 'heilung@knobelsdorff-therapie.de' THEN '✅ Admin E-Mail'
    WHEN email = 'tahirwaleed399@gmail.com' THEN '✅ Admin E-Mail'
    WHEN email = 'andreas@knobelsdorff-therapie.de' THEN '✅ Music Admin E-Mail'
    ELSE '❓ Andere E-Mail'
  END as admin_status
FROM auth.users
WHERE email IN (
  'heilung@knobelsdorff-therapie.de',
  'tahirwaleed399@gmail.com',
  'andreas@knobelsdorff-therapie.de'
)
ORDER BY created_at DESC;

-- 3. Prüfe die letzten Ressourcen-Versendungen (für jasmin.danielse@live.de)
-- Diese Query zeigt, wann die Ressourcen erstellt wurden
SELECT 
  id,
  title,
  client_email,
  created_at,
  user_id IS NULL as is_pending,
  CASE 
    WHEN user_id IS NULL THEN '⏳ Pending'
    ELSE '✅ Zugeordnet'
  END as status
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de'
ORDER BY created_at DESC;

