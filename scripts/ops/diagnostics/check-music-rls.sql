-- Prüfe RLS-Policies für background_music_tracks
-- Führe dieses Skript in Supabase SQL Editor aus

-- 1. Zeige alle Policies
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
WHERE tablename = 'background_music_tracks';

-- 2. Prüfe ob RLS aktiviert ist
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'background_music_tracks';

-- 3. Test: Versuche alle Tracks zu lesen (sollte funktionieren wegen "Anyone can read")
SELECT 
  id,
  figure_id,
  figure_name,
  track_url,
  is_default
FROM public.background_music_tracks
WHERE figure_id = 'lilith' OR figure_name = 'Lilith';

