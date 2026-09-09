-- Fix: Storage-Policies für background-music Bucket
-- Problem: Storage-Policies können möglicherweise nicht direkt auf auth.users zugreifen
-- Lösung: Verwende eine Funktion, die die Admin-Prüfung macht
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Erstelle Funktion zur Admin-Prüfung für Storage
CREATE OR REPLACE FUNCTION is_music_admin_for_storage()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_id UUID;
BEGIN
  -- Hole User-ID des aktuellen Users
  user_id := auth.uid();
  
  -- Wenn keine User-ID vorhanden, gibt false zurück
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Hole Email des aktuellen Users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id; 
  
  -- Wenn keine Email gefunden, gibt false zurück
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Prüfe ob Email in music_admins Tabelle ist
  RETURN EXISTS (
    SELECT 1 
    FROM public.music_admins 
    WHERE LOWER(email) = LOWER(user_email)
  );
END;
$$;

-- 2. Lösche alte Policies
DROP POLICY IF EXISTS "Admins can upload music files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete music files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update music files" ON storage.objects;

-- 3. Erstelle neue Policies mit der Funktion
CREATE POLICY "Admins can upload music files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'background-music'
  AND is_music_admin_for_storage()
);

CREATE POLICY "Admins can delete music files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'background-music'
  AND is_music_admin_for_storage()
);

CREATE POLICY "Admins can update music files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'background-music'
  AND is_music_admin_for_storage()
);

-- 4. Test: Prüfe ob die Funktion funktioniert
-- (Dieser Test funktioniert nur, wenn du als andreas@knobelsdorff-therapie.de eingeloggt bist)
-- SELECT is_music_admin_for_storage() as is_admin;

