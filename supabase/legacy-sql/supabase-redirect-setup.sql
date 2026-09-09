-- Supabase Redirect Setup für Dashboard-Weiterleitung
-- Führe diese Befehle in der Supabase SQL Editor aus

-- 1. Überprüfe die aktuelle Site URL
SELECT 
  key,
  value
FROM auth.config 
WHERE key = 'SITE_URL';

-- 2. Setze die Site URL auf Dashboard (falls nötig)
-- UPDATE auth.config 
-- SET value = 'https://ressourcen.app/dashboard' 
-- WHERE key = 'SITE_URL';

-- 3. Überprüfe die E-Mail-Template-Konfiguration
SELECT 
  key,
  value
FROM auth.config 
WHERE key LIKE '%EMAIL%' OR key LIKE '%TEMPLATE%';

