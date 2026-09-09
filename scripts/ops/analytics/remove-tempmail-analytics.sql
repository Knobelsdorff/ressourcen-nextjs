-- Entfernt alle Analytics-Einträge von Temp-Mail-Usern
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Zeige zuerst, welche Temp-Mail-User gefunden werden
SELECT 
    u.id,
    u.email,
    COUNT(ua.id) as analytics_count
FROM auth.users u
LEFT JOIN public.user_analytics ua ON ua.user_id = u.id
WHERE 
    -- Bekannte Temp-Mail-Domains
    u.email LIKE '%@10minutemail.com' OR
    u.email LIKE '%@guerrillamail.com' OR
    u.email LIKE '%@tempmail.com' OR
    u.email LIKE '%@temp-mail.org' OR
    u.email LIKE '%@mailinator.com' OR
    u.email LIKE '%@throwaway.email' OR
    u.email LIKE '%@getnada.com' OR
    u.email LIKE '%@maildrop.cc' OR
    u.email LIKE '%@mohmal.com' OR
    u.email LIKE '%@yopmail.com' OR
    u.email LIKE '%@mailnesia.com' OR
    u.email LIKE '%@meltmail.com' OR
    u.email LIKE '%@dispostable.com' OR
    u.email LIKE '%@trashmail.com' OR
    u.email LIKE '%@sharklasers.com' OR
    u.email LIKE '%@grr.la' OR
    u.email LIKE '%@spamgourmet.com' OR
    u.email LIKE '%@emailondeck.com' OR
    u.email LIKE '%@fakemail.net' OR
    u.email LIKE '%@mintemail.com' OR
    u.email LIKE '%@mytrashmail.com' OR
    u.email LIKE '%@tempail.com' OR
    u.email LIKE '%@tempmailo.com' OR
    u.email LIKE '%@tmpmail.org' OR
    u.email LIKE '%@mailcatch.com' OR
    u.email LIKE '%@spambox.us' OR
    u.email LIKE '%@getairmail.com' OR
    u.email LIKE '%@mailinater.com' OR
    u.email LIKE '%@tempr.email' OR
    u.email LIKE '%@burnermail.io' OR
    u.email LIKE '%@mail.tm' OR
    u.email LIKE '%@inboxkitten.com' OR
    u.email LIKE '%@tempmail.net' OR
    u.email LIKE '%@tempmail.plus' OR
    u.email LIKE '%@tempmailaddress.com' OR
    u.email LIKE '%@tempinbox.co.uk' OR
    u.email LIKE '%@temp-mail.io' OR
    u.email LIKE '%@tmail.ws' OR
    -- Generische Temp-Mail-Patterns
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'temp%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'fake%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'trash%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'throwaway%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'disposable%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'spam%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tmpmail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'mohmal%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'yopmail%' OR
    LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%mail.tm'
GROUP BY u.id, u.email
ORDER BY analytics_count DESC;

