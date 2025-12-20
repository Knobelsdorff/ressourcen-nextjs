-- Diagnose-Skript für E-Mail-Problem bei Registrierung
-- Führe diese Befehle im Supabase SQL Editor aus, um die Konfiguration zu überprüfen

-- 1. Überprüfe SMTP-Konfiguration
SELECT 
  key,
  value,
  CASE 
    WHEN value IS NULL OR value = '' THEN '❌ NICHT GESETZT'
    ELSE '✅ GESETZT'
  END as status
FROM auth.config 
WHERE key IN (
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_SENDER_NAME',
  'SMTP_ADMIN_EMAIL'
)
ORDER BY key;

-- 2. Überprüfe E-Mail-Bestätigungseinstellungen
SELECT 
  key,
  value,
  CASE 
    WHEN key = 'ENABLE_EMAIL_CONFIRMATIONS' AND value = 'true' THEN '✅ AKTIVIERT'
    WHEN key = 'ENABLE_EMAIL_CONFIRMATIONS' AND value = 'false' THEN '⚠️ DEAKTIVIERT (keine E-Mails werden gesendet!)'
    ELSE '✅'
  END as status
FROM auth.config 
WHERE key IN (
  'ENABLE_EMAIL_CONFIRMATIONS',
  'ENABLE_SIGNUP',
  'SITE_URL'
)
ORDER BY key;

-- 3. Überprüfe die letzten Benutzer-Registrierungen
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ NICHT BESTÄTIGT'
    ELSE '✅ BESTÄTIGT'
  END as confirmation_status,
  raw_user_meta_data->>'signup_origin' as signup_origin
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 4. Überprüfe E-Mail-Templates
SELECT 
  id,
  name,
  subject,
  CASE 
    WHEN content_html IS NULL OR content_html = '' THEN '❌ KEIN HTML-CONTENT'
    ELSE '✅ HTML-CONTENT VORHANDEN'
  END as html_status,
  CASE 
    WHEN content_text IS NULL OR content_text = '' THEN '❌ KEIN TEXT-CONTENT'
    ELSE '✅ TEXT-CONTENT VORHANDEN'
  END as text_status
FROM auth.email_templates
ORDER BY name;

-- 5. Überprüfe Auth-Logs für E-Mail-Versand-Fehler (letzte 24 Stunden)
-- Hinweis: Diese Tabelle existiert möglicherweise nicht in allen Supabase-Projekten
SELECT 
  id,
  created_at,
  payload->>'email' as email,
  payload->>'error' as error,
  payload->>'event' as event
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND (
    payload->>'event' LIKE '%email%' 
    OR payload->>'event' LIKE '%confirmation%'
    OR payload->>'error' IS NOT NULL
  )
ORDER BY created_at DESC
LIMIT 20;




