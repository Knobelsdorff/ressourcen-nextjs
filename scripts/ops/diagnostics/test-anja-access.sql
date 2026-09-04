-- Test-Skript: Prüft ob Anja Zugang zu ihren Ressourcen hat
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe Anjas Zugang-Status
SELECT 
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    EXTRACT(EPOCH FROM (ua.access_expires_at - NOW())) / 86400 as days_remaining,
    CASE 
        WHEN ua.status = 'active' AND (ua.access_expires_at IS NULL OR ua.access_expires_at > NOW()) 
        THEN '✓ AKTIV'
        ELSE '✗ ABGELAUFEN'
    END as access_status,
    -- Prüfe ob has_active_access Funktion TRUE zurückgibt
    public.has_active_access(u.id) as has_active_access_result
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

-- 2. Zähle Anjas Ressourcen
SELECT 
    COUNT(*) as total_resources,
    STRING_AGG(id::TEXT, ', ') as resource_ids,
    MIN(created_at) as erste_ressource,
    MAX(created_at) as letzte_ressource
FROM public.saved_stories
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'anja.musica@web.de'
);

-- 3. Prüfe ob can_create_resource funktioniert
SELECT 
    u.email,
    public.can_create_resource(u.id) as can_create_resource_result,
    (SELECT COUNT(*) FROM public.saved_stories WHERE user_id = u.id) as existing_resources
FROM auth.users u
WHERE u.email = 'anja.musica@web.de';

-- 4. Zeige alle Ressourcen von Anja
SELECT 
    ss.id,
    ss.title,
    ss.created_at,
    ss.audio_url,
    CASE 
        WHEN ss.created_at = (SELECT MIN(created_at) FROM public.saved_stories WHERE user_id = ss.user_id)
        THEN 'Erste Ressource'
        ELSE 'Weitere Ressource'
    END as resource_type
FROM public.saved_stories ss
JOIN auth.users u ON ss.user_id = u.id
WHERE u.email = 'anja.musica@web.de'
ORDER BY ss.created_at ASC;

