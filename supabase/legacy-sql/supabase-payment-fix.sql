-- Fix: Aktualisiere Ressourcen-Logik
-- Regel: 
-- - 1. Ressource ist GRATIS (kann immer erstellt werden)
-- - Audio der 1. Ressource ist 3 Tage kostenlos verfügbar
-- - Ab der 2. Ressource benötigt man IMMER Zugang (Paywall)

-- Aktualisiere can_create_resource Funktion
-- Regel: 1. Ressource ist GRATIS, ab der 2. Ressource benötigt man IMMER Zugang
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

