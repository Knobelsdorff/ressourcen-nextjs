-- Entfernt ALLE Analytics-Einträge von temp-mail.org Usern (FINAL)
-- Führe dieses Skript im Supabase SQL Editor aus

-- WICHTIG: Dieses Script ist speziell für temp-mail.org erstellt
-- Es prüft ALLE Varianten und löscht wirklich ALLES

-- 1. Zeige ALLE temp-mail.org User mit ihren Analytics-Einträgen (VOR dem Löschen)
SELECT 
    u.id,
    u.email,
    u.created_at,
    COUNT(ua.id) as analytics_count,
    STRING_AGG(DISTINCT ua.event_type, ', ') as event_types
FROM auth.users u
LEFT JOIN public.user_analytics ua ON ua.user_id = u.id
WHERE 
    -- Alle temp-mail.org Varianten (case-insensitive)
    LOWER(u.email) LIKE '%@temp-mail.org' OR
    LOWER(u.email) LIKE '%@tempmail.org' OR
    LOWER(u.email) LIKE '%@temp-mail.com' OR
    LOWER(u.email) LIKE '%@tempmail.com' OR
    -- Exakte Domain-Prüfung (case-insensitive)
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
    -- Generische Patterns
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
GROUP BY u.id, u.email, u.created_at
ORDER BY analytics_count DESC, u.created_at DESC;

-- 2. Lösche ALLE Analytics-Einträge von temp-mail.org Usern
-- WICHTIG: Dies löscht wirklich ALLE Einträge
DELETE FROM public.user_analytics
WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    WHERE 
        -- Alle temp-mail.org Varianten (case-insensitive)
        LOWER(u.email) LIKE '%@temp-mail.org' OR
        LOWER(u.email) LIKE '%@tempmail.org' OR
        LOWER(u.email) LIKE '%@temp-mail.com' OR
        LOWER(u.email) LIKE '%@tempmail.com' OR
        -- Exakte Domain-Prüfung (case-insensitive)
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
        -- Generische Patterns
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
);

-- 3. Prüfe ob noch Analytics-Einträge von temp-mail.org Usern existieren
-- (Dies sollte 0 sein, wenn alles gelöscht wurde)
SELECT 
    COUNT(*) as remaining_analytics_from_tempmail,
    STRING_AGG(DISTINCT u.email, ', ') as remaining_user_emails
FROM public.user_analytics ua
JOIN auth.users u ON ua.user_id = u.id
WHERE 
    -- Alle temp-mail.org Varianten (case-insensitive)
    LOWER(u.email) LIKE '%@temp-mail.org' OR
    LOWER(u.email) LIKE '%@tempmail.org' OR
    LOWER(u.email) LIKE '%@temp-mail.com' OR
    LOWER(u.email) LIKE '%@tempmail.com' OR
    -- Exakte Domain-Prüfung (case-insensitive)
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
    -- Generische Patterns
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%';

-- 4. Zeige alle verbleibenden User-Emails in Analytics (zur Kontrolle)
-- Diese sollten KEINE temp-mail.org mehr enthalten
SELECT DISTINCT
    u.email,
    COUNT(ua.id) as analytics_count
FROM public.user_analytics ua
JOIN auth.users u ON ua.user_id = u.id
GROUP BY u.email
ORDER BY analytics_count DESC
LIMIT 50;

-- 5. Zeige alle temp-mail.org User (auch ohne Analytics-Einträge)
-- Diese User existieren noch, haben aber keine Analytics-Einträge mehr
SELECT 
    u.id,
    u.email,
    u.created_at,
    'User existiert noch, aber keine Analytics-Einträge' as status
FROM auth.users u
WHERE 
    -- Alle temp-mail.org Varianten (case-insensitive)
    LOWER(u.email) LIKE '%@temp-mail.org' OR
    LOWER(u.email) LIKE '%@tempmail.org' OR
    LOWER(u.email) LIKE '%@temp-mail.com' OR
    LOWER(u.email) LIKE '%@tempmail.com' OR
    -- Exakte Domain-Prüfung (case-insensitive)
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
    -- Generische Patterns
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
ORDER BY u.created_at DESC;

