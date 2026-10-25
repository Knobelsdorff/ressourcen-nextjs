-- PostHog-Kennung am Erststory-Entwurf (Funnel-Analyse)
--
-- Der Engel-Flow läuft zum Teil auf dem Server weiter, nachdem der Browser die
-- E-Mail abgeschickt hat: Story wird erzeugt, Link wird (oft auf einem anderen
-- Gerät) geöffnet. Damit diese Schritte im selben Funnel landen wie die Fragen,
-- merkt sich der Entwurf die anonyme PostHog-Kennung des Browsers.
--
-- Gesetzt wird sie NUR, wenn die Person der Analyse zugestimmt hat. NULL heißt:
-- keine Einwilligung – der Server sendet für diesen Entwurf nichts.
-- Inhalt ist eine zufällige ID (z.B. 0192f0c3-…), keine personenbezogenen Daten
-- wie E-Mail oder Name.
--
-- Der Code funktioniert auch ohne diese Spalte (Server-Events des Engel-Flows
-- fehlen dann einfach). Zurück: supabase/rollback/20261025120000_first_story_analytics_id_down.sql

BEGIN;

ALTER TABLE public.first_story_drafts
    ADD COLUMN IF NOT EXISTS analytics_id text;

ALTER TABLE public.first_story_drafts
    DROP CONSTRAINT IF EXISTS first_story_drafts_analytics_id_format;
ALTER TABLE public.first_story_drafts
    ADD CONSTRAINT first_story_drafts_analytics_id_format
    CHECK (analytics_id IS NULL OR analytics_id ~ '^[A-Za-z0-9_.:-]{1,200}$');

COMMENT ON COLUMN public.first_story_drafts.analytics_id IS
  'Anonyme PostHog-Kennung des Browsers, nur mit Analyse-Einwilligung gesetzt. NULL = keine Server-Events.';

COMMIT;
