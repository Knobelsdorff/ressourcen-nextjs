-- Vollständige Prüfung für jasmin.danielse@live.de
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. User-Informationen
SELECT 
  id as user_id,
  email,
  email_confirmed_at,
  created_at as user_created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ E-Mail nicht bestätigt'
    ELSE '✅ E-Mail bestätigt'
  END as email_status
FROM auth.users
WHERE email = 'jasmin.danielse@live.de';

-- 2. Alle Ressourcen für diese Klientin
SELECT 
  id,
  title,
  client_email,
  user_id,
  created_at,
  audio_url IS NOT NULL as has_audio,
  is_audio_only,
  CASE 
    WHEN user_id IS NULL THEN '⏳ Pending (noch nicht zugeordnet)'
    ELSE '✅ Zugeordnet zu User'
  END as status,
  CASE 
    WHEN user_id IS NULL THEN '⚠️ Magic Link wurde noch nicht verwendet'
    ELSE '✅ Magic Link wurde verwendet - Ressource ist zugeordnet'
  END as magic_link_status
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de'
ORDER BY created_at DESC;

-- 3. Prüfe ob Ressourcen dem User zugeordnet wurden
SELECT 
  ss.id,
  ss.title,
  ss.client_email,
  ss.user_id,
  ss.created_at,
  au.email as user_email,
  CASE 
    WHEN ss.user_id IS NULL THEN '❌ NICHT zugeordnet'
    WHEN ss.user_id = au.id THEN '✅ Zugeordnet'
    ELSE '⚠️ Zu anderem User zugeordnet'
  END as zuordnungs_status
FROM saved_stories ss
LEFT JOIN auth.users au ON ss.user_id = au.id
WHERE ss.client_email = 'jasmin.danielse@live.de'
ORDER BY ss.created_at DESC;

-- 4. Zusammenfassung
SELECT 
  COUNT(*) as total_ressourcen,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as pending_ressourcen,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as zugeordnete_ressourcen,
  MAX(created_at) as letzte_erstellung,
  MIN(created_at) as erste_erstellung
FROM saved_stories
WHERE client_email = 'jasmin.danielse@live.de';

