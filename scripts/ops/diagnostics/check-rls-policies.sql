-- Prüft RLS-Policies für user_access
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Prüfe ob RLS aktiviert ist
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'user_access';

-- 2. Zeige alle Policies für user_access
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_access';

-- 3. Test: Prüfe ob User seinen eigenen Zugang sehen kann (als Service Role)
SELECT 
    ua.*,
    u.email
FROM public.user_access ua
JOIN auth.users u ON ua.user_id = u.id
WHERE u.email = 'mewax28983@fandoe.com';

-- 4. Prüfe ob has_active_access Funktion funktioniert
SELECT 
    u.email,
    u.id as user_id,
    public.has_active_access(u.id) as has_active_access_result
FROM auth.users u
WHERE u.email = 'mewax28983@fandoe.com';

