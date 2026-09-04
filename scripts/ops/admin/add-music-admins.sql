-- Füge Admin-Emails zur music_admins Tabelle hinzu
-- Führe dieses Skript in der Supabase SQL Editor aus
-- 
-- Dieses Skript enthält die aktuellen Admin-Emails aus .env.local:
-- - Full-Admins: heilung@knobelsdorff-therapie.de, tahirwaleed399@gmail.com
-- - Music-Admin: andreas@knobelsdorff-therapie.de

-- 1. Füge Full-Admins hinzu (haben Zugriff auf Analytics + Music)
-- Aktuelle Full-Admin-Emails aus .env.local
INSERT INTO public.music_admins (email, admin_type)
VALUES ('heilung@knobelsdorff-therapie.de', 'full')
ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;

INSERT INTO public.music_admins (email, admin_type)
VALUES ('tahirwaleed399@gmail.com', 'full')
ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;

-- 2. Füge Music-Admin hinzu (hat nur Zugriff auf Music-Verwaltung)
-- Aktuelle Music-Admin-Email aus .env.local
INSERT INTO public.music_admins (email, admin_type)
VALUES ('andreas@knobelsdorff-therapie.de', 'music')
ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;

-- 3. Optional: Füge weitere Admins hinzu
-- Du kannst beliebig viele Admins hinzufügen:

-- Beispiel: Weitere Full-Admin
-- INSERT INTO public.music_admins (email, admin_type)
-- VALUES ('admin2@example.com', 'full')
-- ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;

-- Beispiel: Weitere Music-Admin
-- INSERT INTO public.music_admins (email, admin_type)
-- VALUES ('freelancer2@example.com', 'music')
-- ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;

-- 4. Prüfe ob die Admins korrekt eingetragen wurden
SELECT 
  email,
  admin_type,
  created_at
FROM public.music_admins
ORDER BY admin_type, email;

