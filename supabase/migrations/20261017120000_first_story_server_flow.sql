-- Erste Power Story (Engel-Flow) serverseitig erstellen und genau einmal speichern
--
-- Bisher wurde die erste Story im Browser erzeugt und nach dem Login aus dem
-- Browser gespeichert. Der Login-Link öffnete einen zweiten Tab, beide Tabs
-- konnten speichern, und es entstanden mehrere Engel-Storys pro Account.
--
-- Neu:
--   1. Die Antworten landen als Entwurf in first_story_drafts.
--   2. Der Server erzeugt Text und Audio für den Entwurf.
--   3. Der Link aus der E-Mail meldet an und ordnet den Entwurf dem Account zu.
--   4. first_story_claim_draft() legt daraus genau EINE saved_stories-Zeile an.
--
-- Die Doppelungen verhindert die Datenbank selbst (Unique-Indizes), nicht der
-- Browser.
--
-- Rein additiv: neue Tabelle, zwei neue nullable Spalten, zwei Funktionen.
-- Bestehende Zeilen werden nicht verändert.
--
-- ROLLBACK: supabase/rollback/20261017120000_first_story_server_flow_down.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Entwürfe
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.first_story_drafts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email               text NOT NULL,
    figure_name         text NOT NULL,
    voice_id            text NOT NULL,
    question_answers    jsonb NOT NULL DEFAULT '[]'::jsonb,
    status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'claimed')),
    story_text          text,
    audio_url           text,
    last_error          text,
    attempts            integer NOT NULL DEFAULT 0,
    locked_at           timestamptz,
    -- Wird erst gesetzt, wenn der Link aus der E-Mail geöffnet wurde
    -- (oder sofort, wenn die Person bereits eingeloggt war).
    user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    saved_story_id      uuid REFERENCES public.saved_stories(id) ON DELETE SET NULL,
    -- SHA-256 des Schlüssels, den nur der Browser kennt, der den Entwurf
    -- angelegt hat (für "Link erneut senden" und die Fortschrittsanzeige).
    resume_key_hash     text NOT NULL,
    request_ip          text,
    last_email_sent_at  timestamptz,
    claimed_at          timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.first_story_drafts OWNER TO postgres;

COMMENT ON TABLE public.first_story_drafts IS
  'Antworten + serverseitig erzeugte Story/Audio für die erste Power Story, bevor sie einem Account zugeordnet ist.';

-- E-Mails werden vom Server immer kleingeschrieben gespeichert.
CREATE INDEX IF NOT EXISTS first_story_drafts_email_created_idx
    ON public.first_story_drafts (email, created_at DESC);

CREATE INDEX IF NOT EXISTS first_story_drafts_user_created_idx
    ON public.first_story_drafts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS first_story_drafts_ip_created_idx
    ON public.first_story_drafts (request_ip, created_at DESC);

DROP TRIGGER IF EXISTS handle_first_story_drafts_updated_at ON public.first_story_drafts;
CREATE TRIGGER handle_first_story_drafts_updated_at
    BEFORE UPDATE ON public.first_story_drafts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Nur der Server (Service Role) greift zu. Keine Policies = kein Zugriff für
-- anon/authenticated.
ALTER TABLE public.first_story_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.first_story_drafts FROM anon, authenticated;
GRANT ALL ON TABLE public.first_story_drafts TO service_role;


-- ---------------------------------------------------------------------------
-- 2. saved_stories: Herkunft + "Willkommen"-Hinweis
-- ---------------------------------------------------------------------------

ALTER TABLE public.saved_stories
    ADD COLUMN IF NOT EXISTS first_story_draft_id uuid;

ALTER TABLE public.saved_stories
    ADD COLUMN IF NOT EXISTS welcome_seen_at timestamptz;

COMMENT ON COLUMN public.saved_stories.first_story_draft_id IS
  'Gesetzt, wenn die Story aus dem Engel-Erststory-Flow stammt.';
COMMENT ON COLUMN public.saved_stories.welcome_seen_at IS
  'Zeitpunkt, zu dem der Willkommens-Hinweis im Dashboard geschlossen wurde.';

-- Ein Entwurf ergibt höchstens eine Story ...
CREATE UNIQUE INDEX IF NOT EXISTS saved_stories_first_story_draft_id_key
    ON public.saved_stories (first_story_draft_id)
    WHERE first_story_draft_id IS NOT NULL;

