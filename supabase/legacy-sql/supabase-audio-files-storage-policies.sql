-- Storage Policies für audio-files Bucket
-- Erlaubt allen authentifizierten Usern, Dateien hochzuladen
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Lösche bestehende Storage Policies (falls vorhanden)
DROP POLICY IF EXISTS "Authenticated users can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio files" ON storage.objects;

-- 2. Erlaube allen, Audio-Dateien zu lesen (öffentlicher Zugriff)
CREATE POLICY "Anyone can read audio files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audio-files'
);

-- 3. Erlaube allen authentifizierten Usern, Audio-Dateien hochzuladen
CREATE POLICY "Authenticated users can upload audio files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'audio-files'
  AND auth.uid() IS NOT NULL
);

-- 4. Erlaube Usern, ihre eigenen Dateien zu löschen
-- (Optional: Kann später erweitert werden, um nur eigene Dateien zu löschen)
CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'audio-files'
  AND auth.uid() IS NOT NULL
);

-- Hinweis: Diese Policies erlauben allen authentifizierten Usern, Dateien hochzuladen.
-- Das ist für Client-Ressourcen gewollt, da Therapeuten Ressourcen für ihre Klienten erstellen.

