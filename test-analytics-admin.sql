-- Test: Erstelle Test-Events für verschiedene User
-- Führe dieses Skript im Supabase SQL Editor aus, um zu testen, ob Admin Analytics alle Events sieht

-- 1. Hole alle User-IDs
-- (Du musst die User-IDs manuell anpassen oder eine Query verwenden)

-- 2. Erstelle Test-Events für verschiedene User (umgeht RLS mit Service Role)
-- WICHTIG: Diese Query muss mit Service Role Key ausgeführt werden (im Supabase Dashboard)

INSERT INTO public.user_analytics (user_id, event_type, resource_figure_name, voice_id, metadata)
VALUES 
  -- Verwende eine existierende User-ID (ersetze mit einer echten User-ID)
  ((SELECT id FROM auth.users LIMIT 1), 'dashboard_visit', NULL, NULL, '{}'::jsonb),
  ((SELECT id FROM auth.users LIMIT 1), 'resource_created', 'Jesus', 'voice_123', '{}'::jsonb),
  ((SELECT id FROM auth.users LIMIT 1), 'audio_play', 'Engel', 'voice_456', '{}'::jsonb),
  ((SELECT id FROM auth.users LIMIT 1), 'audio_play_complete', 'Erzengel Michael', 'voice_789', '{"completed": true}'::jsonb);

-- 3. Prüfe ob Events erstellt wurden
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  event_type,
  COUNT(*) as count_per_type
FROM public.user_analytics
GROUP BY event_type
ORDER BY count_per_type DESC;

-- 4. Zeige alle Events
SELECT 
  id,
  user_id,
  event_type,
  resource_figure_name,
  created_at
FROM public.user_analytics
ORDER BY created_at DESC
LIMIT 20;

