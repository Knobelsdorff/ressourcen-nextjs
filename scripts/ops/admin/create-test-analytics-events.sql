-- Erstelle Test-Events für verschiedene User
-- Führe dieses Skript im Supabase SQL Editor aus
-- WICHTIG: Muss mit Service Role Key ausgeführt werden (im Supabase Dashboard)

-- 1. Hole alle User-IDs aus auth.users
-- Erstelle Test-Events für jeden User
INSERT INTO public.user_analytics (user_id, event_type, resource_figure_name, voice_id, metadata, created_at)
SELECT 
  u.id as user_id,
  'dashboard_visit' as event_type,
  NULL as resource_figure_name,
  NULL as voice_id,
  '{}'::jsonb as metadata,
  NOW() - (random() * interval '7 days') as created_at
FROM auth.users u
WHERE u.id IS NOT NULL
LIMIT 5;

-- Erstelle weitere Test-Events
INSERT INTO public.user_analytics (user_id, event_type, resource_figure_name, voice_id, metadata, created_at)
SELECT 
  u.id as user_id,
  'resource_created' as event_type,
  CASE (random() * 4)::int
    WHEN 0 THEN 'Jesus'
    WHEN 1 THEN 'Engel'
    WHEN 2 THEN 'Erzengel Michael'
    WHEN 3 THEN 'Ideal Familie'
    ELSE 'Superheld'
  END as resource_figure_name,
  'voice_' || (random() * 10)::int as voice_id,
  '{}'::jsonb as metadata,
  NOW() - (random() * interval '7 days') as created_at
FROM auth.users u
WHERE u.id IS NOT NULL
LIMIT 10;

-- Zeige Ergebnis
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  event_type,
  COUNT(*) as count_per_type
FROM public.user_analytics
GROUP BY event_type
ORDER BY count_per_type DESC;

