-- Prüfe ob User eine Stripe Subscription-ID hat
-- User-ID: 0878186b-c929-494d-baa8-4b7447fc7915
-- Email: heilung@knobelsdorff-therapie.de

SELECT 
    u.email,
    ua.id,
    ua.plan_type,
    ua.subscription_status,
    ua.status,
    ua.stripe_subscription_id,
    ua.stripe_checkout_session_id,
    ua.stripe_customer_id,
    ua.access_starts_at,
    ua.access_expires_at,
    ua.created_at,
    ua.updated_at
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.email = 'heilung@knobelsdorff-therapie.de'
ORDER BY ua.created_at DESC;

