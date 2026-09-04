-- Prüfe ob Abo-Zugang für User erstellt wurde
-- Ersetze USER_ID_HIER mit der User-ID aus den Logs: 3fc4dd60-6fdb-4224-aa50-21bb70f62283

-- 1. Prüfe user_access Eintrag
SELECT 
    u.email,
    ua.id,
    ua.plan_type,
    ua.subscription_status,
    ua.status,
    ua.stripe_subscription_id,
    ua.stripe_checkout_session_id,
    ua.access_starts_at,
    ua.access_expires_at,
    ua.created_at,
    ua.updated_at,
    -- Prüfe ob Zugang aktiv ist
    public.has_active_access(u.id) as has_active_access_result
FROM auth.users u
LEFT JOIN public.user_access ua ON ua.user_id = u.id
WHERE u.id = '3fc4dd60-6fdb-4224-aa50-21bb70f62283'
ORDER BY ua.created_at DESC;

-- 2. Prüfe Stripe Webhook Events (falls du Zugriff auf Stripe Logs hast)
-- Gehe zu Stripe Dashboard → Webhooks → Event Logs
-- Suche nach checkout.session.completed Events für diese Session-ID

