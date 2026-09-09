-- Erweitert die create_access_after_payment Funktion um plan_type Parameter
-- Führe dieses Skript in der Supabase SQL Editor aus

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
    final_plan_type TEXT; -- Lokale Variable um Namenskonflikt zu vermeiden
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
        final_plan_type, -- Verwende lokale Variable statt Parameter
        GREATEST(0, existing_resources - 1), -- 1. war gratis, daher -1
        3,
        NOW(),
        NOW() + INTERVAL '3 months',
        payment_intent_id,
        checkout_session_id,
        'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_type = final_plan_type, -- Verwende lokale Variable statt Parameter
        resources_created = GREATEST(0, existing_resources - 1), -- 1. war gratis
        resources_limit = 3,
        access_starts_at = NOW(),
        access_expires_at = NOW() + INTERVAL '3 months',
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

