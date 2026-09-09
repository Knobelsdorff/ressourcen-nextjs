-- Supabase Setup für Ressourcen App
-- Führe diese Befehle in der Supabase SQL Editor aus

-- 1. Erstelle die profiles Tabelle
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Erstelle die saved_stories Tabelle
CREATE TABLE IF NOT EXISTS public.saved_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    resource_figure JSONB NOT NULL,
    question_answers JSONB NOT NULL,
    audio_url TEXT,
    voice_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Erstelle RLS (Row Level Security) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_stories ENABLE ROW LEVEL SECURITY;

-- 4. Lösche ALLE bestehenden Policies (brutale Methode)
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

-- 5. Erstelle Profile Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Erstelle Saved Stories Policies
CREATE POLICY "Users can view their own stories" ON public.saved_stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories" ON public.saved_stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON public.saved_stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON public.saved_stories
    FOR DELETE USING (auth.uid() = user_id);

-- 7. handle_new_user() function and trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. handle_updated_at() function and triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if exist, then create
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_saved_stories_updated_at ON public.saved_stories;
CREATE TRIGGER handle_saved_stories_updated_at
    BEFORE UPDATE ON public.saved_stories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_saved_stories_user_id ON public.saved_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_stories_created_at ON public.saved_stories(created_at);

-- 10. Views for easier querying
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.confirmed_at IS NOT NULL;

CREATE OR REPLACE VIEW public.stories_with_users AS
SELECT 
    s.id,
    s.title,
    s.content,
    s.resource_figure,
    s.question_answers,
    s.audio_url,
    s.voice_id,
    s.created_at,
    s.updated_at,
    p.email as user_email,
    p.full_name as user_name
FROM public.saved_stories s
JOIN public.profiles p ON s.user_id = p.id;

-- 11. Cleanup function for old stories (optional)
CREATE OR REPLACE FUNCTION public.cleanup_old_stories(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.saved_stories 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Comments for documentation
COMMENT ON TABLE public.profiles IS 'Benutzerprofile mit erweiterten Informationen';
COMMENT ON TABLE public.saved_stories IS 'Gespeicherte Geschichten der Benutzer';
COMMENT ON FUNCTION public.handle_new_user() IS 'Erstellt automatisch ein Profil für neue Benutzer';
COMMENT ON FUNCTION public.handle_updated_at() IS 'Aktualisiert automatisch den updated_at Timestamp';
COMMENT ON FUNCTION public.cleanup_old_stories(INTEGER) IS 'Löscht alte Geschichten (Standard: 365 Tage)';

-- 13. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.saved_stories TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.stories_with_users TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_stories(INTEGER) TO anon, authenticated;
