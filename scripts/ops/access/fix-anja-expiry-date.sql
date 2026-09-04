-- Korrigiert Anjas Ablaufdatum: 2 Wochen statt 3 Monate
-- Führe dieses Skript in der Supabase SQL Editor aus

UPDATE public.user_access
SET 
  access_expires_at = NOW() + INTERVAL '2 weeks',  -- 2 Wochen ab jetzt
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
    -- Berechne verbleibende Tage
    EXTRACT(EPOCH FROM (ua.access_expires_at - NOW())) / 86400 as days_remaining,
    CASE 
        WHEN ua.plan_type = 'standard' THEN '✓ Standard (keine Downloads)'
        WHEN ua.plan_type = 'premium' THEN '✗ Premium (sollte Standard sein)'
        ELSE 'Unbekannt: ' || ua.plan_type
    END as plan_description
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'anja.musica@web.de';

