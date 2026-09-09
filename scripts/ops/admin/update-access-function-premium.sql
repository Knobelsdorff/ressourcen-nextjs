-- Erweitert die create_access_after_payment Funktion für Premium (mehr Ressourcen, längerer Zugang)
-- Führe dieses Skript im Supabase SQL Editor aus

CREATE OR REPLACE FUNCTION public.create_access_after_payment(
    user_uuid UUID,
    payment_intent_id TEXT,
    checkout_session_id TEXT,
    plan_type TEXT DEFAULT 'standard' -- 'standard' oder 'premium'
)
RETURNS UUID AS $$
DECLARE
    access_id UUID;
    existing_resources INTEGER;
    final_plan_type TEXT;
    resources_limit INTEGER;
    access_duration INTERVAL;
BEGIN
    -- Setze final_plan_type basierend auf Parameter
    final_plan_type := plan_type;
    
    -- Validiere plan_type
    IF final_plan_type NOT IN ('standard', 'premium', '3-months') THEN
        final_plan_type := 'standard'; -- Fallback auf standard
    END IF;
    
    -- Konvertiere '3-months' zu 'standard' für Rückwärtskompatibilität
    IF final_plan_type = '3-months' THEN
        final_plan_type := 'standard';
    END IF;
    
    -- Setze resources_limit und access_duration basierend auf plan_type
    IF final_plan_type = 'premium' THEN
        resources_limit := 5; -- Premium: 5 Ressourcen
        access_duration := INTERVAL '6 months'; -- Premium: 6 Monate
    ELSE
        resources_limit := 3; -- Standard: 3 Ressourcen
        access_duration := INTERVAL '3 months'; -- Standard: 3 Monate
    END IF;
    
    -- Zähle bereits erstellte Ressourcen (1. ist gratis, daher ab 1 zählen)
    SELECT COUNT(*) INTO existing_resources
    FROM public.saved_stories
    WHERE user_id = user_uuid;
    
    INSERT INTO public.user_access (
        user_id,
        plan_type,
        resources_created,
        resources_limit,
        access_starts_at,
        access_expires_at,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        status
    )
    VALUES (
        user_uuid,
        final_plan_type,
        GREATEST(0, existing_resources - 1), -- 1. war gratis, daher -1
        resources_limit, -- Dynamisch basierend auf plan_type
        NOW(),
        NOW() + access_duration, -- Dynamisch basierend auf plan_type
        payment_intent_id,
        checkout_session_id,
        'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_type = final_plan_type,
        resources_created = GREATEST(0, existing_resources - 1), -- 1. war gratis
        resources_limit = resources_limit, -- Aktualisiere Limit
        access_starts_at = NOW(),
        access_expires_at = NOW() + access_duration, -- Aktualisiere Dauer
        stripe_payment_intent_id = payment_intent_id,
        stripe_checkout_session_id = checkout_session_id,
        status = 'active',
        updated_at = NOW()
    RETURNING id INTO access_id;
    
    RETURN access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aktualisiere Permissions
GRANT EXECUTE ON FUNCTION public.create_access_after_payment(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

