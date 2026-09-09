-- Prüfe ob es ein resource_created Event für "Weiser Zauberer" gibt
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Suche nach resource_created Events für "Weiser Zauberer"
SELECT 
    ua.id,
    ua.event_type,
    ua.resource_figure_name,
    ua.story_id,
    u.email as user_email,
    ua.created_at,
    CASE 
        WHEN ua.story_id IS NOT NULL THEN '✓ Story ID vorhanden - Ressource sollte existieren'
        ELSE '✗ Keine Story ID - Ressource wurde nie gespeichert'
    END as status
FROM public.user_analytics ua
LEFT JOIN auth.users u ON ua.user_id = u.id
WHERE 
    ua.event_type = 'resource_created' AND
    (ua.resource_figure_name ILIKE '%Weiser%' OR
     ua.resource_figure_name ILIKE '%Zauberer%' OR
     ua.resource_figure_name = 'Weiser Zauberer')
ORDER BY ua.created_at DESC;

-- 2. Zeige alle resource_created Events von sabelleka@gmail.com
SELECT 
    ua.id,
    ua.event_type,
    ua.resource_figure_name,
    ua.story_id,
    ua.created_at,
    CASE 
        WHEN ua.story_id IS NOT NULL THEN '✓ Gespeichert'
        ELSE '✗ Nicht gespeichert'
    END as saved_status
FROM public.user_analytics ua
LEFT JOIN auth.users u ON ua.user_id = u.id
WHERE 
    u.email = 'sabelleka@gmail.com' AND
    ua.event_type = 'resource_created'
ORDER BY ua.created_at DESC;


