-- Lösche alte Registrierungsversuche für Tests
-- Führe dies in Supabase SQL Editor aus, um alle Registrierungsversuche zu löschen

-- WICHTIG: Dies löscht ALLE Registrierungsversuche!
-- Verwende dies nur für Tests, nicht in Produktion!

-- Lösche alle Registrierungsversuche
DELETE FROM public.registration_attempts;

-- Oder: Lösche nur Registrierungsversuche älter als 1 Stunde
-- DELETE FROM public.registration_attempts WHERE created_at < NOW() - INTERVAL '1 hour';

-- Oder: Lösche nur Registrierungsversuche von einer bestimmten IP
-- Ersetze 'DEINE_IP_ADRESSE' mit deiner IP-Adresse
-- DELETE FROM public.registration_attempts WHERE ip_address = 'DEINE_IP_ADRESSE'::INET;

COMMENT ON TABLE public.registration_attempts IS 'Trackt Registrierungsversuche pro IP-Adresse zur Multi-Account-Prävention';

