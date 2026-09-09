-- Prüfe Storage-Policies für background-music Bucket
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe ob Storage-Policies existieren
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%music%'
ORDER BY policyname;

-- 2. Prüfe ob music_admins Tabelle existiert und Daten enthält
SELECT 
  email,
  admin_type,
  created_at
FROM public.music_admins
ORDER BY admin_type, email;

-- 3. Prüfe ob der aktuelle User (andreas@knobelsdorff-therapie.de) in der Tabelle ist
SELECT 
  'andreas@knobelsdorff-therapie.de' as email_to_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.music_admins 
      WHERE LOWER(email) = LOWER('andreas@knobelsdorff-therapie.de')
    ) THEN '✅ Gefunden'
    ELSE '❌ Nicht gefunden'
  END as status;

-- 4. Test: Prüfe ob die Policy-Logik funktioniert
-- (Simuliert die Prüfung, die die Storage-Policy macht)
SELECT 
  au.email as user_email,
  ma.email as admin_email,
  ma.admin_type,
  CASE 
    WHEN LOWER(au.email) = LOWER(ma.email) THEN '✅ Match'
    ELSE '❌ Kein Match'
  END as match_status
FROM auth.users au
CROSS JOIN public.music_admins ma
WHERE au.email = 'andreas@knobelsdorff-therapie.de';

-- 5. Prüfe ob der background-music Bucket existiert
SELECT 
  name,
  id,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'background-music';

