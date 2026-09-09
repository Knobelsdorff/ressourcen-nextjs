-- Grace Period für Anja: 2 Wochen kostenloser Zugang
-- Email: anja.musica@web.de
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe ob User existiert und zeige Info
DO $$
DECLARE
    user_record RECORD;
    resource_count INTEGER;
BEGIN
    -- Finde User
    SELECT id, email, created_at 
    INTO user_record
    FROM auth.users 
    WHERE email = 'anja.musica@web.de';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User mit Email anja.musica@web.de nicht gefunden!';
    END IF;
    
    -- Zähle Ressourcen
    SELECT COUNT(*) INTO resource_count
    FROM public.saved_stories
    WHERE user_id = user_record.id;
    
    RAISE NOTICE 'User gefunden: % (ID: %)', user_record.email, user_record.id;
    RAISE NOTICE 'Anzahl Ressourcen: %', resource_count;
END $$;

-- 2. Erstelle/aktualisiere user_access für Anja
-- Gewährt 2 Wochen kostenlosen Zugang zu allen Ressourcen (Standard-Plan, keine Downloads)
INSERT INTO public.user_access (
  user_id,
  plan_type,
  resources_created,
  resources_limit,
  access_starts_at,
  access_expires_at,
  status,
  stripe_payment_intent_id,
  stripe_checkout_session_id
)
SELECT 
  u.id,
  'standard',  -- Standard-Plan (keine Downloads), nicht Premium
  GREATEST(0, (SELECT COUNT(*) FROM public.saved_stories WHERE user_id = u.id) - 1),
  3,
  NOW(),
  NOW() + INTERVAL '2 weeks',  -- 2 Wochen kostenlos
  'active',
  'grace_period_anja',  -- Markierung für Grace Period
  'grace_period_anja'
FROM auth.users u
WHERE u.email = 'anja.musica@web.de'
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_type = 'standard',  -- Standard-Plan (keine Downloads)
  status = 'active',
  access_expires_at = NOW() + INTERVAL '2 weeks',  -- Verlängere auf 2 Wochen
  access_starts_at = NOW(),
  resources_limit = 3,
  resources_created = GREATEST(0, (SELECT COUNT(*) FROM public.saved_stories WHERE user_id = EXCLUDED.user_id) - 1),
  updated_at = NOW();

-- 3. Zeige Bestätigung
DO $$
DECLARE
    access_record RECORD;
BEGIN
    SELECT ua.*, u.email
    INTO access_record
    FROM public.user_access ua
    JOIN auth.users u ON ua.user_id = u.id
    WHERE u.email = 'anja.musica@web.de';
    
    IF FOUND THEN
        RAISE NOTICE '✓ Zugang erfolgreich gewährt für: %', access_record.email;
        RAISE NOTICE '  - Status: %', access_record.status;
        RAISE NOTICE '  - Zugang bis: %', access_record.access_expires_at;
        RAISE NOTICE '  - Ressourcen-Limit: %', access_record.resources_limit;
        RAISE NOTICE '  - Ressourcen erstellt: %', access_record.resources_created;
    ELSE
        RAISE WARNING 'Zugang wurde erstellt, aber konnte nicht verifiziert werden.';
    END IF;
END $$;

