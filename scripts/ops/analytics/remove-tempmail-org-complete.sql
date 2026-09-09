-- Entfernt ALLE Analytics-Einträge von temp-mail.org Usern (komplett)
-- Führe dieses Skript im Supabase SQL Editor aus

-- WICHTIG: Dieses Script ist speziell für temp-mail.org erstellt
-- Es deckt alle Varianten ab: temp-mail.org, tempmail.org, temp-mail.com, etc.

-- 1. Zeige ALLE temp-mail.org User mit ihren Analytics-Einträgen
SELECT 
    u.id,
    u.email,
    u.created_at,
    COUNT(ua.id) as analytics_count,
    STRING_AGG(DISTINCT ua.event_type, ', ') as event_types
FROM auth.users u
LEFT JOIN public.user_analytics ua ON ua.user_id = u.id
WHERE 
    -- Alle temp-mail.org Varianten
    u.email LIKE '%@temp-mail.org' OR
    u.email LIKE '%@tempmail.org' OR
    u.email LIKE '%@temp-mail.com' OR
    u.email LIKE '%@tempmail.com' OR
    -- Case-insensitive Prüfung
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com'
    -- Generische Patterns für temp-mail
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
GROUP BY u.id, u.email, u.created_at
ORDER BY analytics_count DESC, u.created_at DESC;

-- 2. Lösche ALLE Analytics-Einträge von temp-mail.org Usern
-- WICHTIG: Dies löscht wirklich ALLE Einträge, auch wenn sie nach dem ersten Script erstellt wurden
DELETE FROM public.user_analytics
WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    WHERE 
        -- Alle temp-mail.org Varianten
        u.email LIKE '%@temp-mail.org' OR
        u.email LIKE '%@tempmail.org' OR
        u.email LIKE '%@temp-mail.com' OR
        u.email LIKE '%@tempmail.com' OR
        -- Case-insensitive Prüfung
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com'
        -- Generische Patterns für temp-mail
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
);

-- 3. Zeige wie viele Einträge gelöscht wurden
-- (Dies sollte 0 sein, wenn alles gelöscht wurde)
SELECT 
    COUNT(*) as remaining_analytics_from_tempmail
FROM public.user_analytics ua
JOIN auth.users u ON ua.user_id = u.id
WHERE 
    -- Alle temp-mail.org Varianten
    u.email LIKE '%@temp-mail.org' OR
    u.email LIKE '%@tempmail.org' OR
    u.email LIKE '%@temp-mail.com' OR
    u.email LIKE '%@tempmail.com' OR
    -- Case-insensitive Prüfung
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com'
    -- Generische Patterns für temp-mail
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%';

-- 4. Prüfe verbleibende Analytics-Einträge (sollten keine temp-mail.org mehr sein)
SELECT 
    COUNT(*) as total_analytics_events,
    COUNT(DISTINCT user_id) as unique_users
FROM public.user_analytics;

-- 5. Zeige alle verbleibenden User-Emails in Analytics (zur Kontrolle)
SELECT DISTINCT
    u.email,
    COUNT(ua.id) as analytics_count
FROM public.user_analytics ua
JOIN auth.users u ON ua.user_id = u.id
GROUP BY u.email
ORDER BY analytics_count DESC
LIMIT 50;

