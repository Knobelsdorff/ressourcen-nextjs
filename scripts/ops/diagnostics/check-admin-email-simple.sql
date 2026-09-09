-- Einfache Prüfung: Wann wurden die Ressourcen für jasmin.danielse@live.de erstellt?
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Alle Ressourcen für jasmin.danielse@live.de
SELECT 
  id,
  title,
  client_email,
  created_at,
  -- Berechne Zeit seit Erstellung (in Stunden)
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600, 1) as stunden_seit_erstellung,
  user_id,
  CASE 
    WHEN user_id IS NULL THEN 'Pending (Magic Link noch nicht verwendet)'
    ELSE 'Zugeordnet (Magic Link wurde verwendet - E-Mail ist angekommen!)'
  END as status
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de'
ORDER BY created_at DESC;

-- 2. Zusammenfassung
SELECT 
  COUNT(*) as anzahl_ressourcen,
  MIN(created_at) as erste_erstellung,
  MAX(created_at) as letzte_erstellung,
  ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600, 1) as stunden_seit_letzter_erstellung,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as zugeordnet,
  CASE 
    WHEN SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) > 0 THEN 'E-Mail ist angekommen (Magic Link wurde verwendet)'
    WHEN MAX(created_at) > NOW() - INTERVAL '1 hour' THEN 'E-Mail wurde gerade erst verschickt - warte noch'
    ELSE 'E-Mail konnte nicht angekommen sein (Magic Link wurde noch nicht verwendet)'
  END as email_status
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de';

-- 3. Prüfe User-Erstellung (zeigt wann Magic Link verwendet wurde)
SELECT 
  id,
  email,
  created_at as user_erstellt_am,
  email_confirmed_at as email_bestaetigt_am,
  ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600, 1) as stunden_seit_user_erstellung,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'E-Mail nicht bestätigt'
    ELSE 'E-Mail bestätigt - Magic Link wurde verwendet'
  END as bestaetigungs_status
FROM auth.users
WHERE email = 'jasmin.danielse@live.de';
