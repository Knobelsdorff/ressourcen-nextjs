-- Prüfe ob die Ressourcen dem User zugeordnet wurden
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Alle Ressourcen für jasmin.danielse@live.de mit User-Zuordnung
SELECT 
  ss.id,
  ss.title,
  ss.client_email,
  ss.created_at as ressourcen_erstellt_am,
  ss.user_id,
  au.email as user_email,
  au.created_at as user_erstellt_am,
  CASE 
    WHEN ss.user_id IS NULL THEN 'NICHT zugeordnet (noch Pending)'
    WHEN ss.user_id = au.id THEN 'Zugeordnet zu jasmin.danielse@live.de'
    ELSE 'Zu anderem User zugeordnet'
  END as zuordnungs_status,
  ROUND(EXTRACT(EPOCH FROM (NOW() - ss.created_at)) / 3600, 1) as stunden_seit_ressourcen_erstellung
FROM saved_stories ss
LEFT JOIN auth.users au ON ss.user_id = au.id
WHERE ss.client_email = 'jasmin.danielse@live.de'
ORDER BY ss.created_at DESC;

-- 2. Zusammenfassung: Sind die Ressourcen zugeordnet?
SELECT 
  COUNT(*) as total_ressourcen,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as pending_ressourcen,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as zugeordnete_ressourcen,
  MAX(created_at) as letzte_ressourcen_erstellung,
  -- Prüfe ob User existiert
  (SELECT COUNT(*) FROM auth.users WHERE email = 'jasmin.danielse@live.de') as user_existiert,
  -- Prüfe ob Ressourcen dem richtigen User zugeordnet sind
  (SELECT COUNT(*) FROM saved_stories ss
   JOIN auth.users au ON ss.user_id = au.id
   WHERE ss.client_email = 'jasmin.danielse@live.de' 
   AND au.email = 'jasmin.danielse@live.de') as richtig_zugeordnet
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de';

