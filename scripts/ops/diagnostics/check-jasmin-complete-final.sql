-- Vollständige Prüfung für jasmin.danielse@live.de
-- Führe dieses Skript im Supabase SQL Editor aus
-- Zeigt alle Informationen in einer übersichtlichen Abfrage

-- 1. Alle Ressourcen mit User-Zuordnung
SELECT 
  ss.id as ressourcen_id,
  ss.title,
  ss.client_email,
  ss.created_at as ressourcen_erstellt_am,
  ROUND(EXTRACT(EPOCH FROM (NOW() - ss.created_at)) / 3600, 1) as stunden_seit_erstellung,
  ss.user_id,
  au.email as zugeordneter_user_email,
  au.created_at as user_erstellt_am,
  CASE 
    WHEN ss.user_id IS NULL THEN 'NICHT zugeordnet (noch Pending)'
    WHEN ss.user_id = au.id AND au.email = 'jasmin.danielse@live.de' THEN 'Zugeordnet zu jasmin.danielse@live.de'
    ELSE 'Zu anderem User zugeordnet'
  END as zuordnungs_status
FROM saved_stories ss
LEFT JOIN auth.users au ON ss.user_id = au.id
WHERE ss.client_email = 'jasmin.danielse@live.de'
ORDER BY ss.created_at DESC;

-- 2. Zusammenfassung
SELECT 
  COUNT(*) as total_ressourcen,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as pending_ressourcen,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as zugeordnete_ressourcen,
  MAX(created_at) as letzte_ressourcen_erstellung,
  MIN(created_at) as erste_ressourcen_erstellung,
  ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600, 1) as stunden_seit_letzter_erstellung,
  -- Prüfe ob User existiert
  (SELECT COUNT(*) FROM auth.users WHERE email = 'jasmin.danielse@live.de') as user_existiert,
  -- Prüfe ob Ressourcen dem richtigen User zugeordnet sind
  (SELECT COUNT(*) FROM saved_stories ss2
   JOIN auth.users au2 ON ss2.user_id = au2.id
   WHERE ss2.client_email = 'jasmin.danielse@live.de' 
   AND au2.email = 'jasmin.danielse@live.de') as richtig_zugeordnet
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de';

