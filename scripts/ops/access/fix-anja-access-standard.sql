-- Korrigiert Anjas Zugang: Setzt auf Standard-Plan (nicht Premium)
-- Führe dieses Skript in der Supabase SQL Editor aus

UPDATE public.user_access
SET 
  plan_type = 'standard',  -- Standard-Plan (keine Downloads)
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'anja.musica@web.de'
);

-- Verifiziere die Änderung
SELECT 
    ua.id,
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    CASE 
        WHEN ua.plan_type = 'premium' THEN '✗ Premium (sollte Standard sein)'
        WHEN ua.plan_type = 'standard' THEN '✓ Standard (korrekt - keine Downloads)'
        ELSE 'Unbekannt: ' || ua.plan_type
    END as plan_description
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

