-- Entfernt alle Analytics-Einträge von fandoe.com und limtu.com Usern
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Zeige zuerst, welche fandoe.com und limtu.com User gefunden werden
SELECT 
    u.id,
    u.email,
    u.created_at,
    COUNT(ua.id) as analytics_count,
    STRING_AGG(DISTINCT ua.event_type, ', ') as event_types
FROM auth.users u
LEFT JOIN public.user_analytics ua ON ua.user_id = u.id
WHERE 
    -- fandoe.com Varianten
    LOWER(u.email) LIKE '%@fandoe.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'fandoe.com' OR
    -- limtu.com Varianten
    LOWER(u.email) LIKE '%@limtu.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'limtu.com'
GROUP BY u.id, u.email, u.created_at
ORDER BY analytics_count DESC, u.created_at DESC;

-- 2. Lösche alle Analytics-Einträge von fandoe.com und limtu.com Usern
DELETE FROM public.user_analytics
WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    WHERE 
        -- fandoe.com Varianten
        LOWER(u.email) LIKE '%@fandoe.com' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'fandoe.com' OR
        -- limtu.com Varianten
        LOWER(u.email) LIKE '%@limtu.com' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'limtu.com'
);

-- 3. Prüfe ob noch Analytics-Einträge von fandoe.com/limtu.com Usern existieren
-- (Dies sollte 0 sein, wenn alles gelöscht wurde)
SELECT 
    COUNT(*) as remaining_analytics_from_test_users,
    STRING_AGG(DISTINCT u.email, ', ') as remaining_user_emails
FROM public.user_analytics ua
JOIN auth.users u ON ua.user_id = u.id
WHERE 
    -- fandoe.com Varianten
    LOWER(u.email) LIKE '%@fandoe.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'fandoe.com' OR
    -- limtu.com Varianten
    LOWER(u.email) LIKE '%@limtu.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'limtu.com';

-- 4. Zeige alle verbleibenden User-Emails in Analytics (zur Kontrolle)
-- Diese sollten KEINE fandoe.com oder limtu.com mehr enthalten
SELECT DISTINCT
    u.email,
    COUNT(ua.id) as analytics_count
FROM public.user_analytics ua
JOIN auth.users u ON ua.user_id = u.id
GROUP BY u.email
HAVING COUNT(ua.id) > 0
ORDER BY analytics_count DESC
LIMIT 50;

-- 5. Zeige alle fandoe.com und limtu.com User (auch ohne Analytics-Einträge)
-- Diese User existieren noch in auth.users, haben aber keine Analytics-Einträge mehr
SELECT 
    u.id,
    u.email,
    u.created_at,
    'User existiert noch, aber keine Analytics-Einträge' as status
FROM auth.users u
WHERE 
    -- fandoe.com Varianten
    LOWER(u.email) LIKE '%@fandoe.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'fandoe.com' OR
    -- limtu.com Varianten
    LOWER(u.email) LIKE '%@limtu.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'limtu.com'
ORDER BY u.created_at DESC;

