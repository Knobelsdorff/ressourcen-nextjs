-- DELETE: Löscht alle User mit temp-mail.org Domains
-- ⚠️ WICHTIG: Dieses Skript löscht endgültig alle User und deren Daten!
-- ⚠️ Führe zuerst das Preview-Skript aus, um zu sehen, welche User betroffen sind!
-- ⚠️ Erstelle ein Backup, bevor du dieses Skript ausführst!

-- Strategie:
-- 1. Die User werden aus auth.users gelöscht
-- 2. Durch CASCADE DELETE werden automatisch gelöscht:
--    - public.profiles (durch ON DELETE CASCADE)
--    - public.saved_stories (durch ON DELETE CASCADE)
--    - public.user_access (durch ON DELETE CASCADE, falls vorhanden)

-- BEGIN TRANSACTION (optional - kann in Supabase SQL Editor manuell gemacht werden)
BEGIN;

-- Zuerst: Zeige nochmal die Anzahl der betroffenen User (zum Loggen)
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
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
  
  RAISE NOTICE 'Lösche % User mit temp-mail.org Domains', user_count;
END $$;

-- Lösche alle User mit temp-mail.org Domains
-- Durch CASCADE DELETE werden automatisch alle abhängigen Daten gelöscht
DELETE FROM auth.users
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

-- Zeige die Anzahl der gelöschten User
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Erfolgreich gelöscht: % User', deleted_count;
END $$;

-- COMMIT TRANSACTION (wenn alles OK ist)
-- ROLLBACK; (wenn etwas schief geht)
COMMIT;

-- Nach dem Löschen: Überprüfe, ob noch temp-mail User vorhanden sind
SELECT 
  COUNT(*) as remaining_temp_mail_users
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



