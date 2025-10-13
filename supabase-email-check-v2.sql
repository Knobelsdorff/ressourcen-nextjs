-- Supabase E-Mail Konfiguration überprüfen (Version 2)
-- Führe diese Befehle in der Supabase SQL Editor aus

-- 1. Überprüfe die Benutzer-Tabelle für E-Mail-Bestätigungen
SELECT 
  email,
  email_confirmed_at,
  created_at,
  confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Überprüfe die Audit-Logs für E-Mail-Aktivitäten
SELECT 
  action,
  created_at,
  metadata
FROM auth.audit_log_entries 
WHERE action LIKE '%email%' 
   OR action LIKE '%confirm%'
   OR action LIKE '%signup%'
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Überprüfe die Identitäten-Tabelle
SELECT 
  provider,
  email,
  created_at
FROM auth.identities 
ORDER BY created_at DESC 
LIMIT 5;
