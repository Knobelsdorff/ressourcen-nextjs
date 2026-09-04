-- Debug: Prüft warum Test-User keinen Zugang hat
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe Zugang direkt
SELECT 
    u.email,
    u.id as user_id,
    ua.plan_type,
    ua.status,
    ua.access_expires_at,
    NOW() as current_time,
    ua.access_expires_at > NOW() as expires_in_future,
    public.has_active_access(u.id) as has_active_access_result,
    CASE 
        WHEN public.has_active_access(u.id) = TRUE 
        THEN '✓ Zugang aktiv'
        ELSE '✗ Kein Zugang'
    END as access_status
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email = 'mewax28983@fandoe.com';

-- 2. Prüfe ob user_access Eintrag existiert
SELECT 
    ua.*,
    u.email
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'mewax28983@fandoe.com';

-- 3. Prüfe Ressourcen des Test-Users
SELECT 
    ss.id,
    ss.title,
    ss.created_at,
    CASE 
        WHEN ss.created_at = (SELECT MIN(created_at) FROM public.saved_stories WHERE user_id = ss.user_id)
        THEN 'Erste Ressource'
        ELSE 'Weitere Ressource'
    END as resource_type
FROM public.saved_stories ss
JOIN auth.users u ON ss.user_id = u.id
WHERE u.email = 'mewax28983@fandoe.com'
ORDER BY ss.created_at ASC;

