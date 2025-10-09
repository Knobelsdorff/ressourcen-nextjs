-- Supabase Cleanup - Lösche alle bestehenden Policies
-- Führe dieses Skript ZUERST aus, bevor du das Hauptskript ausführst

-- Lösche alle Policies direkt (ohne Schleife)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own stories" ON public.saved_stories;
DROP POLICY IF EXISTS "Users can insert their own stories" ON public.saved_stories;
DROP POLICY IF EXISTS "Users can update their own stories" ON public.saved_stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.saved_stories;

-- Zeige alle verbleibenden Policies
SELECT 'Verbleibende Policies:' as info;
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
