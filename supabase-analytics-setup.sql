-- Analytics-Setup für Nutzerverhalten-Tracking
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Erstelle die user_analytics Tabelle
CREATE TABLE IF NOT EXISTS public.user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL, -- 'audio_play', 'resource_created', 'dashboard_visit', 'audio_play_complete'
    story_id UUID REFERENCES public.saved_stories(id) ON DELETE SET NULL,
    resource_figure_name TEXT,
    voice_id TEXT,
    metadata JSONB, -- Zusätzliche Daten (z.B. play_duration, play_position, completed)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aktiviere RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- 3. Policies für User (können eigene Events sehen und erstellen)
CREATE POLICY "Users can view their own analytics" ON public.user_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON public.user_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_user_analytics_story_id ON public.user_analytics(story_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_resource_figure_name ON public.user_analytics(resource_figure_name);

-- 5. Kommentare
COMMENT ON TABLE public.user_analytics IS 'Trackt Nutzerverhalten: Audio-Plays, Ressourcen-Erstellungen, Dashboard-Besuche';
COMMENT ON COLUMN public.user_analytics.event_type IS 'Typ des Events: audio_play, resource_created, dashboard_visit, audio_play_complete';
COMMENT ON COLUMN public.user_analytics.metadata IS 'Zusätzliche Event-Daten als JSON (z.B. play_duration, play_position, completed)';


