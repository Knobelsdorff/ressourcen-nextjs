-- Abo-Zugang für lizknobelsdorff@gmx.de freischalten
-- Erstellt unbegrenzten Zugang wie ein Abo-User

-- 1. Finde User-ID
DO $$
DECLARE
    liz_user_id UUID;
BEGIN
    -- Suche nach User mit Email
    SELECT id INTO liz_user_id
    FROM auth.users
    WHERE email = 'lizknobelsdorff@gmx.de';
    
    -- Falls User nicht existiert, gebe Warnung aus
    IF liz_user_id IS NULL THEN
        RAISE NOTICE 'User mit Email lizknobelsdorff@gmx.de nicht gefunden. Bitte stelle sicher, dass der User sich bereits registriert hat.';
        RETURN;
    END IF;
    
    -- 2. Erstelle/aktualisiere Zugang mit Abo-Status
    INSERT INTO public.user_access (
        user_id,
        plan_type,
        resources_created,
        resources_limit,
        access_starts_at,
        access_expires_at,
        stripe_subscription_id,
        stripe_checkout_session_id,
        subscription_status,
        status,
        created_at,
        updated_at
    ) VALUES (
        liz_user_id,
        'subscription', -- Behandelt wie ein Abo
        0, -- Noch keine Ressourcen erstellt
        999999, -- Unbegrenzte Ressourcen
        NOW(), -- Startet jetzt
        NULL, -- Kein Ablaufdatum (unbegrenzt)
        'sub_manual_lizknobelsdorff', -- Manuelle Subscription-ID
        'cs_manual_lizknobelsdorff', -- Manuelle Session-ID
        'active', -- Subscription-Status: aktiv
        'active', -- Status: aktiv
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_type = 'subscription',
        subscription_status = 'active',
        status = 'active',
        access_starts_at = NOW(),
        access_expires_at = NULL,
        stripe_subscription_id = 'sub_manual_lizknobelsdorff',
        stripe_checkout_session_id = 'cs_manual_lizknobelsdorff',
        updated_at = NOW();
    
    RAISE NOTICE 'Zugang für lizknobelsdorff@gmx.de erfolgreich erstellt/aktualisiert!';
    RAISE NOTICE 'User-ID: %', liz_user_id;
    RAISE NOTICE 'Plan: subscription (unbegrenzte Ressourcen)';
    RAISE NOTICE 'Status: active';
END $$;

-- 3. Prüfe ob Zugang erstellt wurde
SELECT 
    ua.id,
    ua.user_id,
    u.email,
    ua.plan_type,
    ua.resources_limit,
    ua.resources_created,
    ua.status,
    ua.subscription_status,
    ua.stripe_subscription_id,
    ua.access_expires_at,
    ua.created_at,
    public.has_active_access(ua.user_id) as has_active_access_result
FROM public.user_access ua
JOIN auth.users u ON u.id = ua.user_id
WHERE u.email = 'lizknobelsdorff@gmx.de';


