-- Supabase Setup für Hintergrundmusik-Verwaltung
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Erstelle die background_music_tracks Tabelle
CREATE TABLE IF NOT EXISTS public.background_music_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  figure_id TEXT NOT NULL,
  figure_name TEXT,
  track_id TEXT NOT NULL,
  track_url TEXT NOT NULL,
  track_title TEXT,
  track_artist TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(figure_id, track_id)
);

-- 2. Erstelle Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_background_music_figure_id ON public.background_music_tracks(figure_id);
CREATE INDEX IF NOT EXISTS idx_background_music_default ON public.background_music_tracks(figure_id, is_default) WHERE is_default = true;

-- 3. Aktiviere RLS (Row Level Security)
ALTER TABLE public.background_music_tracks ENABLE ROW LEVEL SECURITY;

-- 4. Lösche alle bestehenden Policies (falls vorhanden)
DROP POLICY IF EXISTS "Anyone can read music tracks" ON public.background_music_tracks;
DROP POLICY IF EXISTS "Only admins can insert music tracks" ON public.background_music_tracks;
DROP POLICY IF EXISTS "Only admins can update music tracks" ON public.background_music_tracks;
DROP POLICY IF EXISTS "Only admins can delete music tracks" ON public.background_music_tracks;

-- 5. Erstelle RLS Policies
-- Jeder kann Tracks lesen (für die App)
CREATE POLICY "Anyone can read music tracks" ON public.background_music_tracks
  FOR SELECT USING (true);

-- Nur Admins können Tracks einfügen
-- Unterstützt sowohl Full-Admins (NEXT_PUBLIC_ADMIN_EMAILS) als auch Music-Admins (NEXT_PUBLIC_MUSIC_ADMIN_EMAILS)
-- Ersetze die Email-Adressen mit deinen tatsächlichen Admin-Emails
CREATE POLICY "Only admins can insert music tracks" ON public.background_music_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        -- Full-Admins (haben Zugriff auf Analytics + Music)
        auth.users.email = ANY(ARRAY[
          'deine-admin-email@example.com' -- ← HIER DEINE FULL-ADMIN-EMAIL EINTRAGEN
        ])
        OR
        -- Music-Admins (haben nur Zugriff auf Music-Verwaltung)
        auth.users.email = ANY(ARRAY[
          'freelancer@example.com' -- ← HIER DEINE MUSIC-ADMIN-EMAIL EINTRAGEN
        ])
      )
    )
  );

-- Nur Admins können Tracks aktualisieren
-- Unterstützt sowohl Full-Admins als auch Music-Admins
CREATE POLICY "Only admins can update music tracks" ON public.background_music_tracks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        -- Full-Admins
        auth.users.email = ANY(ARRAY[
          'deine-admin-email@example.com' -- ← HIER DEINE FULL-ADMIN-EMAIL EINTRAGEN
        ])
        OR
        -- Music-Admins
        auth.users.email = ANY(ARRAY[
          'freelancer@example.com' -- ← HIER DEINE MUSIC-ADMIN-EMAIL EINTRAGEN
        ])
      )
    )
  );

-- Nur Admins können Tracks löschen
-- Unterstützt sowohl Full-Admins als auch Music-Admins
CREATE POLICY "Only admins can delete music tracks" ON public.background_music_tracks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        -- Full-Admins
        auth.users.email = ANY(ARRAY[
          'deine-admin-email@example.com' -- ← HIER DEINE FULL-ADMIN-EMAIL EINTRAGEN
        ])
        OR
        -- Music-Admins
        auth.users.email = ANY(ARRAY[
          'freelancer@example.com' -- ← HIER DEINE MUSIC-ADMIN-EMAIL EINTRAGEN
        ])
      )
    )
  );

-- 6. Erstelle Trigger für updated_at
CREATE OR REPLACE FUNCTION update_background_music_tracks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_background_music_tracks_updated_at ON public.background_music_tracks;
CREATE TRIGGER trigger_update_background_music_tracks_updated_at
  BEFORE UPDATE ON public.background_music_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_background_music_tracks_updated_at();

-- 7. Optional: Migriere bestehende Musik aus Code (falls vorhanden)
-- Beispiel für Lilith:
-- INSERT INTO public.background_music_tracks (figure_id, figure_name, track_id, track_url, track_title, is_default)
-- VALUES (
--   'lilith',
--   'Lilith',
--   'lilith-default',
--   'https://wfnvjmockhcualjgymyl.supabase.co/storage/v1/object/public/background-music/430_full_outcome_0164_preview.mp3',
--   'Lilith Theme',
--   true
-- )
-- ON CONFLICT (figure_id, track_id) DO NOTHING;

