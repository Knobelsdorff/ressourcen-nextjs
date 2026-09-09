-- Test-Skript: Prüfe ob Musik-Track für Lilith existiert
-- Führe dieses Skript in Supabase SQL Editor aus

-- 1. Zeige ALLE Tracks (zum Debugging)
SELECT 
  id,
  figure_id,
  figure_name,
  track_id,
  track_url,
  track_title,
  is_default,
  created_at
FROM public.background_music_tracks
ORDER BY created_at DESC;

-- 2. Zeige speziell Tracks für Lilith (verschiedene Varianten)
SELECT 
  id,
  figure_id,
  figure_name,
  track_id,
  track_url,
  track_title,
  is_default,
  created_at,
  CASE 
    WHEN figure_id = 'lilith' THEN '✅ Match by figure_id'
    WHEN figure_id = 'Lilith' THEN '⚠️ Case mismatch (should be lowercase)'
    WHEN figure_name = 'Lilith' THEN '✅ Match by figure_name'
    WHEN figure_name = 'lilith' THEN '⚠️ Case mismatch'
    ELSE '❌ No match'
  END as match_status
FROM public.background_music_tracks
WHERE figure_id ILIKE '%lilith%' OR figure_name ILIKE '%lilith%'
ORDER BY is_default DESC, created_at DESC;

-- 2. Prüfe ob Standard-Track existiert
SELECT 
  COUNT(*) as total_tracks,
  COUNT(*) FILTER (WHERE is_default = true) as default_tracks
FROM public.background_music_tracks
WHERE figure_id = 'lilith' OR figure_name = 'Lilith';

-- 3. Zeige alle verfügbaren Figuren (zum Vergleich)
-- (Dieser Teil funktioniert nur, wenn du die figures Tabelle hast)
-- SELECT id, name FROM figures WHERE id = 'lilith' OR name = 'Lilith';

