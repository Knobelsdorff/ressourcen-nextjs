-- ROLLBACK für supabase/migrations/20261111120000_first_story_name.sql
-- Gefahrlos jederzeit: Der Code prüft, ob die Spalten existieren. Bereits ins
-- Profil übernommene Namen bleiben erhalten.

BEGIN;

ALTER TABLE public.first_story_drafts
    DROP CONSTRAINT IF EXISTS first_story_drafts_user_name_length,
    DROP CONSTRAINT IF EXISTS first_story_drafts_pronunciation_hint_length;
ALTER TABLE public.first_story_drafts
    DROP COLUMN IF EXISTS user_name,
    DROP COLUMN IF EXISTS pronunciation_hint;

COMMIT;
