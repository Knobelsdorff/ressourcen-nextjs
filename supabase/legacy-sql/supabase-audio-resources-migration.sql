-- Migration: Audio-only Ressourcen für Klienten
-- Führe dieses Skript in der Supabase SQL Editor aus
-- 
-- Diese Migration ermöglicht:
-- 1. content optional machen (für Audio-only Ressourcen)
-- 2. user_id optional machen (für pending Ressourcen ohne User)
-- 3. is_audio_only Flag hinzufügen
-- 4. client_email für Zuordnung zu Klienten

-- 1. Mache content optional (für Audio-only Ressourcen)
ALTER TABLE public.saved_stories 
ALTER COLUMN content DROP NOT NULL;

-- 2. Mache user_id optional (für pending Ressourcen ohne User)
ALTER TABLE public.saved_stories 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Füge is_audio_only Flag hinzu
ALTER TABLE public.saved_stories 
ADD COLUMN IF NOT EXISTS is_audio_only BOOLEAN DEFAULT false;

-- 4. Füge client_email für Zuordnung zu Klienten hinzu
ALTER TABLE public.saved_stories 
ADD COLUMN IF NOT EXISTS client_email TEXT;

-- 5. Erstelle Index für client_email (für schnelle Suche)
CREATE INDEX IF NOT EXISTS idx_saved_stories_client_email 
ON public.saved_stories(client_email) 
WHERE client_email IS NOT NULL;

-- 6. Erstelle Index für is_audio_only (für Filterung)
CREATE INDEX IF NOT EXISTS idx_saved_stories_is_audio_only 
ON public.saved_stories(is_audio_only) 
WHERE is_audio_only = true;

-- 7. Kommentare hinzufügen für Dokumentation
COMMENT ON COLUMN public.saved_stories.is_audio_only IS 'Flag für manuell aufgenommene Audio-Ressourcen (ohne generierten Text)';
COMMENT ON COLUMN public.saved_stories.client_email IS 'Email des Klienten, für den diese Ressource erstellt wurde (optional)';
COMMENT ON COLUMN public.saved_stories.content IS 'Text-Inhalt der Ressource (optional für Audio-only Ressourcen)';

-- 8. RLS Policies bleiben unverändert (Admins können alle Ressourcen sehen)
-- User können nur ihre eigenen Ressourcen sehen

-- Fertig! ✅
-- Die Tabelle unterstützt jetzt Audio-only Ressourcen.

