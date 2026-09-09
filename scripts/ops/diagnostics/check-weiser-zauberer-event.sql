-- Prüfe ob es ein Analytics-Event für "Weiser Zauberer" gibt
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Suche nach Events mit "Weiser Zauberer"
SELECT 
    ua.id,
    ua.event_type,
    ua.resource_figure_name,
    ua.story_id,
    ua.user_id,
    u.email as user_email,
    ua.created_at,
    CASE 
        WHEN ua.story_id IS NOT NULL THEN '✓ Story ID vorhanden'
        ELSE '✗ Keine Story ID'
    END as story_status
FROM public.user_analytics ua
LEFT JOIN auth.users u ON ua.user_id = u.id
WHERE 
    ua.resource_figure_name ILIKE '%Weiser%' OR
    ua.resource_figure_name ILIKE '%Zauberer%' OR
    ua.resource_figure_name = 'Weiser Zauberer'
ORDER BY ua.created_at DESC
LIMIT 20;

-- 2. Prüfe ob die Story ID existiert (falls vorhanden)
-- Führe diese Abfrage aus, wenn oben eine story_id gefunden wurde
-- Ersetze 'STORY_ID_HIER' mit der tatsächlichen Story ID

/*
SELECT 
    ss.id,
    ss.title,
    ss.resource_figure,
    ss.created_at,
    u.email as user_email
FROM public.saved_stories ss
LEFT JOIN auth.users u ON ss.user_id = u.id
WHERE ss.id = 'STORY_ID_HIER';
*/

-- 3. Zeige alle Events von sabelleka@gmail.com
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
WHERE u.email = 'sabelleka@gmail.com'
ORDER BY ua.created_at DESC
LIMIT 50;