-- 2. Lösche alle Analytics-Einträge von Temp-Mail-Usern
DELETE FROM public.user_analytics
WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    WHERE 
        -- Bekannte Temp-Mail-Domains
        u.email LIKE '%@10minutemail.com' OR
        u.email LIKE '%@guerrillamail.com' OR
        u.email LIKE '%@tempmail.com' OR
        u.email LIKE '%@temp-mail.org' OR
        u.email LIKE '%@mailinator.com' OR
        u.email LIKE '%@throwaway.email' OR
        u.email LIKE '%@getnada.com' OR
        u.email LIKE '%@maildrop.cc' OR
        u.email LIKE '%@mohmal.com' OR
        u.email LIKE '%@yopmail.com' OR
        u.email LIKE '%@mailnesia.com' OR
        u.email LIKE '%@meltmail.com' OR
        u.email LIKE '%@dispostable.com' OR
        u.email LIKE '%@trashmail.com' OR
        u.email LIKE '%@sharklasers.com' OR
        u.email LIKE '%@grr.la' OR
        u.email LIKE '%@spamgourmet.com' OR
        u.email LIKE '%@emailondeck.com' OR
        u.email LIKE '%@fakemail.net' OR
        u.email LIKE '%@mintemail.com' OR
        u.email LIKE '%@mytrashmail.com' OR
        u.email LIKE '%@tempail.com' OR
        u.email LIKE '%@tempmailo.com' OR
        u.email LIKE '%@tmpmail.org' OR
        u.email LIKE '%@mailcatch.com' OR
        u.email LIKE '%@spambox.us' OR
        u.email LIKE '%@getairmail.com' OR
        u.email LIKE '%@mailinater.com' OR
        u.email LIKE '%@tempr.email' OR
        u.email LIKE '%@burnermail.io' OR
        u.email LIKE '%@mail.tm' OR
        u.email LIKE '%@inboxkitten.com' OR
        u.email LIKE '%@tempmail.net' OR
        u.email LIKE '%@tempmail.plus' OR
        u.email LIKE '%@tempmailaddress.com' OR
        u.email LIKE '%@tempinbox.co.uk' OR
        u.email LIKE '%@temp-mail.io' OR
        u.email LIKE '%@tmail.ws' OR
        -- Generische Temp-Mail-Patterns
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'temp%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'fake%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'trash%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'throwaway%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'disposable%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'spam%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tmpmail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'mohmal%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'yopmail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%mail.tm'
);

-- 3. Zeige Zusammenfassung
SELECT 
    'Analytics-Einträge gelöscht' as action,
    COUNT(*) as deleted_count
FROM public.user_analytics
WHERE user_id IN (
    SELECT u.id
    FROM auth.users u
    WHERE 
        -- Bekannte Temp-Mail-Domains
        u.email LIKE '%@10minutemail.com' OR
        u.email LIKE '%@guerrillamail.com' OR
        u.email LIKE '%@tempmail.com' OR
        u.email LIKE '%@temp-mail.org' OR
        u.email LIKE '%@mailinator.com' OR
        u.email LIKE '%@throwaway.email' OR
        u.email LIKE '%@getnada.com' OR
        u.email LIKE '%@maildrop.cc' OR
        u.email LIKE '%@mohmal.com' OR
        u.email LIKE '%@yopmail.com' OR
        u.email LIKE '%@mailnesia.com' OR
        u.email LIKE '%@meltmail.com' OR
        u.email LIKE '%@dispostable.com' OR
        u.email LIKE '%@trashmail.com' OR
        u.email LIKE '%@sharklasers.com' OR
        u.email LIKE '%@grr.la' OR
        u.email LIKE '%@spamgourmet.com' OR
        u.email LIKE '%@emailondeck.com' OR
        u.email LIKE '%@fakemail.net' OR
        u.email LIKE '%@mintemail.com' OR
        u.email LIKE '%@mytrashmail.com' OR
        u.email LIKE '%@tempail.com' OR
        u.email LIKE '%@tempmailo.com' OR
        u.email LIKE '%@tmpmail.org' OR
        u.email LIKE '%@mailcatch.com' OR
        u.email LIKE '%@spambox.us' OR
        u.email LIKE '%@getairmail.com' OR
        u.email LIKE '%@mailinater.com' OR
        u.email LIKE '%@tempr.email' OR
        u.email LIKE '%@burnermail.io' OR
        u.email LIKE '%@mail.tm' OR
        u.email LIKE '%@inboxkitten.com' OR
        u.email LIKE '%@tempmail.net' OR
        u.email LIKE '%@tempmail.plus' OR
        u.email LIKE '%@tempmailaddress.com' OR
        u.email LIKE '%@tempinbox.co.uk' OR
        u.email LIKE '%@temp-mail.io' OR
        u.email LIKE '%@tmail.ws' OR
        -- Generische Temp-Mail-Patterns
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'temp%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'fake%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'trash%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'throwaway%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'disposable%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'spam%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tempmail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%tmpmail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'mohmal%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE 'yopmail%' OR
        LOWER(SPLIT_PART(u.email, '@', 2)) LIKE '%mail.tm'
);

-- 4. Prüfe verbleibende Analytics-Einträge
SELECT 
    COUNT(*) as total_analytics_events,
    COUNT(DISTINCT user_id) as unique_users
FROM public.user_analytics;

