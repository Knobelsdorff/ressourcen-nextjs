-- Prüfe ob es Events für "Drache" gibt
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Suche nach allen Events für "Drache"
SELECT 
    ua.id,
    ua.event_type,
    ua.resource_figure_name,
    ua.story_id,
    u.email as user_email,
    ua.created_at,
    CASE 
        WHEN ua.story_id IS NOT NULL THEN '✓ Story ID vorhanden'
        ELSE '✗ Keine Story ID'
    END as story_status
FROM public.user_analytics ua
LEFT JOIN auth.users u ON ua.user_id = u.id
WHERE 
    ua.resource_figure_name ILIKE '%Drache%' OR
    ua.resource_figure_name = 'Drache'
ORDER BY ua.created_at DESC
LIMIT 20;

-- 2. Prüfe ob es ein resource_created Event für "Drache" gibt
SELECT 
    ua.id,
    ua.event_type,
    ua.resource_figure_name,
    ua.story_id,
    u.email as user_email,
    ua.created_at,
    CASE 
        WHEN ua.story_id IS NOT NULL THEN '✓ Story ID vorhanden'
        ELSE '✗ Keine Story ID'
    END as story_status
FROM public.user_analytics ua
LEFT JOIN auth.users u ON ua.user_id = u.id
WHERE 
    ua.event_type = 'resource_created' AND
    (ua.resource_figure_name ILIKE '%Drache%' OR
     ua.resource_figure_name = 'Drache')
ORDER BY ua.created_at DESC;

-- 3. Prüfe alle resource_created Events von sabelleka@gmail.com
SELECT 
    ua.id,
    ua.event_type,
    ua.resource_figure_name,
    ua.story_id,
    ua.created_at,
    CASE 
        WHEN ua.story_id IS NOT NULL THEN '✓ Story ID vorhanden'
        ELSE '✗ Keine Story ID'
    END as story_status
FROM public.user_analytics ua
LEFT JOIN auth.users u ON ua.user_id = u.id
WHERE 
    u.email = 'sabelleka@gmail.com' AND
    ua.event_type = 'resource_created'
ORDER BY ua.created_at DESC;

-- 4. Prüfe ob die Story ID von "Drache" (d32821cf-89de-40ca-b13d-dc0063258ad4) in Analytics vorkommt
SELECT 
    ua.id,
    ua.event_type,
    ua.resource_figure_name,
    ua.story_id,
    u.email as user_email,
    ua.created_at
FROM public.user_analytics ua
LEFT JOIN auth.users u ON ua.user_id = u.id
WHERE 
    ua.story_id = 'd32821cf-89de-40ca-b13d-dc0063258ad4'
ORDER BY ua.created_at DESC;


