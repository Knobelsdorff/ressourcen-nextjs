-- Migration: Untertitel für Power Stories
-- Führe dieses Skript in der Supabase SQL Editor aus
-- 
-- Diese Migration ermöglicht:
-- 1. auto_subtitle: Automatisch generierter Untertitel
-- 2. custom_subtitle: Optionaler benutzerdefinierter Untertitel

-- 1. Füge auto_subtitle Feld hinzu
ALTER TABLE public.saved_stories 
ADD COLUMN IF NOT EXISTS auto_subtitle TEXT;

-- 2. Füge custom_subtitle Feld hinzu
ALTER TABLE public.saved_stories 
ADD COLUMN IF NOT EXISTS custom_subtitle TEXT;

-- 3. Kommentare hinzufügen für Dokumentation
COMMENT ON COLUMN public.saved_stories.auto_subtitle IS 'Automatisch generierter Untertitel für die Power Story';
COMMENT ON COLUMN public.saved_stories.custom_subtitle IS 'Optionaler benutzerdefinierter Untertitel (überschreibt auto_subtitle wenn vorhanden)';

-- Fertig! ✅
-- Die Tabelle unterstützt jetzt Untertitel für Power Stories.
