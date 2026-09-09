-- Multi-Account-Prävention: Rate-Limiting und IP-Tracking
-- Führe dies in Supabase SQL Editor aus

-- 1. Tabelle für IP-Tracking bei Registrierungen
CREATE TABLE IF NOT EXISTS public.registration_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    email TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Index für schnelle Abfragen
    CONSTRAINT registration_attempts_ip_email_key UNIQUE (ip_address, email, created_at)
);

-- Index für schnelle Abfragen nach IP und Zeit
CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip_created 
    ON public.registration_attempts(ip_address, created_at DESC);

-- Index für Abfragen nach Email
CREATE INDEX IF NOT EXISTS idx_registration_attempts_email 
    ON public.registration_attempts(email);

-- 2. Funktion: Prüft ob IP zu viele Registrierungen hat
-- Maximal 2 erfolgreiche Registrierungen pro IP pro 24 Stunden
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
    
    -- Maximal 2 Registrierungen pro IP pro 24h
    RETURN registration_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Funktion: Prüft ob Email-Domain blockiert ist
CREATE OR REPLACE FUNCTION public.is_email_domain_blocked(email_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    email_domain TEXT;
    blocked_domains TEXT[] := ARRAY[
        '10minutemail.com',
        'guerrillamail.com',
        'tempmail.com',
        'temp-mail.org',
        'mailinator.com',
        'throwaway.email',
        'getnada.com',
        'maildrop.cc',
        'mohmal.com',
        'yopmail.com',
        'mailnesia.com',
        'meltmail.com',
        'dispostable.com',
        'trashmail.com',
        'sharklasers.com',
        'grr.la',
        'spamgourmet.com',
        'emailondeck.com',
        'fakemail.net',
        'mintemail.com',
        'mytrashmail.com',
        'tempail.com',
        'tempmailo.com',
        'tmpmail.org',
        'mailcatch.com',
        'spambox.us',
        'throwaway.email',
        'getairmail.com',
        'mailinater.com',
        'tempr.email',
        'burnermail.io',
        'mail.tm',
        'inboxkitten.com',
        'tempmail.net',
        'mail.tm',
        'tempmail.plus',
        'tempmailaddress.com',
        'tempinbox.co.uk',
        'temp-mail.io',
        'tempail.com',
        'tempr.email',
        'tmail.ws',
        'maildrop.cc',
        'mohmal.com',
        'yopmail.com',
        'mailnesia.com'
    ];
BEGIN
    -- Extrahiere Domain aus Email
    email_domain := LOWER(SPLIT_PART(email_text, '@', 2));
    
    -- Prüfe ob Domain in der Block-Liste ist
    RETURN email_domain = ANY(blocked_domains);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies für registration_attempts
ALTER TABLE public.registration_attempts ENABLE ROW LEVEL SECURITY;

-- Service Role kann alles (für Backend)
CREATE POLICY "Service role can manage registration_attempts"
    ON public.registration_attempts
    FOR ALL
    USING (auth.role() = 'service_role');

-- 5. Trigger: Automatisch Registrierungsversuch loggen (optional)
-- Wird über API-Endpunkt gemacht, aber hier für Vollständigkeit
CREATE OR REPLACE FUNCTION public.log_registration_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Diese Funktion wird von der API aufgerufen, nicht als Trigger
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kommentare
COMMENT ON TABLE public.registration_attempts IS 'Trackt Registrierungsversuche pro IP-Adresse zur Multi-Account-Prävention';
COMMENT ON FUNCTION public.can_register_from_ip IS 'Prüft ob eine IP-Adresse noch weitere Registrierungen durchführen darf (Max 2 pro 24h)';
COMMENT ON FUNCTION public.is_email_domain_blocked IS 'Prüft ob eine Email-Domain blockiert ist (Temp-Mail-Dienste)';

