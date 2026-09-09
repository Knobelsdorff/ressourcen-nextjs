-- Erstellt einen Test-User mit denselben Zugangsrechten wie Anja
-- Führe dieses Skript in der Supabase SQL Editor aus
-- Dieser Test-User hat dasselbe Passwort wie du setzt, nicht Anjas Passwort

-- 1. Erstelle Test-User (oder aktualisiere falls vorhanden)
-- WICHTIG: Verwende eine eigene Email, die du kontrollierst
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
)
SELECT 
    instance_id,
    gen_random_uuid(), -- Neue User-ID
    aud,
    role,
    'test-anja@example.com', -- ÄNDERE DIESE EMAIL zu deiner eigenen!
    encrypted_password, -- Kopiere das gehashte Passwort von deinem eigenen Account
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    NOW(),
    raw_app_meta_data,
    raw_user_meta_data,
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
FROM auth.users
WHERE email = (SELECT email FROM auth.users WHERE email LIKE '%@%' LIMIT 1) -- Kopiere von einem existierenden User
ON CONFLICT (email) DO NOTHING;

-- BESSERE ALTERNATIVE: Verwende Supabase Auth API oder Dashboard
-- Erstelle Test-User manuell in der App, dann gib ihm Zugang:

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
    3, -- Gleiche Anzahl Ressourcen
    3,
    NOW(),
    NOW() + INTERVAL '2 weeks', -- 2 Wochen wie Anja
    'active',
    'test_account_anja',
    'test_account_anja'
FROM auth.users u
WHERE u.email = 'test-anja@example.com' -- ÄNDERE DIESE EMAIL!
ON CONFLICT (user_id) 
DO UPDATE SET
    plan_type = 'standard',
    access_expires_at = NOW() + INTERVAL '2 weeks',
    status = 'active',
    updated_at = NOW();

-- 3. Verifiziere
SELECT 
    u.email,
    ua.plan_type,
    ua.status,
    ua.access_expires_at,
    public.has_active_access(u.id) as has_access
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email = 'test-anja@example.com';

