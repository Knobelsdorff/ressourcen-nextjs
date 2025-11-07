-- Entfernt ALLE Analytics-Einträge von temp-mail.org Usern (ALLE Varianten)
-- Führe dieses Skript im Supabase SQL Editor aus

-- WICHTIG: Dieses Script deckt ALLE möglichen Varianten von temp-mail.org ab
-- Es verwendet sowohl LIKE als auch exakte Domain-Prüfung (case-insensitive)

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
    -- Alle temp-mail.org Varianten (case-insensitive mit LIKE)
    LOWER(u.email) LIKE '%@temp-mail.org' OR
    LOWER(u.email) LIKE '%@tempmail.org' OR
    LOWER(u.email) LIKE '%@temp-mail.com' OR
    LOWER(u.email) LIKE '%@tempmail.com' OR
    -- Exakte Domain-Prüfung (case-insensitive)
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
    -- Generische Patterns (falls es noch andere Varianten gibt)
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%temp-mail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%'
GROUP BY u.id, u.email, u.created_at
ORDER BY analytics_count DESC, u.created_at DESC;

-- 2. Lösche ALLE Analytics-Einträge von temp-mail.org Usern
-- WICHTIG: Dies löscht wirklich ALLE Einträge, auch neu erstellte
DELETE FROM public.user_analytics
WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    WHERE 
        -- Alle temp-mail.org Varianten (case-insensitive mit LIKE)
        LOWER(u.email) LIKE '%@temp-mail.org' OR
        LOWER(u.email) LIKE '%@tempmail.org' OR
        LOWER(u.email) LIKE '%@temp-mail.com' OR
        LOWER(u.email) LIKE '%@tempmail.com' OR
        -- Exakte Domain-Prüfung (case-insensitive)
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.org' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.org' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'temp-mail.com' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) = 'tempmail.com' OR
        -- Generische Patterns (falls es noch andere Varianten gibt)
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
    -- Alle temp-mail.org Varianten (case-insensitive mit LIKE)
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
HAVING COUNT(ua.id) > 0
ORDER BY analytics_count DESC
LIMIT 50;

-- 5. Zeige alle temp-mail.org User (auch ohne Analytics-Einträge)
-- Diese User existieren noch in auth.users, haben aber keine Analytics-Einträge mehr
SELECT 
    u.id,
    u.email,
    u.created_at,
    'User existiert noch, aber keine Analytics-Einträge' as status
FROM auth.users u
WHERE 
    -- Alle temp-mail.org Varianten (case-insensitive mit LIKE)
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

