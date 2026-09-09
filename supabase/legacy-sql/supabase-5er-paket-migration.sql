-- Migration: 5er-Paket System (50€, kein Zeitlimit)
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Aktualisiere create_access_after_payment Funktion für 5er-Paket
CREATE OR REPLACE FUNCTION public.create_access_after_payment(
    user_uuid UUID,
    payment_intent_id TEXT,
    checkout_session_id TEXT,
    plan_type TEXT DEFAULT '5-pack'
)
RETURNS UUID AS $$
DECLARE
    access_id UUID;
    existing_resources INTEGER;
    resources_limit_val INTEGER;
    has_existing_access BOOLEAN;
    is_first_purchase BOOLEAN;
BEGIN
    -- Zähle bereits erstellte Ressourcen
    SELECT COUNT(*) INTO existing_resources
    FROM public.saved_stories
    WHERE user_id = user_uuid;
    
    -- Prüfe ob User bereits ein Paket gekauft hat (hat bereits einen Zugang)
    SELECT EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
    ) INTO has_existing_access;
    
    -- Erstes Paket: User hat noch kein aktives Paket gekauft
    -- Zweites+ Paket: User hat bereits ein Paket gekauft
    is_first_purchase := NOT has_existing_access;
    
    -- Bestimme resources_limit basierend auf plan_type und ob es das erste Paket ist
    -- Erstes Paket: 4 weitere Ressourcen (nach der ersten kostenlosen) = insgesamt 5 Ressourcen
    -- Zweites+ Paket: 5 Ressourcen (alle müssen bezahlt werden)
    IF plan_type = '5-pack' THEN
        IF is_first_purchase THEN
            resources_limit_val := 4; -- Erstes Paket: 4 weitere Ressourcen nach der ersten kostenlosen
        ELSE
            resources_limit_val := 5; -- Zweites+ Paket: 5 Ressourcen (alle müssen bezahlt werden)
        END IF;
    ELSIF plan_type = 'premium' THEN
        IF is_first_purchase THEN
            resources_limit_val := 4; -- Premium erstes Paket: 4 weitere Ressourcen
        ELSE
            resources_limit_val := 5; -- Premium zweites+ Paket: 5 Ressourcen
        END IF;
    ELSE
        resources_limit_val := 3; -- Fallback auf 3
    END IF;
    
    -- Berechne resources_created:
    -- - Erstes Paket: Erste Ressource war gratis → resources_created = existing_resources - 1
    -- - Zweites+ Paket: Keine gratis Ressource mehr → resources_created = existing_resources
    INSERT INTO public.user_access (
        user_id,
        plan_type,
        resources_created,
        resources_limit,
        access_starts_at,
        access_expires_at, -- NULL = kein Zeitlimit
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        status
    )
    VALUES (
        user_uuid,
        plan_type,
        CASE 
            WHEN is_first_purchase THEN GREATEST(0, existing_resources - 1) -- Erstes Paket: erste Ressource war gratis
            ELSE existing_resources -- Zweites+ Paket: alle Ressourcen müssen bezahlt werden
        END,
        resources_limit_val,
        NOW(),
        NULL, -- Kein Zeitlimit für 5er-Paket
        payment_intent_id,
        checkout_session_id,
        'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_type = plan_type,
        resources_created = CASE 
            WHEN is_first_purchase THEN GREATEST(0, existing_resources - 1) -- Erstes Paket: erste Ressource war gratis
            ELSE existing_resources -- Zweites+ Paket: alle Ressourcen müssen bezahlt werden
        END,
        resources_limit = resources_limit_val,
        access_starts_at = NOW(),
        access_expires_at = NULL, -- Kein Zeitlimit
        stripe_payment_intent_id = payment_intent_id,
        stripe_checkout_session_id = checkout_session_id,
        status = 'active',
        updated_at = NOW()
    RETURNING id INTO access_id;
    
    RETURN access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Aktualisiere can_create_resource Funktion
-- Regel: 1. Ressource ist GRATIS (3 Tage Trial), ab der 2. Ressource benötigt man 5er-Paket
CREATE OR REPLACE FUNCTION public.can_create_resource(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    resource_count INTEGER;
BEGIN
    -- Zähle bereits erstellte Ressourcen
    SELECT COUNT(*) INTO resource_count
    FROM public.saved_stories
    WHERE user_id = user_uuid;
    
    -- 1. Ressource ist gratis (resource_count = 0)
    IF resource_count = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Ab der 2. Ressource: Prüfe ob User aktiven Zugang hat UND noch Ressourcen übrig hat
    RETURN EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
        AND (access_expires_at IS NULL OR access_expires_at > NOW()) -- NULL = kein Zeitlimit
        AND resources_created < resources_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aktualisiere has_active_access Funktion
-- Prüft ob User aktiven Zugang hat (auch ohne Zeitlimit)
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
        AND (access_expires_at IS NULL OR access_expires_at > NOW()) -- NULL = kein Zeitlimit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Kommentare aktualisieren
COMMENT ON FUNCTION public.create_access_after_payment(UUID, TEXT, TEXT, TEXT) IS 'Erstellt/aktualisiert Zugang nach erfolgreicher Zahlung. Erstes Paket: 4 weitere Ressourcen (insgesamt 5 mit der ersten kostenlosen). Zweites+ Paket: 5 Ressourcen (alle müssen bezahlt werden, keine gratis Ressource mehr). Kein Zeitlimit.';
COMMENT ON FUNCTION public.can_create_resource(UUID) IS 'Prüft ob User noch Ressourcen erstellen kann. 1. Ressource gratis (3 Tage Trial), ab 2. benötigt 5er-Paket (4 weitere Ressourcen).';
COMMENT ON FUNCTION public.has_active_access(UUID) IS 'Prüft ob User aktiven Zugang hat. Unterstützt auch Zugänge ohne Zeitlimit (NULL).';
