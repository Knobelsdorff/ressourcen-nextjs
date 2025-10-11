-- Supabase Cleanup und Final Setup
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Lösche ALLE bestehenden Policies (brutale Methode)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Lösche alle Policies von profiles
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
    
    -- Lösche alle Policies von saved_stories
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'saved_stories'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.saved_stories';
    END LOOP;
END $$;

-- 2. Erstelle saubere Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own stories" ON public.saved_stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories" ON public.saved_stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON public.saved_stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON public.saved_stories
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Erstelle/Ersetze Funktionen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Erstelle/Ersetze Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Erstelle Indexe (falls nicht vorhanden)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_saved_stories_user_id ON public.saved_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_stories_created_at ON public.saved_stories(created_at);

-- 6. Berechtigungen
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.saved_stories TO anon, authenticated;

-- 7. Zeige Status
SELECT 'Setup abgeschlossen!' as status;
SELECT 'Tabellen:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'saved_stories');
SELECT 'Policies:' as info;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
