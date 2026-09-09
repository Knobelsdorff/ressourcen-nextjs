-- Debug: Prüfe warum Storage-Upload für andreas@knobelsdorff-therapie.de fehlschlägt
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe ob die Email in der music_admins Tabelle ist
SELECT 
  'Email in music_admins?' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.music_admins 
      WHERE LOWER(email) = LOWER('andreas@knobelsdorff-therapie.de')
    ) THEN '✅ JA'
    ELSE '❌ NEIN'
  END as result;

-- 2. Zeige alle Einträge in music_admins (mit exakter Email)
SELECT 
  email,
  LOWER(email) as email_lowercase,
  admin_type,
  'andreas@knobelsdorff-therapie.de' as email_to_check,
  LOWER('andreas@knobelsdorff-therapie.de') as email_to_check_lowercase,
  CASE 
    WHEN LOWER(email) = LOWER('andreas@knobelsdorff-therapie.de') THEN '✅ Match'
    ELSE '❌ Kein Match'
  END as match_status
FROM public.music_admins;

-- 3. Prüfe ob der User in auth.users existiert
SELECT 
  id,
  email,
  LOWER(email) as email_lowercase,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE LOWER(email) = LOWER('andreas@knobelsdorff-therapie.de');

-- 4. Test: Simuliere die Storage-Policy-Prüfung
-- (Das ist die Logik, die die Storage-Policy verwendet)
SELECT 
  'Storage Policy Test' as test_name,
  au.id as user_id,
  au.email as user_email,
  ma.email as admin_email,
  ma.admin_type,
  CASE 
    WHEN LOWER(au.email) = LOWER(ma.email) THEN '✅ Würde Zugriff erlauben'
    ELSE '❌ Würde Zugriff verweigern'
  END as policy_result
FROM auth.users au
CROSS JOIN public.music_admins ma
WHERE LOWER(au.email) = LOWER('andreas@knobelsdorff-therapie.de');

-- 5. Prüfe Storage-Policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%music%'
ORDER BY policyname;

-- 6. Prüfe ob RLS auf storage.objects aktiviert ist
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';

