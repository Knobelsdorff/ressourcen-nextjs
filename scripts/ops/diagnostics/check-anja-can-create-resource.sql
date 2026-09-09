-- Prüft ob Anja weitere Ressourcen erstellen kann
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe Anjas Ressourcen-Status
SELECT 
    u.email,
    (SELECT COUNT(*) FROM public.saved_stories WHERE user_id = u.id) as total_resources,
    ua.resources_created,
    ua.resources_limit,
    ua.status,
    ua.access_expires_at,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.saved_stories WHERE user_id = u.id) = 0 
        THEN '✓ Kann erste Ressource erstellen (gratis)'
        WHEN ua.resources_created < ua.resources_limit 
             AND ua.status = 'active' 
             AND (ua.access_expires_at IS NULL OR ua.access_expires_at > NOW())
        THEN '✓ Kann weitere Ressourcen erstellen (hat Zugang und Limit nicht erreicht)'
        WHEN ua.resources_created >= ua.resources_limit
        THEN '✗ Limit erreicht - kann keine weiteren Ressourcen erstellen'
        ELSE '✗ Kein aktiver Zugang - Paywall erforderlich'
    END as can_create_result
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

-- 2. Prüfe direkt mit can_create_resource Funktion
SELECT 
    u.email,
    public.can_create_resource(u.id) as can_create_resource_result,
    CASE 
        WHEN public.can_create_resource(u.id) = TRUE 
        THEN '✓ Kann Ressourcen erstellen'
        ELSE '✗ Kann KEINE Ressourcen erstellen'
    END as result_description
FROM auth.users u
WHERE u.email = 'anja.musica@web.de';

-- 3. Zeige Anjas Ressourcen-Details
SELECT 
    ss.id,
    ss.title,
    ss.created_at,
    CASE 
        WHEN ss.created_at = (SELECT MIN(created_at) FROM public.saved_stories WHERE user_id = ss.user_id)
        THEN '1. Ressource (gratis)'
        ELSE 'Weitere Ressource (mit Zugang)'
    END as resource_type
FROM public.saved_stories ss
JOIN auth.users u ON ss.user_id = u.id
WHERE u.email = 'anja.musica@web.de'
ORDER BY ss.created_at ASC;

