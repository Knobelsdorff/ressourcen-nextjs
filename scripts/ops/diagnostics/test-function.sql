-- Test: Prüfe die Funktion mit verschiedenen Emails
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe welche Email aktuell eingeloggt ist
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email,
  is_music_admin_for_storage() as is_admin;

-- 2. Test: Prüfe manuell für andreas@knobelsdorff-therapie.de
SELECT 
  'andreas@knobelsdorff-therapie.de' as test_email,
  EXISTS (
    SELECT 1 
    FROM public.music_admins 
    WHERE LOWER(email) = LOWER('andreas@knobelsdorff-therapie.de')
  ) as in_music_admins_table,
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE LOWER(email) = LOWER('andreas@knobelsdorff-therapie.de')
  ) as in_auth_users;

-- 3. Zeige alle music_admins Einträge
SELECT email, admin_type FROM public.music_admins ORDER BY email;

-- 4. Zeige alle auth.users mit ähnlichen Emails (falls es Varianten gibt)
SELECT 
  id,
  email,
  LOWER(email) as email_lowercase
FROM auth.users
WHERE LOWER(email) LIKE '%andreas%' OR LOWER(email) LIKE '%knobelsdorff%';

