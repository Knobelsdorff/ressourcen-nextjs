-- Einfaches Supabase Setup für Ressourcen App
-- Führe dieses Skript in der Supabase SQL Editor aus

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

-- 3. Aktiviere RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_stories ENABLE ROW LEVEL SECURITY;

-- 4. Lösche alle bestehenden Policies zuerst
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

DROP POLICY IF EXISTS "stories_select_policy" ON public.saved_stories;
DROP POLICY IF EXISTS "stories_insert_policy" ON public.saved_stories;
DROP POLICY IF EXISTS "stories_update_policy" ON public.saved_stories;
DROP POLICY IF EXISTS "stories_delete_policy" ON public.saved_stories;

-- 5. Erstelle einfache Policies
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "stories_select_policy" ON public.saved_stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stories_insert_policy" ON public.saved_stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stories_update_policy" ON public.saved_stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "stories_delete_policy" ON public.saved_stories
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Erstelle Funktionen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Erstelle Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Erstelle Indexe
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_saved_stories_user_id ON public.saved_stories(user_id);

-- 9. Berechtigungen
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.saved_stories TO anon, authenticated;
