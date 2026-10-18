-- ROLLBACK für supabase/migrations/20261017120000_first_story_server_flow.sql
--
-- Reihenfolge beim Zurückrollen:
--   1. Im Hosting NEXT_PUBLIC_FIRST_STORY_SERVER_FLOW=0 setzen und neu deployen
--      – oder den Branch first-story-server-flow nicht mergen bzw. den
--      Merge-Commit reverten. Dann läuft wieder der alte Browser-Flow.
--   2. Erst DANACH dieses Skript ausführen. Läuft der neue Code noch, schlagen
--      sonst die Zugangslinks aus bereits versendeten E-Mails fehl.
--
-- Was erhalten bleibt:
--   Storys, die über den neuen Flow gespeichert wurden, bleiben als ganz
--   normale saved_stories-Zeilen bestehen. Entfernt werden nur die beiden
--   Zusatzspalten, die Entwürfe und die Funktionen.
--
-- Falls die Migration per `supabase db push` eingespielt wurde, danach:
--   supabase migration repair --status reverted 20261017120000

BEGIN;

DROP FUNCTION IF EXISTS public.first_story_claim_draft(uuid);
-- Variante mit Testphasen-Dauer (ab 20261018120000)
DROP FUNCTION IF EXISTS public.first_story_claim_draft(uuid, integer);
DROP FUNCTION IF EXISTS public.first_story_lock_draft(uuid, integer, integer);

DROP INDEX IF EXISTS public.saved_stories_one_first_story_per_user;
DROP INDEX IF EXISTS public.saved_stories_first_story_draft_id_key;

ALTER TABLE public.saved_stories DROP COLUMN IF EXISTS welcome_seen_at;
ALTER TABLE public.saved_stories DROP COLUMN IF EXISTS first_story_draft_id;

DROP TABLE IF EXISTS public.first_story_drafts;

COMMIT;
