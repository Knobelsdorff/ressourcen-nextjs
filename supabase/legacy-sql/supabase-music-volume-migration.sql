-- Migration: Track-spezifische Lautstärke für Hintergrundmusik
-- Führe dieses Skript in der Supabase SQL Editor aus
-- 
-- Diese Migration ermöglicht:
-- 1. volume-Spalte hinzufügen (für track-spezifische Lautstärke)
-- 2. Standard-Wert auf 0.12 (12%) setzen

-- 1. Füge volume-Spalte hinzu (DECIMAL mit Standard-Wert 0.12 = 12%)
ALTER TABLE public.background_music_tracks 
ADD COLUMN IF NOT EXISTS volume DECIMAL(3,2) DEFAULT 0.12;

-- 2. Setze Standard-Wert für bestehende Tracks (falls NULL)
UPDATE public.background_music_tracks 
SET volume = 0.12 
WHERE volume IS NULL;

-- 3. Mache volume NOT NULL (nachdem alle Werte gesetzt wurden)
ALTER TABLE public.background_music_tracks 
ALTER COLUMN volume SET NOT NULL;

-- 4. Kommentar hinzufügen für Dokumentation
COMMENT ON COLUMN public.background_music_tracks.volume IS 'Lautstärke des Tracks (0.00-1.00, Standard: 0.12 = 12%)';

-- 5. Index für schnelle Suche (optional, aber nützlich)
CREATE INDEX IF NOT EXISTS idx_background_music_volume 
ON public.background_music_tracks(volume);

-- Fertig! ✅
-- Jeder Track kann jetzt eine individuelle Lautstärke haben.

