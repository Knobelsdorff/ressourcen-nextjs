-- Prüf-Skript: Verifiziert ob Anja Zugang hat
-- Email: anja.musica@web.de
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe User-Existenz
SELECT 
    id,
    email,
    created_at as user_created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'anja.musica@web.de';

-- 2. Prüfe user_access Eintrag
SELECT 
    ua.id,
    ua.user_id,
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    ua.resources_limit,
    ua.resources_created,
    ua.created_at,
    ua.updated_at,
    -- Berechne verbleibende Tage
    EXTRACT(EPOCH FROM (ua.access_expires_at - NOW())) / 86400 as days_remaining,
    -- Prüfe ob Zugang noch aktiv ist
    CASE 
        WHEN ua.status = 'active' AND (ua.access_expires_at IS NULL OR ua.access_expires_at > NOW()) 
        THEN '✓ AKTIV'
        ELSE '✗ ABGELAUFEN'
    END as access_status
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

-- 3. Zähle Ressourcen (korrigiert: ss.created_at statt created_at)
SELECT 
    COUNT(*) as total_resources,
    MIN(ss.created_at) as erste_ressource_erstellt_am,
    MAX(ss.created_at) as letzte_ressource_erstellt_am
FROM public.saved_stories ss
JOIN auth.users u ON ss.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

-- 4. Prüfe ob has_active_access Funktion korrekt funktioniert
SELECT 
    u.id as user_id,
    u.email,
    public.has_active_access(u.id) as has_active_access_result
FROM auth.users u
WHERE u.email = 'anja.musica@web.de';

