-- Vollständiger Test: Prüft ob Anja Zugang zu ALLEN ihren Ressourcen hat
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe Zugangs-Status (WICHTIGSTE PRÜFUNG)
SELECT 
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    EXTRACT(EPOCH FROM (ua.access_expires_at - NOW())) / 86400 as days_remaining,
    CASE 
        WHEN ua.status = 'active' AND (ua.access_expires_at IS NULL OR ua.access_expires_at > NOW()) 
        THEN '✓ AKTIV - Zugang gewährt'
        ELSE '✗ ABGELAUFEN - Paywall sollte erscheinen'
    END as access_status,
    -- WICHTIG: Diese Funktion wird von der App verwendet
    public.has_active_access(u.id) as has_active_access_result
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

-- 2. Prüfe Zugriff auf jede einzelne Ressource
-- Simuliert die canAccessResource-Funktion
SELECT 
    ss.id as resource_id,
    ss.title,
    ss.created_at,
    CASE 
        WHEN ss.created_at = (SELECT MIN(created_at) FROM public.saved_stories WHERE user_id = ss.user_id)
        THEN 'Erste Ressource'
        ELSE 'Weitere Ressource'
    END as resource_type,
    -- Prüfe ob User aktiven Zugang hat (das ist der entscheidende Check)
    (
        SELECT public.has_active_access(ss.user_id)
    ) as has_active_access,
    -- Ergebnis: Wenn has_active_access = TRUE, dann kann User auf ALLE Ressourcen zugreifen
    CASE 
        WHEN (SELECT public.has_active_access(ss.user_id)) = TRUE 
        THEN '✓ ZUGRIFF GEWÄHRT - Audio kann abgespielt werden'
        ELSE '✗ ZUGRIFF VERWEIGERT - Paywall erscheint'
    END as access_result
FROM public.saved_stories ss
JOIN auth.users u ON ss.user_id = u.id
WHERE u.email = 'anja.musica@web.de'
ORDER BY ss.created_at ASC;

-- 3. Zusammenfassung
SELECT 
    'ZUSAMMENFASSUNG' as info,
    COUNT(*) as total_resources,
    COUNT(CASE WHEN (SELECT public.has_active_access(ss.user_id)) = TRUE THEN 1 END) as resources_with_access,
    COUNT(CASE WHEN (SELECT public.has_active_access(ss.user_id)) = FALSE THEN 1 END) as resources_without_access,
    CASE 
        WHEN (SELECT public.has_active_access(u.id) FROM auth.users u WHERE u.email = 'anja.musica@web.de') = TRUE
        THEN '✓ Anja kann auf ALLE Ressourcen zugreifen (2 Wochen)'
        ELSE '✗ Anja hat KEINEN Zugang - Paywall erscheint'
    END as final_result
FROM public.saved_stories ss
JOIN auth.users u ON ss.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

