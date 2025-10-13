-- Supabase E-Mail Konfiguration überprüfen
-- Führe diese Befehle in der Supabase SQL Editor aus

-- 1. Überprüfe die Auth-Konfiguration
SELECT * FROM auth.config;

-- 2. Überprüfe die E-Mail-Templates
SELECT * FROM auth.email_templates;

-- 3. Überprüfe die SMTP-Konfiguration
SELECT * FROM auth.smtp_config;

-- 4. Überprüfe die E-Mail-Bestätigungseinstellungen
SELECT 
  key,
  value
FROM auth.config 
WHERE key IN (
  'SITE_URL',
  'SMTP_ADMIN_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_SENDER_NAME',
  'ENABLE_SIGNUP',
  'ENABLE_EMAIL_CONFIRMATIONS'
);
