-- Migration: Füge has_seen_dashboard_intro Flag zur profiles Tabelle hinzu
-- Führe dieses Skript in der Supabase SQL Editor aus

-- Füge das Feld hinzu (mit Standardwert false für bestehende User)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_dashboard_intro BOOLEAN DEFAULT false;

-- Kommentar für Dokumentation
COMMENT ON COLUMN public.profiles.has_seen_dashboard_intro IS 'Flag, das anzeigt, ob der User die Dashboard-Intro-Überschrift bereits gesehen hat';
