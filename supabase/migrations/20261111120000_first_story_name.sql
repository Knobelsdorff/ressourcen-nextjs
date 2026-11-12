-- Vorname + Aussprache am Erststory-Entwurf
--
-- Usability-Test (2026-11): Der Engel-Flow fragt nach den sechs Fragen jetzt
-- nach dem Vornamen (mit Hörprobe). Die Story wird auf dem Server erzeugt,
-- bevor es einen Account gibt – deshalb merkt sich der Entwurf Name und
-- Aussprache. Sobald der Entwurf einem Account zugeordnet wird (Link-Klick),
-- übernimmt der Server beides ins Profil (profiles.full_name /
-- profiles.pronunciation_hint), damit spätere Storys nicht erneut fragen.
--
-- Der Code funktioniert auch ohne diese Spalten: Die Erststory entsteht dann
-- ohne Namen, wie bisher. Zurück: supabase/rollback/20261111120000_first_story_name_down.sql

BEGIN;

ALTER TABLE public.first_story_drafts
    ADD COLUMN IF NOT EXISTS user_name text,
    ADD COLUMN IF NOT EXISTS pronunciation_hint text;

ALTER TABLE public.first_story_drafts
    DROP CONSTRAINT IF EXISTS first_story_drafts_user_name_length;
ALTER TABLE public.first_story_drafts
    ADD CONSTRAINT first_story_drafts_user_name_length
    CHECK (user_name IS NULL OR char_length(user_name) <= 60);

ALTER TABLE public.first_story_drafts
    DROP CONSTRAINT IF EXISTS first_story_drafts_pronunciation_hint_length;
ALTER TABLE public.first_story_drafts
    ADD CONSTRAINT first_story_drafts_pronunciation_hint_length
    CHECK (pronunciation_hint IS NULL OR char_length(pronunciation_hint) <= 60);

COMMENT ON COLUMN public.first_story_drafts.user_name IS
  'Vorname aus dem Namens-Schritt des Engel-Flows (optional). Wird bei Zuordnung ins Profil übernommen.';
COMMENT ON COLUMN public.first_story_drafts.pronunciation_hint IS
  'Aussprache des Vornamens, ein Wort (z.B. "Juh-lia"). Wird bei Zuordnung ins Profil übernommen.';

COMMIT;
