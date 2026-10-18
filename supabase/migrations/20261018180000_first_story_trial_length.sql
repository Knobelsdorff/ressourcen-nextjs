-- Erststory: Dauer der Testphase einstellbar
--
-- first_story_claim_draft bekommt einen zweiten Parameter p_trial_seconds
-- (Standard 7 Tage). Der Server übergibt FIRST_STORY_TRIAL_MINUTES * 60 –
-- lokal z.B. 1 Minute zum Testen, in Produktion ohne Variable 7 Tage.
--
-- Die bisherige Variante ohne Dauer wird entfernt: Zwei Varianten nebeneinander
-- wären für PostgREST mehrdeutig. Der Server-Code ruft bis zum Einspielen
-- automatisch die alte Variante auf (Rückfall bei PGRST202).
--
-- Betrifft nur NEU gespeicherte Erststorys. Bestehende trial_ends_at bleiben.

BEGIN;

DROP FUNCTION IF EXISTS public.first_story_claim_draft(uuid);

CREATE OR REPLACE FUNCTION public.first_story_claim_draft(
    p_draft_id      uuid,
    p_trial_seconds integer DEFAULT 604800
)
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
      audio_url, voice_id, first_story_draft_id,
      access_policy, trial_ends_at
  )
  VALUES (
      d.user_id, d.figure_name, d.story_text, to_jsonb(d.figure_name), d.question_answers,
      d.audio_url, d.voice_id, d.id,
      'trial', now() + make_interval(secs => greatest(coalesce(p_trial_seconds, 604800), 1))
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_story_id;

  IF v_story_id IS NULL THEN
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

COMMENT ON FUNCTION public.first_story_claim_draft(uuid, integer) IS
  'Legt aus einem fertigen, zugeordneten Entwurf genau eine saved_stories-Zeile an (idempotent). p_trial_seconds = Dauer der Testphase.';

REVOKE ALL ON FUNCTION public.first_story_claim_draft(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.first_story_claim_draft(uuid, integer) TO service_role;

COMMIT;
