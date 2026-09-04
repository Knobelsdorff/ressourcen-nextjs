-- Entfernt Zugang für rotic60400@limtu.com
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Zeige zuerst den User und seinen Zugang (zur Kontrolle)
SELECT 
    u.id as user_id,
    u.email,
    ua.id as access_id,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email = 'rotic60400@limtu.com';

-- 2. Lösche den Zugang für rotic60400@limtu.com
DELETE FROM public.user_access
WHERE user_id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'rotic60400@limtu.com'
);

-- 3. Prüfe ob Zugang wirklich entfernt wurde (sollte keine Zeilen zurückgeben)
SELECT 
    ua.id,
    ua.user_id,
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    ua.created_at
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'rotic60400@limtu.com';

