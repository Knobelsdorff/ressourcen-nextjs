-- Temporäres Test-Modus: Erhöhtes Rate-Limit für Tests
-- Führe dies in Supabase SQL Editor aus, wenn du Tests durchführen möchtest

-- Option 1: Erhöhe das Limit temporär auf 10 Registrierungen pro 24h
CREATE OR REPLACE FUNCTION public.can_register_from_ip(ip_address_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    registration_count INTEGER;
BEGIN
    -- Zähle erfolgreiche Registrierungen in den letzten 24 Stunden
    SELECT COUNT(*) INTO registration_count
    FROM public.registration_attempts
    WHERE ip_address = ip_address_text::INET
    AND success = TRUE
    AND created_at > NOW() - INTERVAL '24 hours';
    
    -- TEST-MODUS: Maximal 10 Registrierungen pro IP pro 24h (statt 2)
    -- Für Produktion: Zurück auf 2 ändern
    RETURN registration_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_register_from_ip IS 'TEST-MODUS: Erlaubt 10 Registrierungen pro IP pro 24h. Für Produktion auf 2 zurücksetzen!';

