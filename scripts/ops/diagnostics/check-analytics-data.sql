-- Prüfe ob Analytics-Events in der Datenbank vorhanden sind
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Prüfe ob die Tabelle existiert
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_analytics'
) as table_exists;

-- 2. Zähle alle Events
SELECT COUNT(*) as total_events FROM public.user_analytics;

-- 3. Zeige die letzten 10 Events
SELECT 
  id,
  user_id,
  event_type,
  resource_figure_name,
  voice_id,
  created_at
FROM public.user_analytics
ORDER BY created_at DESC
LIMIT 10;

-- 4. Event-Statistiken nach Typ
SELECT 
  event_type,
  COUNT(*) as count
FROM public.user_analytics
GROUP BY event_type
ORDER BY count DESC;

-- 5. Prüfe RLS Policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_analytics';

