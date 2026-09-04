-- Ordne die Ressourcen für jasmin.danielse@live.de manuell zu
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Hole die User-ID
DO $$
DECLARE
  user_uuid UUID;
  resource_count INTEGER;
BEGIN
  -- Hole User-ID
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'jasmin.danielse@live.de';
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User mit E-Mail jasmin.danielse@live.de nicht gefunden';
  END IF;
  
  -- Zähle pending Ressourcen
  SELECT COUNT(*) INTO resource_count
  FROM saved_stories
  WHERE client_email = 'jasmin.danielse@live.de'
    AND user_id IS NULL;
  
  -- Ordne Ressourcen zu
  UPDATE saved_stories
  SET user_id = user_uuid
  WHERE client_email = 'jasmin.danielse@live.de'
    AND user_id IS NULL;
  
  RAISE NOTICE '✅ % Ressourcen wurden dem User % zugeordnet', resource_count, user_uuid;
END $$;

-- 2. Prüfe Ergebnis
SELECT 
  ss.id,
  ss.title,
  ss.client_email,
  ss.user_id,
  au.email as user_email,
  CASE 
    WHEN ss.user_id IS NULL THEN 'NICHT zugeordnet'
    WHEN ss.user_id = au.id THEN 'Zugeordnet'
    ELSE 'Zu anderem User zugeordnet'
  END as status
FROM saved_stories ss
LEFT JOIN auth.users au ON ss.user_id = au.id
WHERE ss.client_email = 'jasmin.danielse@live.de'
ORDER BY ss.created_at DESC;

