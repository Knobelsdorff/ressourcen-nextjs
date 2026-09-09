-- Prüfe die letzten Ressourcen-Versendungen für jasmin.danielse@live.de
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Alle Ressourcen für jasmin.danielse@live.de mit Details
SELECT 
  id,
  title,
  client_email,
  created_at,
  user_id,
  audio_url IS NOT NULL as has_audio,
  is_audio_only,
  CASE 
    WHEN user_id IS NULL THEN '⏳ Pending (Magic Link noch nicht verwendet)'
    ELSE '✅ Zugeordnet (Magic Link wurde verwendet)'
  END as status,
  -- Berechne Zeit seit Erstellung
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_ago
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de'
ORDER BY created_at DESC;

-- 2. Zusammenfassung: Wann wurden die Ressourcen erstellt?
SELECT 
  COUNT(*) as anzahl_ressourcen,
  MIN(created_at) as erste_erstellung,
  MAX(created_at) as letzte_erstellung,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 as stunden_seit_letzter_erstellung,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as zugeordnet
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de';

-- 3. Prüfe alle Ressourcen-Versendungen der letzten 7 Tage (alle Klienten)
SELECT 
  client_email,
  COUNT(*) as anzahl_ressourcen,
  MAX(created_at) as letzte_versendung,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 as stunden_seit_versendung,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as pending_ressourcen,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as zugeordnete_ressourcen
FROM saved_stories
WHERE client_email IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY client_email
ORDER BY letzte_versendung DESC;

