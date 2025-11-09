-- PREVIEW: Zeigt alle User mit temp-mail.org Domains (LÖSCHT NICHTS!)
-- Führe dieses Skript in der Supabase SQL Editor aus, um zu sehen, welche User betroffen wären
-- WICHTIG: Dieses Skript löscht nichts, es zeigt nur eine Übersicht!

-- 1. Zeige alle E-Mail-Domains in der Datenbank (um temp-mail.org Domains zu identifizieren)
SELECT 
  SUBSTRING(email FROM '@(.+)$') as domain,
  COUNT(*) as user_count
FROM auth.users
GROUP BY SUBSTRING(email FROM '@(.+)$')
ORDER BY user_count DESC;

-- 2. Zeige alle User mit bekannten temp-mail.org Domains
-- (Diese Liste kann erweitert werden, wenn neue Domains gefunden werden)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email LIKE '%@temp-mail.org'
   OR email LIKE '%@fandoe.com'
   OR email LIKE '%@guerrillamail.com'
   OR email LIKE '%@10minutemail.com'
   OR email LIKE '%@mailinator.com'
   OR email LIKE '%@throwaway.email'
   OR email LIKE '%@tempmail.com'
   OR email LIKE '%@tmpmail.org'
   OR email LIKE '%@mohmal.com'
   OR email LIKE '%@yopmail.com'
ORDER BY created_at DESC;

-- 3. Zeige Statistiken: Anzahl Stories und User Access Records pro temp-mail User
SELECT 
  u.id,
  u.email,
  COUNT(DISTINCT s.id) as story_count,
  COUNT(DISTINCT ua.id) as access_record_count
FROM auth.users u
LEFT JOIN public.saved_stories s ON s.user_id = u.id
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email LIKE '%@temp-mail.org'
   OR u.email LIKE '%@fandoe.com'
   OR u.email LIKE '%@guerrillamail.com'
   OR u.email LIKE '%@10minutemail.com'
   OR u.email LIKE '%@mailinator.com'
   OR u.email LIKE '%@throwaway.email'
   OR u.email LIKE '%@tempmail.com'
   OR u.email LIKE '%@tmpmail.org'
   OR u.email LIKE '%@mohmal.com'
   OR u.email LIKE '%@yopmail.com'
GROUP BY u.id, u.email
ORDER BY story_count DESC, u.created_at DESC;

-- 4. Zeige Anzahl der betroffenen User insgesamt
SELECT 
  COUNT(*) as total_temp_mail_users
FROM auth.users
WHERE email LIKE '%@temp-mail.org'
   OR email LIKE '%@fandoe.com'
   OR email LIKE '%@guerrillamail.com'
   OR email LIKE '%@10minutemail.com'
   OR email LIKE '%@mailinator.com'
   OR email LIKE '%@throwaway.email'
   OR email LIKE '%@tempmail.com'
   OR email LIKE '%@tmpmail.org'
   OR email LIKE '%@mohmal.com'
   OR email LIKE '%@yopmail.com';





