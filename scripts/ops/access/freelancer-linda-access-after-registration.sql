-- Freelancer-Zugang für lindaromanova@outlook.de
-- Führe dieses Skript AUS, NACHDEM Linda sich registriert hat
-- Falls das erste Skript bereits ausgeführt wurde, ist das kein Problem - dieses Skript aktualisiert/erstellt den Zugang

-- 1. Finde User-ID
DO $$
DECLARE
    linda_user_id UUID;
BEGIN
    -- Suche nach User mit Email
    SELECT id INTO linda_user_id
    FROM auth.users
    WHERE email = 'lindaromanova@outlook.de';
    
    -- Falls User nicht existiert, gebe Warnung aus
    IF linda_user_id IS NULL THEN
        RAISE NOTICE '⚠️ User mit Email lindaromanova@outlook.de nicht gefunden.';
        RAISE NOTICE 'Bitte stelle sicher, dass Linda sich bereits registriert hat.';
        RAISE NOTICE 'Falls sie sich gerade registriert hat, warte 1-2 Minuten und führe das Skript erneut aus.';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ User gefunden: %', linda_user_id;
    
    -- 2. Lösche bestehenden Zugang (falls vorhanden)
    DELETE FROM public.user_access
    WHERE user_id = linda_user_id;
    
    RAISE NOTICE '✅ Bestehende Zugänge gelöscht (falls vorhanden)';
    
    -- 3. Erstelle neuen Zugang mit unbegrenzten Ressourcen
    INSERT INTO public.user_access (
        user_id,
        plan_type,
        resources_created,
        resources_limit,
        access_starts_at,
        access_expires_at,
        status,
        created_at,
        updated_at
    ) VALUES (
        linda_user_id,
        'subscription', -- Behandelt wie ein Abo
        0, -- Noch keine Ressourcen erstellt
        999999, -- Unbegrenzte Ressourcen
        NOW(), -- Startet jetzt
        NULL, -- Kein Ablaufdatum (unbegrenzt)
        'active', -- Aktiv
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Zugang für lindaromanova@outlook.de erfolgreich erstellt!';
    RAISE NOTICE 'Plan: subscription (unbegrenzte Ressourcen)';
    RAISE NOTICE 'Status: active';
END $$;

-- 4. Prüfe ob Zugang erstellt wurde
SELECT 
    ua.id,
    ua.user_id,
    u.email,
    ua.plan_type,
    ua.resources_limit,
    ua.resources_created,
    ua.status,
    ua.access_expires_at,
    ua.created_at,
    CASE 
        WHEN ua.access_expires_at IS NULL THEN 'Unbegrenzt'
        ELSE ua.access_expires_at::text
    END as expires_info
FROM public.user_access ua
JOIN auth.users u ON u.id = ua.user_id
WHERE u.email = 'lindaromanova@outlook.de';

