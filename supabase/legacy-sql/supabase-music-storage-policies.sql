-- Storage Policies für background-music Bucket
-- Erlaubt Music-Admins und Full-Admins, Dateien hochzuladen
-- Führe dieses Skript in der Supabase SQL Editor aus
-- 
-- Dieses Skript verwendet eine Hilfstabelle, um dynamisch alle Music-Admins zu erkennen
-- Du musst die Email-Adressen nur einmal in der Tabelle speichern, nicht in jeder Policy

-- 1. Erstelle Hilfstabelle für Admin-Emails (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS public.music_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  admin_type TEXT NOT NULL CHECK (admin_type IN ('full', 'music')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Erstelle Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_music_admins_email ON public.music_admins(email);
CREATE INDEX IF NOT EXISTS idx_music_admins_type ON public.music_admins(admin_type);

-- 3. Lösche bestehende Storage Policies (falls vorhanden)
DROP POLICY IF EXISTS "Admins can upload music files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete music files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read music files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update music files" ON storage.objects;

-- 4. Erlaube allen, Musik-Dateien zu lesen (öffentlicher Zugriff)
CREATE POLICY "Anyone can read music files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'background-music'
);

-- 5. Erlaube Admins (Full-Admins und Music-Admins), Musik-Dateien hochzuladen
-- Prüft dynamisch gegen die music_admins Tabelle
CREATE POLICY "Admins can upload music files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'background-music'
  AND EXISTS (
    SELECT 1 FROM auth.users 
    INNER JOIN public.music_admins ON LOWER(auth.users.email) = LOWER(music_admins.email)
    WHERE auth.users.id = auth.uid()
  )
);

-- 6. Erlaube Admins (Full-Admins und Music-Admins), Musik-Dateien zu löschen
-- Prüft dynamisch gegen die music_admins Tabelle
CREATE POLICY "Admins can delete music files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'background-music'
  AND EXISTS (
    SELECT 1 FROM auth.users 
    INNER JOIN public.music_admins ON LOWER(auth.users.email) = LOWER(music_admins.email)
    WHERE auth.users.id = auth.uid()
  )
);

-- 7. Erlaube Admins, Musik-Dateien zu aktualisieren (falls nötig)
-- Prüft dynamisch gegen die music_admins Tabelle
CREATE POLICY "Admins can update music files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'background-music'
  AND EXISTS (
    SELECT 1 FROM auth.users 
    INNER JOIN public.music_admins ON LOWER(auth.users.email) = LOWER(music_admins.email)
    WHERE auth.users.id = auth.uid()
  )
);

-- 8. Beispiel: Füge deine Admin-Emails hinzu
-- Ersetze die Email-Adressen mit deinen tatsächlichen Admin-Emails
-- Du kannst später weitere Admins hinzufügen, ohne die Policies ändern zu müssen!

-- Beispiel für Full-Admin:
-- INSERT INTO public.music_admins (email, admin_type)
-- VALUES ('deine-admin-email@example.com', 'full')
-- ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;

-- Beispiel für Music-Admin (Freelancer):
-- INSERT INTO public.music_admins (email, admin_type)
-- VALUES ('freelancer@example.com', 'music')
-- ON CONFLICT (email) DO UPDATE SET admin_type = EXCLUDED.admin_type;

-- Hinweis: Nach dem Ausführen dieses Skripts musst du die Admin-Emails in die Tabelle einfügen.
-- Siehe Schritt 2 in MUSIC-STORAGE-POLICIES-SETUP.md für Details.
