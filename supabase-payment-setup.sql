-- Payment & Access Setup für Ressourcen App
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Erstelle die user_access Tabelle für Zugänge/Subscriptions
CREATE TABLE IF NOT EXISTS public.user_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan_type TEXT NOT NULL DEFAULT '3-months',
    resources_created INTEGER NOT NULL DEFAULT 0,
    resources_limit INTEGER NOT NULL DEFAULT 3,
    access_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_expires_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT,
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aktiviere RLS
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

-- 3. Lösche bestehende Policies
DROP POLICY IF EXISTS "Users can view their own access" ON public.user_access;
DROP POLICY IF EXISTS "Users can update their own access" ON public.user_access;
DROP POLICY IF EXISTS "Users can insert their own access" ON public.user_access;

-- 4. Erstelle Policies
CREATE POLICY "Users can view their own access" ON public.user_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own access" ON public.user_access
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access" ON public.user_access
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Index für Performance
CREATE INDEX IF NOT EXISTS idx_user_access_user_id ON public.user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_expires_at ON public.user_access(access_expires_at);
CREATE INDEX IF NOT EXISTS idx_user_access_status ON public.user_access(status);

-- 6. Funktion: Prüft ob User Zugang hat
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
        AND (access_expires_at IS NULL OR access_expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Funktion: Prüft ob User noch Ressourcen erstellen kann
-- Regel: 1. Ressource ist GRATIS, ab der 2. Ressource benötigt man Zugang
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
    
    -- Ab der 2. Ressource: Prüfe IMMER Zugang (keine 3-Tage-Regel mehr)
    RETURN EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
        AND (access_expires_at IS NULL OR access_expires_at > NOW())
        AND resources_created < resources_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Funktion: Erhöht Ressourcen-Zähler
CREATE OR REPLACE FUNCTION public.increment_resource_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE public.user_access
    SET resources_created = resources_created + 1,
        updated_at = NOW()
    WHERE user_id = user_uuid
    AND status = 'active'
    AND (access_expires_at IS NULL OR access_expires_at > NOW())
    AND resources_created < resources_limit
    RETURNING resources_created INTO new_count;
    
    RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Funktion: Erstellt Zugang nach erfolgreicher Zahlung
CREATE OR REPLACE FUNCTION public.create_access_after_payment(
    user_uuid UUID,
    payment_intent_id TEXT,
    checkout_session_id TEXT
)
RETURNS UUID AS $$
DECLARE
    access_id UUID;
    existing_resources INTEGER;
BEGIN
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
        '3-months',
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
        plan_type = '3-months',
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

-- 10. Grant permissions
GRANT ALL ON public.user_access TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_resource(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_resource_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_access_after_payment(UUID, TEXT, TEXT) TO anon, authenticated;

-- 11. Kommentare
COMMENT ON TABLE public.user_access IS 'Benutzerzugänge und Subscription-Status';
COMMENT ON FUNCTION public.has_active_access(UUID) IS 'Prüft ob User aktiven Zugang hat';
COMMENT ON FUNCTION public.can_create_resource(UUID) IS 'Prüft ob User noch Ressourcen erstellen kann';
COMMENT ON FUNCTION public.increment_resource_count(UUID) IS 'Erhöht Ressourcen-Zähler nach Erstellung';
COMMENT ON FUNCTION public.create_access_after_payment(UUID, TEXT, TEXT) IS 'Erstellt/aktualisiert Zugang nach erfolgreicher Zahlung';

