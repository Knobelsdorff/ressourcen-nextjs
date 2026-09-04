-- Prüfe ob Zugang nach Zahlung erstellt wurde
-- Ersetze 'USER_ID_HIER' mit deiner User-ID

-- 1. Prüfe ob User-Zugang existiert
SELECT 
    u.email,
    ua.id,
    ua.plan_type,
    ua.status,
    ua.access_starts_at,
    ua.access_expires_at,
    ua.stripe_payment_intent_id,
    ua.stripe_checkout_session_id,
    ua.created_at,
    EXTRACT(EPOCH FROM (ua.access_expires_at - NOW())) / 86400 as days_remaining,
    public.has_active_access(u.id) as has_active_access_result
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.id = '0878186b-c929-494d-baa8-4b7447fc7915'
ORDER BY ua.created_at DESC;

-- 2. Prüfe alle Zahlungen für diesen User
SELECT 
    u.email,
    ua.stripe_payment_intent_id,
    ua.stripe_checkout_session_id,
    ua.created_at as access_created_at
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.id = '0878186b-c929-494d-baa8-4b7447fc7915'
ORDER BY ua.created_at DESC;

