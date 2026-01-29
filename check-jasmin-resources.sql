-- Prüfe Ressourcen für jasmin.danielse@live.de
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Alle Ressourcen für diese Klientin
SELECT 
  id,
  title,
  client_email,
  created_at,
  audio_url IS NOT NULL as has_audio,
  is_audio_only,
  user_id IS NULL as is_pending,
  user_id,
  CASE 
    WHEN user_id IS NULL THEN '⏳ Pending (noch nicht zugeordnet - Magic Link wurde noch nicht verwendet)'
    ELSE '✅ Zugeordnet (Magic Link wurde verwendet)'
  END as status
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de'
ORDER BY created_at DESC;

-- 2. Zusammenfassung
SELECT 
  COUNT(*) as total_ressourcen,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as zugeordnet,
  MAX(created_at) as letzte_erstellung,
  MIN(created_at) as erste_erstellung
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de';

-- 3. Prüfe ob User mit dieser E-Mail existiert
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ E-Mail nicht bestätigt'
    ELSE '✅ E-Mail bestätigt'
  END as email_status
FROM auth.users
WHERE email = 'jasmin.danielse@live.de';

