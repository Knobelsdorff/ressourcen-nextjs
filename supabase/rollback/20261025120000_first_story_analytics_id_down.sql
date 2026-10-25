-- ROLLBACK für supabase/migrations/20261025120000_first_story_analytics_id.sql
-- Gefahrlos jederzeit: Der Code prüft, ob die Spalte existiert.

BEGIN;

ALTER TABLE public.first_story_drafts
    DROP CONSTRAINT IF EXISTS first_story_drafts_analytics_id_format;
ALTER TABLE public.first_story_drafts
    DROP COLUMN IF EXISTS analytics_id;

COMMIT;
