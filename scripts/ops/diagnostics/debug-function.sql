-- Debug: Prüfe warum is_music_admin_for_storage() false zurückgibt
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe welcher User aktuell eingeloggt ist
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- 2. Prüfe ob die Email in music_admins ist
SELECT 
  'andreas@knobelsdorff-therapie.de' as email_to_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.music_admins 
      WHERE LOWER(email) = LOWER('andreas@knobelsdorff-therapie.de')
    ) THEN '✅ Gefunden'
    ELSE '❌ Nicht gefunden'
  END as in_table;

-- 3. Zeige alle Einträge in music_admins
SELECT email, admin_type FROM public.music_admins;

-- 4. Test: Simuliere die Funktion manuell
SELECT 
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_email,
  EXISTS (
    SELECT 1 
    FROM public.music_admins 
    WHERE LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  ) as should_be_admin;

-- 5. Prüfe ob die Funktion existiert und korrekt ist
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'is_music_admin_for_storage';

