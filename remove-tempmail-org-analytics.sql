-- Entfernt alle Analytics-Einträge von temp-mail.org Usern
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Zeige zuerst, welche temp-mail.org User gefunden werden
SELECT 
    u.id,
    u.email,
    COUNT(ua.id) as analytics_count
FROM auth.users u
LEFT JOIN public.user_analytics ua ON ua.user_id = u.id
WHERE 
    -- temp-mail.org Varianten
    u.email LIKE '%@temp-mail.org' OR
    u.email LIKE '%@tempmail.org' OR
    u.email LIKE '%@temp-mail.com' OR
    u.email LIKE '%@tempmail.com' OR
    -- Weitere bekannte Varianten
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
    -- Generische Patterns
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
GROUP BY u.id, u.email
ORDER BY analytics_count DESC;

-- 2. Lösche alle Analytics-Einträge von temp-mail.org Usern
DELETE FROM public.user_analytics
WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    WHERE 
        -- temp-mail.org Varianten
        u.email LIKE '%@temp-mail.org' OR
        u.email LIKE '%@tempmail.org' OR
        u.email LIKE '%@temp-mail.com' OR
        u.email LIKE '%@tempmail.com' OR
        -- Weitere bekannte Varianten
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
        -- Generische Patterns
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
);

-- 3. Zeige Zusammenfassung der gelöschten Einträge
SELECT 
    'Analytics-Einträge gelöscht' as action,
    COUNT(*) as deleted_count
FROM public.user_analytics
WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    WHERE 
        -- temp-mail.org Varianten
        u.email LIKE '%@temp-mail.org' OR
        u.email LIKE '%@tempmail.org' OR
        u.email LIKE '%@temp-mail.com' OR
        u.email LIKE '%@tempmail.com' OR
        -- Weitere bekannte Varianten
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
        -- Generische Patterns
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
);

-- 4. Prüfe verbleibende Analytics-Einträge
SELECT 
    COUNT(*) as total_analytics_events,
    COUNT(DISTINCT user_id) as unique_users
FROM public.user_analytics;

-- 5. Zeige alle temp-mail.org User (für Referenz)
SELECT 
    u.id,
    u.email,
    u.created_at,
    COUNT(ua.id) as remaining_analytics_count
FROM auth.users u
LEFT JOIN public.user_analytics ua ON ua.user_id = u.id
WHERE 
    -- temp-mail.org Varianten
    u.email LIKE '%@temp-mail.org' OR
    u.email LIKE '%@tempmail.org' OR
    u.email LIKE '%@temp-mail.com' OR
    u.email LIKE '%@tempmail.com' OR
    -- Weitere bekannte Varianten
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
    -- Generische Patterns
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
GROUP BY u.id, u.email, u.created_at
ORDER BY u.created_at DESC;

