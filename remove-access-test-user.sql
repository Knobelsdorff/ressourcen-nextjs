-- Entfernt Zugang für Test-User mewax28983@fandoe.com
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe aktuellen Zugang
SELECT 
    u.email,
    ua.id,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    EXTRACT(EPOCH FROM (ua.access_expires_at - NOW())) / 86400 as days_remaining,
    public.has_active_access(u.id) as has_active_access_result
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email = 'mewax28983@fandoe.com';

-- 2. Entferne Zugang (löscht den Eintrag)
DELETE FROM public.user_access
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'mewax28983@fandoe.com'
);

-- 3. Verifiziere, dass Zugang entfernt wurde
SELECT 
    u.email,
    ua.id,
    ua.plan_type,
    ua.status,
    public.has_active_access(u.id) as has_active_access_result,
    CASE 
        WHEN public.has_active_access(u.id) = TRUE 
        THEN '✗ FEHLER: Zugang sollte entfernt sein, ist aber noch aktiv!'
        ELSE '✓ Zugang erfolgreich entfernt - Paywall sollte erscheinen'
    END as verification_status
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email = 'mewax28983@fandoe.com';

-- 4. Prüfe Anzahl der Ressourcen des Test-Users
SELECT 
    u.email,
    COUNT(ss.id) as total_resources,
    MIN(ss.created_at) as first_resource_date,
    MAX(ss.created_at) as last_resource_date
FROM auth.users u
LEFT JOIN public.saved_stories ss ON ss.user_id = u.id
WHERE u.email = 'mewax28983@fandoe.com'
GROUP BY u.email;

