-- Cleanup: Lösche Analytics-Einträge von bestimmten E-Mail-Adressen
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Lösche alle Analytics-Einträge von:
--    - andreas@knobelsdorff-therapie.de
--    - evilmuelli@gmx.de
--    - heilung@knobelsdorff-therapie
--    - Alle @limtu.com Adressen
--    - Alle @temp-mail.org Adressen (und ähnliche temp-mail Domains)

DELETE FROM public.user_analytics
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email IN (
    'andreas@knobelsdorff-therapie.de',
    'evilmuelli@gmx.de',
    'heilung@knobelsdorff-therapie'
  )
  OR email LIKE '%@limtu.com'
  OR email LIKE '%@temp-mail.org'
  OR email LIKE '%@tempmail.com'
  OR email LIKE '%@guerrillamail.com'
  OR email LIKE '%@mailinator.com'
  OR email LIKE '%@10minutemail.com'
  OR email LIKE '%@throwaway.email'
  OR email LIKE '%@disposable.email'
  OR email LIKE '%@fakeinbox.com'
  OR email LIKE '%@mohmal.com'
  OR email LIKE '%@yopmail.com'
  OR email LIKE '%@maildrop.cc'
  OR email LIKE '%@getnada.com'
  OR email LIKE '%@mintemail.com'
  OR email LIKE '%@sharklasers.com'
  OR email LIKE '%@spamgourmet.com'
  OR email LIKE '%@trashmail.com'
  OR email LIKE '%@tempinbox.com'
  OR email LIKE '%@mytrashmail.com'
);

-- 2. Zeige Anzahl gelöschter Einträge
SELECT 
  COUNT(*) as deleted_count,
  'Analytics-Einträge gelöscht' as message
FROM public.user_analytics
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email IN (
    'andreas@knobelsdorff-therapie.de',
    'evilmuelli@gmx.de',
    'heilung@knobelsdorff-therapie'
  )
  OR email LIKE '%@limtu.com'
  OR email LIKE '%@temp-mail.org'
  OR email LIKE '%@tempmail.com'
  OR email LIKE '%@guerrillamail.com'
  OR email LIKE '%@mailinator.com'
  OR email LIKE '%@10minutemail.com'
  OR email LIKE '%@throwaway.email'
  OR email LIKE '%@disposable.email'
  OR email LIKE '%@fakeinbox.com'
  OR email LIKE '%@mohmal.com'
  OR email LIKE '%@yopmail.com'
  OR email LIKE '%@maildrop.cc'
  OR email LIKE '%@getnada.com'
  OR email LIKE '%@mintemail.com'
  OR email LIKE '%@sharklasers.com'
  OR email LIKE '%@spamgourmet.com'
  OR email LIKE '%@trashmail.com'
  OR email LIKE '%@tempinbox.com'
  OR email LIKE '%@mytrashmail.com'
);

-- 3. Zeige betroffene User (für Referenz)
SELECT 
  u.id,
  u.email,
  COUNT(ua.id) as analytics_count
FROM auth.users u
LEFT JOIN public.user_analytics ua ON ua.user_id = u.id
WHERE u.email IN (
  'andreas@knobelsdorff-therapie.de',
  'evilmuelli@gmx.de',
  'heilung@knobelsdorff-therapie'
)
OR u.email LIKE '%@limtu.com'
OR u.email LIKE '%@temp-mail.org'
OR u.email LIKE '%@tempmail.com'
OR u.email LIKE '%@guerrillamail.com'
OR u.email LIKE '%@mailinator.com'
OR u.email LIKE '%@10minutemail.com'
OR u.email LIKE '%@throwaway.email'
OR u.email LIKE '%@disposable.email'
OR u.email LIKE '%@fakeinbox.com'
OR u.email LIKE '%@mohmal.com'
OR u.email LIKE '%@yopmail.com'
OR u.email LIKE '%@maildrop.cc'
OR u.email LIKE '%@getnada.com'
OR u.email LIKE '%@mintemail.com'
OR u.email LIKE '%@sharklasers.com'
OR u.email LIKE '%@spamgourmet.com'
OR u.email LIKE '%@trashmail.com'
OR u.email LIKE '%@tempinbox.com'
OR u.email LIKE '%@mytrashmail.com'
GROUP BY u.id, u.email
ORDER BY analytics_count DESC;

