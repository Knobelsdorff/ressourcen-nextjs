-- Manuell Abo-Zugang erstellen für Test-User
-- User-ID: 3fc4dd60-6fdb-4224-aa50-21bb70f62283
-- Email: look@vivedia.de

-- Erstelle manuell einen Abo-Zugang (für Test-Zwecke)
-- Ersetze 'sub_test_123' mit der tatsächlichen Subscription-ID aus Stripe, falls vorhanden

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
    '3fc4dd60-6fdb-4224-aa50-21bb70f62283',
    'subscription',
    0,
    999999,
    NOW(),
    NULL,
    'sub_manual_test', -- Ersetze mit echter Subscription-ID wenn vorhanden
    'cs_test_manual', -- Ersetze mit echter Session-ID wenn vorhanden
    'active',
    'active'
)
ON CONFLICT (user_id) 
DO UPDATE SET
    plan_type = 'subscription',
    subscription_status = 'active',
    status = 'active',
    access_starts_at = NOW(),
    access_expires_at = NULL,
    updated_at = NOW();

-- Prüfe ob Zugang erstellt wurde
SELECT 
    u.email,
    ua.plan_type,
    ua.subscription_status,
    ua.status,
    ua.stripe_subscription_id,
    public.has_active_access(u.id) as has_active_access_result
FROM auth.users u
JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.id = '3fc4dd60-6fdb-4224-aa50-21bb70f62283';

