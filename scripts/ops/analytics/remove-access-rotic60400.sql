-- Entfernt Zugang für rotic60400@limtu.com
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Finde User-ID für rotic60400@limtu.com
DO $$
DECLARE
    target_user_id UUID;
    access_record_id UUID;
BEGIN
    -- Finde User-ID anhand der Email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'rotic60400@limtu.com';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User mit Email rotic60400@limtu.com nicht gefunden';
    END IF;
    
    RAISE NOTICE 'User-ID gefunden: %', target_user_id;
    
    -- 2. Lösche oder deaktiviere den Zugang
    -- Option A: Lösche den Zugang komplett
    DELETE FROM public.user_access
    WHERE user_id = target_user_id;
    
    -- Option B: Deaktiviere den Zugang (falls du ihn behalten willst für Logs)
    -- UPDATE public.user_access
    -- SET 
    --     status = 'cancelled',
    --     access_expires_at = NOW() - INTERVAL '1 day',
    --     updated_at = NOW()
    -- WHERE user_id = target_user_id;
    
    RAISE NOTICE 'Zugang für User % entfernt', target_user_id;
    
    -- 3. Prüfe ob Zugang wirklich entfernt wurde
    SELECT id INTO access_record_id
    FROM public.user_access
    WHERE user_id = target_user_id;
    
    IF access_record_id IS NULL THEN
        RAISE NOTICE '✅ Zugang erfolgreich entfernt';
    ELSE
        RAISE WARNING '⚠️ Zugang wurde nicht entfernt (ID: %)', access_record_id;
    END IF;
END $$;

-- 4. Zeige alle verbleibenden Zugänge für diesen User (sollte leer sein)
SELECT 
    ua.id,
    ua.user_id,
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    ua.created_at
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'rotic60400@limtu.com';

