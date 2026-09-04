-- Gibt Test-User mewax28983@fandoe.com denselben Zugang wie Anja
-- Führe dieses Skript NACH der Registrierung in Supabase SQL Editor aus

-- WICHTIG: Registriere den User ZUERST in der App!
-- Dann führe dieses Skript aus, um ihm Zugang zu geben.

-- 1. Prüfe ob User existiert
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'mewax28983@fandoe.com';

-- 2. Gib Test-User denselben Zugang wie Anja
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
    'standard', -- Standard-Plan wie Anja
    0, -- Noch keine Ressourcen erstellt
    3, -- Gleiche Limit wie Anja
    NOW(),
    NOW() + INTERVAL '2 weeks', -- 2 Wochen wie Anja
    'active',
    'test_account_mewax',
    'test_account_mewax'
FROM auth.users u
WHERE u.email = 'mewax28983@fandoe.com'
ON CONFLICT (user_id) 
DO UPDATE SET
    plan_type = 'standard',
    access_expires_at = NOW() + INTERVAL '2 weeks',
    status = 'active',
    resources_limit = 3,
    updated_at = NOW();

-- 3. Verifiziere Zugang
SELECT 
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    EXTRACT(EPOCH FROM (ua.access_expires_at - NOW())) / 86400 as days_remaining,
    public.has_active_access(u.id) as has_active_access_result,
    CASE 
        WHEN public.has_active_access(u.id) = TRUE 
        THEN '✓ Zugang aktiv - Paywall erscheint NICHT'
        ELSE '✗ Kein Zugang - Paywall erscheint'
    END as access_status
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email = 'mewax28983@fandoe.com';

