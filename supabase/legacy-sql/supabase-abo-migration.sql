-- Migration: Monatliches Abo-System (39€/Monat)
-- Führe dieses Skript in der Supabase SQL Editor aus
-- 
-- Änderungen:
-- 1. Nur noch Abo-System (kein 5er-Paket mehr)
-- 2. KI-generierte Ressourcen benötigen Abo (außer erste Ressource: 3 Tage gratis)
-- 3. Audio-Ressourcen sind immer zugänglich (später: Google Calendar Integration)

-- 1. Erweitere user_access Tabelle für Abos
ALTER TABLE public.user_access 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- Index für Subscription-ID
CREATE INDEX IF NOT EXISTS idx_user_access_subscription_id 
ON public.user_access(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- 2. Neue Funktion: Kann KI-Ressource erstellen (nur für KI-generierte Ressourcen)
-- Regel: Erste KI-Ressource ist gratis (3 Tage Trial), ab 2. benötigt Abo
CREATE OR REPLACE FUNCTION public.can_create_ai_resource(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    ai_resource_count INTEGER;
BEGIN
    -- Zähle nur KI-generierte Ressourcen (ignoriere Audio-only)
    SELECT COUNT(*) INTO ai_resource_count
    FROM public.saved_stories
    WHERE user_id = user_uuid
    AND (is_audio_only IS NULL OR is_audio_only = false);
    
    -- Erste KI-Ressource ist gratis
    IF ai_resource_count = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Ab 2. KI-Ressource: Prüfe aktives Abo
    RETURN EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
        AND subscription_status = 'active' -- Nur aktive Abos
        AND (access_expires_at IS NULL OR access_expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Neue Funktion: Kann Audio-Ressource abspielen
-- Für jetzt: Audio-Ressourcen sind immer zugänglich
-- Später: Hier Google Calendar Check einbauen
CREATE OR REPLACE FUNCTION public.can_access_audio_resource(user_uuid UUID, resource_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    resource_exists BOOLEAN;
    is_audio_only_flag BOOLEAN;
BEGIN
    -- Prüfe ob Ressource existiert und dem User gehört
    SELECT EXISTS (
        SELECT 1 FROM public.saved_stories
        WHERE id = resource_id
        AND user_id = user_uuid
    ) INTO resource_exists;
    
    IF NOT resource_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Prüfe ob es eine Audio-only Ressource ist
    SELECT is_audio_only INTO is_audio_only_flag
    FROM public.saved_stories
    WHERE id = resource_id;
    
    -- Nur Audio-only Ressourcen durch diese Funktion prüfen
    IF is_audio_only_flag = true THEN
        -- Für jetzt: Audio-Ressourcen sind immer zugänglich
        -- Später: Google Calendar Check hier einbauen
        RETURN TRUE;
    END IF;
    
    -- Für KI-generierte Ressourcen: false zurückgeben (wird anders geprüft)
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Aktualisiere has_active_access für Abos
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
        AND subscription_status = 'active' -- Nur aktive Abos
        AND (access_expires_at IS NULL OR access_expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Neue Funktion: Erstelle Abo-Zugang nach Subscription
CREATE OR REPLACE FUNCTION public.create_subscription_access(
    user_uuid UUID,
    subscription_id TEXT,
    checkout_session_id TEXT
)
RETURNS UUID AS $$
DECLARE
    access_id UUID;
BEGIN
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
        status
    )
    VALUES (
        user_uuid,
        'subscription',
        0, -- Abo hat kein Ressourcen-Limit (wird nicht verwendet)
        999999, -- Unbegrenzt (symbolisch)
        NOW(),
        NULL, -- Kein Ablaufdatum (läuft solange Abo aktiv)
        subscription_id,
        checkout_session_id,
        'active',
        'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_type = 'subscription',
        stripe_subscription_id = subscription_id,
        stripe_checkout_session_id = checkout_session_id,
        subscription_status = 'active',
        status = 'active',
        access_starts_at = NOW(),
        access_expires_at = NULL,
        updated_at = NOW()
    RETURNING id INTO access_id;
    
    RETURN access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Aktualisiere can_create_resource Funktion (Legacy, für Kompatibilität)
-- Diese Funktion wird weiterhin verwendet, prüft aber jetzt nur KI-Ressourcen
CREATE OR REPLACE FUNCTION public.can_create_resource(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verwende die neue Funktion für KI-Ressourcen
    RETURN public.can_create_ai_resource(user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Kommentare hinzufügen
COMMENT ON FUNCTION public.can_create_ai_resource(UUID) IS 'Prüft ob User KI-generierte Ressource erstellen kann. Erste Ressource gratis (3 Tage Trial), ab 2. benötigt aktives Abo.';
COMMENT ON FUNCTION public.can_access_audio_resource(UUID, UUID) IS 'Prüft ob User Audio-Ressource abspielen kann. Für jetzt: Immer true. Später: Google Calendar Integration.';
COMMENT ON FUNCTION public.create_subscription_access(UUID, TEXT, TEXT) IS 'Erstellt/aktualisiert Abo-Zugang nach erfolgreicher Stripe Subscription.';
COMMENT ON COLUMN public.user_access.stripe_subscription_id IS 'Stripe Subscription ID für monatliches Abo';
COMMENT ON COLUMN public.user_access.subscription_status IS 'Status der Stripe Subscription: active, canceled, past_due, etc.';

-- Fertig! ✅
-- Nächste Schritte:
-- 1. Stripe Product & Price für 39€/Monat erstellen
-- 2. Checkout API auf Subscription-Modus umstellen
-- 3. Webhook-Handler für Subscription-Events erweitern

