-- Prüfe E-Mail-Versand für Klienten-Ressourcen
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Prüfe die letzten erstellten Ressourcen mit client_email (letzte 24 Stunden)
SELECT 
  id,
  title,
  client_email,
  created_at,
  audio_url IS NOT NULL as has_audio,
  is_audio_only,
  user_id IS NULL as is_pending,
  CASE 
    WHEN user_id IS NULL THEN '⏳ Pending (noch nicht zugeordnet)'
    ELSE '✅ Zugeordnet'
  END as status
FROM saved_stories
WHERE client_email IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Prüfe alle Ressourcen für eine spezifische Klientin (ersetze EMAIL)
-- SELECT 
--   id,
--   title,
--   client_email,
--   created_at,
--   audio_url IS NOT NULL as has_audio,
--   is_audio_only,
--   user_id IS NULL as is_pending
-- FROM saved_stories
-- WHERE client_email = 'EMAIL-DER-KLIENTIN'
-- ORDER BY created_at DESC;

-- 3. Zähle Ressourcen pro Klientin (letzte 7 Tage)
SELECT 
  client_email,
  COUNT(*) as anzahl_ressourcen,
  MAX(created_at) as letzte_erstellung,
  SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as zugeordnet
FROM saved_stories
WHERE client_email IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY client_email
ORDER BY letzte_erstellung DESC;

