-- Fix RLS Policies für user_analytics
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Lösche bestehende Policies
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.user_analytics;
DROP POLICY IF EXISTS "Users can insert their own analytics" ON public.user_analytics;

-- 2. Erstelle neue INSERT Policy die sicherstellt, dass User ihre eigenen Events einfügen können
CREATE POLICY "Users can insert their own analytics" ON public.user_analytics
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Erstelle SELECT Policy für User (können eigene Events sehen)
CREATE POLICY "Users can view their own analytics" ON public.user_analytics
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 4. Prüfe ob Policies korrekt erstellt wurden
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
WHERE tablename = 'user_analytics';