-- ... und ein Account hat höchstens eine Story aus dem Erststory-Flow.
-- Bestehende Zeilen haben first_story_draft_id = NULL und sind nicht betroffen.
CREATE UNIQUE INDEX IF NOT EXISTS saved_stories_one_first_story_per_user
    ON public.saved_stories (user_id)
    WHERE first_story_draft_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 3. Entwurf zur Bearbeitung sperren (verhindert parallele Erzeugung)
-- ---------------------------------------------------------------------------
-- Ein einziges UPDATE ... RETURNING: Rufen zwei Requests gleichzeitig auf,
-- bekommt nur einer die Zeile zurück. Hängengebliebene Sperren (z.B. nach
-- einem Timeout) dürfen nach p_stale_seconds neu übernommen werden.

CREATE OR REPLACE FUNCTION public.first_story_lock_draft(
    p_draft_id      uuid,
    p_max_attempts  integer DEFAULT 3,
    p_stale_seconds integer DEFAULT 150
)
RETURNS SETOF public.first_story_drafts
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.first_story_drafts d
     SET status     = 'processing',
         locked_at  = now(),
         attempts   = d.attempts + 1,
         last_error = NULL
   WHERE d.id = p_draft_id
     AND d.attempts < p_max_attempts
     AND (
           d.status IN ('pending', 'failed')
        OR (d.status = 'processing'
            AND d.locked_at < now() - make_interval(secs => p_stale_seconds))
         )
  RETURNING d.*;
$$;

COMMENT ON FUNCTION public.first_story_lock_draft(uuid, integer, integer) IS
  'Sperrt einen Entwurf atomar für die Story-/Audio-Erzeugung. Gibt nichts zurück, wenn bereits jemand daran arbeitet.';


-- ---------------------------------------------------------------------------
-- 4. Entwurf als Story speichern – idempotent
-- ---------------------------------------------------------------------------
-- Darf beliebig oft und parallel aufgerufen werden (Link-Klick, Hintergrund-
-- Erzeugung, Dashboard). Es entsteht höchstens eine saved_stories-Zeile.
-- Gibt die Story-ID zurück, oder NULL, solange der Entwurf noch nicht fertig
-- bzw. noch keinem Account zugeordnet ist.

CREATE OR REPLACE FUNCTION public.first_story_claim_draft(p_draft_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  d          public.first_story_drafts%ROWTYPE;
  v_story_id uuid;
BEGIN
  SELECT * INTO d
    FROM public.first_story_drafts
   WHERE id = p_draft_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF d.saved_story_id IS NOT NULL THEN
    RETURN d.saved_story_id;
  END IF;

  IF d.user_id IS NULL
     OR d.status <> 'ready'
     OR d.story_text IS NULL
     OR d.audio_url IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.saved_stories (
      user_id, title, content, resource_figure, question_answers,
      audio_url, voice_id, first_story_draft_id
  )
  VALUES (
      d.user_id, d.figure_name, d.story_text, to_jsonb(d.figure_name), d.question_answers,
      d.audio_url, d.voice_id, d.id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_story_id;

  IF v_story_id IS NULL THEN
    -- Schon gespeichert, oder der Account hat bereits eine Erststory:
    -- auf die vorhandene Story zeigen statt eine zweite anzulegen.
    SELECT s.id INTO v_story_id
      FROM public.saved_stories s
     WHERE s.first_story_draft_id = d.id
        OR (s.user_id = d.user_id AND s.first_story_draft_id IS NOT NULL)
     ORDER BY (s.first_story_draft_id = d.id) DESC, s.created_at ASC
     LIMIT 1;
  END IF;

  UPDATE public.first_story_drafts
     SET status         = 'claimed',
         saved_story_id = v_story_id,
         claimed_at     = now(),
         locked_at      = NULL
   WHERE id = d.id;

  RETURN v_story_id;
END;
$$;

COMMENT ON FUNCTION public.first_story_claim_draft(uuid) IS
  'Legt aus einem fertigen, zugeordneten Entwurf genau eine saved_stories-Zeile an (idempotent).';


-- Nur der Server darf die Funktionen aufrufen.
REVOKE ALL ON FUNCTION public.first_story_lock_draft(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.first_story_lock_draft(uuid, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.first_story_claim_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.first_story_claim_draft(uuid) TO service_role;

COMMIT;
