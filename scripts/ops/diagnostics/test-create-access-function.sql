-- Test-Skript: Prüft ob create_access_after_payment Funktion korrekt funktioniert
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe ob Funktion existiert und Parameter akzeptiert
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as function_arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_access_after_payment';

-- 2. Test mit Standard-Plan (simuliert Zahlung)
-- WICHTIG: Ersetze USER_UUID mit einer Test-User-ID oder verwende Anjas User-ID
DO $$
DECLARE
    test_user_id UUID := '4f9163e4-4b73-4ff0-bf23-d14a75ff4da7'; -- Anjas User-ID
    test_payment_intent TEXT := 'test_payment_intent_' || gen_random_uuid()::TEXT;
    test_session_id TEXT := 'test_session_' || gen_random_uuid()::TEXT;
    result_access_id UUID;
    access_record RECORD;
BEGIN
    RAISE NOTICE '=== Test 1: Standard-Plan ===';
    
    -- Rufe Funktion mit Standard-Plan auf
    SELECT public.create_access_after_payment(
        test_user_id,
        test_payment_intent,
        test_session_id,
        'standard' -- plan_type
    ) INTO result_access_id;
    
    RAISE NOTICE 'Access ID erstellt: %', result_access_id;
    
    -- Prüfe ob Zugang korrekt erstellt wurde
    SELECT * INTO access_record
    FROM public.user_access
    WHERE id = result_access_id;
    
    IF FOUND THEN
        RAISE NOTICE '✓ Zugang gefunden:';
        RAISE NOTICE '  - plan_type: %', access_record.plan_type;
        RAISE NOTICE '  - status: %', access_record.status;
        RAISE NOTICE '  - access_expires_at: %', access_record.access_expires_at;
        
        IF access_record.plan_type = 'standard' THEN
            RAISE NOTICE '✓ Standard-Plan korrekt gesetzt';
        ELSE
            RAISE WARNING '✗ Standard-Plan NICHT korrekt (ist: %)', access_record.plan_type;
        END IF;
    ELSE
        RAISE WARNING '✗ Zugang nicht gefunden!';
    END IF;
END $$;

-- 3. Test mit Premium-Plan
DO $$
DECLARE
    test_user_id UUID := '4f9163e4-4b73-4ff0-bf23-d14a75ff4da7'; -- Anjas User-ID
    test_payment_intent TEXT := 'test_payment_intent_premium_' || gen_random_uuid()::TEXT;
    test_session_id TEXT := 'test_session_premium_' || gen_random_uuid()::TEXT;
    result_access_id UUID;
    access_record RECORD;
BEGIN
    RAISE NOTICE '=== Test 2: Premium-Plan ===';
    
    -- Rufe Funktion mit Premium-Plan auf
    SELECT public.create_access_after_payment(
        test_user_id,
        test_payment_intent,
        test_session_id,
        'premium' -- plan_type
    ) INTO result_access_id;
    
    RAISE NOTICE 'Access ID erstellt: %', result_access_id;
    
    -- Prüfe ob Zugang korrekt erstellt wurde
    SELECT * INTO access_record
    FROM public.user_access
    WHERE id = result_access_id;
    
    IF FOUND THEN
        RAISE NOTICE '✓ Zugang gefunden:';
        RAISE NOTICE '  - plan_type: %', access_record.plan_type;
        RAISE NOTICE '  - status: %', access_record.status;
        RAISE NOTICE '  - access_expires_at: %', access_record.access_expires_at;
        
        IF access_record.plan_type = 'premium' THEN
            RAISE NOTICE '✓ Premium-Plan korrekt gesetzt';
        ELSE
            RAISE WARNING '✗ Premium-Plan NICHT korrekt (ist: %)', access_record.plan_type;
        END IF;
    ELSE
        RAISE WARNING '✗ Zugang nicht gefunden!';
    END IF;
END $$;

-- 4. Prüfe aktuellen Zugang von Anja
SELECT 
    ua.id,
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    ua.resources_limit,
    ua.resources_created,
    CASE 
        WHEN ua.plan_type = 'premium' THEN '✓ Premium (mit Downloads)'
        WHEN ua.plan_type = 'standard' THEN 'Standard (keine Downloads)'
        ELSE 'Unbekannt: ' || ua.plan_type
    END as plan_description
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

