-- Story-Zugang: 7 Tage kostenlose Erststory, Abo-Storys, privater Audio-Speicher
--
-- Regeln (saved_stories.access_policy):
--   'always'       – immer abspielbar. ALLE bestehenden Storys, alle Audio-only-
--                    Ressourcen, alles aus Therapiesitzungen, alles von Accounts
--                    ohne Stripe-Abo. Verhalten wie bisher.
--   'trial'        – Erststory aus dem Engel-Funnel: 7 Tage ab Speicherung im
--                    Account kostenlos, danach nur mit aktivem Zugang.
--   'subscription' – neue KI-Storys, die mit aktivem Stripe-Abo erstellt werden:
--                    abspielbar, solange ein Zugang aktiv ist.
--
-- Gelöscht wird nichts. Gesperrt wird nur die Wiedergabe: Das Audio gesperrter
-- Storys liegt im privaten Bucket story-audio-private und wird nur über
-- kurzlebige signierte Links ausgeliefert, nachdem der Server den Zugang
-- geprüft hat (src/lib/story-access/server.ts).
--
-- Außerdem geschlossen: Nutzer:innen konnten sich bisher per RLS/RPC selbst
-- einen Abo-Zugang eintragen.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Zugriffsregel pro Story. Bestehende Zeilen bekommen 'always'.
-- ---------------------------------------------------------------------------

ALTER TABLE public.saved_stories
    ADD COLUMN IF NOT EXISTS access_policy text NOT NULL DEFAULT 'always';

ALTER TABLE public.saved_stories
    ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saved_stories_access_policy_check'
  ) THEN
    ALTER TABLE public.saved_stories
      ADD CONSTRAINT saved_stories_access_policy_check
      CHECK (access_policy IN ('always', 'trial', 'subscription'));
  END IF;
END $$;

COMMENT ON COLUMN public.saved_stories.access_policy IS
  'always = immer abspielbar (Bestand, Therapie, Audio-only); trial = Erststory, 7 Tage gratis; subscription = nur mit aktivem Zugang.';
COMMENT ON COLUMN public.saved_stories.trial_ends_at IS
  'Nur bei access_policy = trial: Ende der kostenlosen 7 Tage.';

-- Erststorys aus dem neuen Funnel, die schon existieren (bisher nur Tests).
UPDATE public.saved_stories
   SET access_policy = 'trial',
       trial_ends_at = created_at + interval '7 days'
 WHERE first_story_draft_id IS NOT NULL
   AND access_policy = 'always';


-- ---------------------------------------------------------------------------
-- 2. Erster vollständiger Hördurchlauf der Erststory (Angebot nur einmal)
-- ---------------------------------------------------------------------------

ALTER TABLE public.first_story_drafts
    ADD COLUMN IF NOT EXISTS first_completed_at timestamptz;


-- ---------------------------------------------------------------------------
-- 3. Schutz: Aus dem Browser lassen sich Regel, Testende und Herkunft nicht
--    setzen oder ändern. Neue Storys bekommen ihre Regel hier, serverseitig.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.saved_stories_guard_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server (Service Role) und SQL-Editor setzen die Werte selbst.
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.first_story_draft_id := NULL;
    NEW.trial_ends_at := NULL;
    IF NEW.audio_url LIKE 'private-storage:%' THEN
      NEW.audio_url := NULL;
    END IF;

    -- Nur KI-Storys von Accounts mit aktivem STRIPE-Abo hängen am Abo.
    -- Manuelle Zugänge, Therapie-Accounts und Gratis-Storys bleiben 'always'.
    NEW.access_policy := CASE
      WHEN coalesce(NEW.is_audio_only, false) = false
       AND EXISTS (
             SELECT 1 FROM public.user_access a
              WHERE a.user_id = NEW.user_id
                AND a.status = 'active'
                AND a.subscription_status = 'active'
                AND a.stripe_subscription_id IS NOT NULL
                AND (a.access_expires_at IS NULL OR a.access_expires_at > now())
           )
      THEN 'subscription'
      ELSE 'always'
    END;
    RETURN NEW;
  END IF;

  -- UPDATE aus dem Browser
  NEW.access_policy := OLD.access_policy;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.first_story_draft_id := OLD.first_story_draft_id;

  -- Das Audio zugangsbeschränkter Storys bleibt, wie es ist. Nur wenn noch
  -- keins existiert, darf es (Dashboard: "Audio erstellen") nachgetragen werden.
  IF OLD.access_policy <> 'always' AND OLD.audio_url IS NOT NULL THEN
    NEW.audio_url := OLD.audio_url;
  END IF;
  IF NEW.audio_url LIKE 'private-storage:%' AND NEW.audio_url IS DISTINCT FROM OLD.audio_url THEN
    NEW.audio_url := OLD.audio_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saved_stories_guard_access ON public.saved_stories;
CREATE TRIGGER saved_stories_guard_access
    BEFORE INSERT OR UPDATE ON public.saved_stories
    FOR EACH ROW EXECUTE FUNCTION public.saved_stories_guard_access();

REVOKE ALL ON FUNCTION public.saved_stories_guard_access() FROM PUBLIC, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. Erststory speichern: jetzt mit 7-Tage-Regel
--    (gleiche Funktion wie in 20261017120000, ergänzt um access_policy/trial_ends_at)
--    Einstellbare Dauer: siehe 20261018180000_first_story_trial_length.sql
-- ---------------------------------------------------------------------------

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
      audio_url, voice_id, first_story_draft_id,
      access_policy, trial_ends_at
  )
  VALUES (
      d.user_id, d.figure_name, d.story_text, to_jsonb(d.figure_name), d.question_answers,
      d.audio_url, d.voice_id, d.id,
      'trial', now() + interval '7 days'
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

REVOKE ALL ON FUNCTION public.first_story_claim_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.first_story_claim_draft(uuid) TO service_role;


-- ---------------------------------------------------------------------------
-- 5. Privater Bucket für Audio zugangsbeschränkter Storys.
--    Keine Policies = nur der Server (Service Role) kann lesen und signieren.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('story-audio-private', 'story-audio-private', false)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 6. Selbst eingetragene Abos verhindern
--    Der Browser liest user_access nur (geprüft: alle Client-Zugriffe sind
--    SELECTs). Schreiben dürfen nur Stripe-Webhook und SQL-Funktionen.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert their own access" ON public.user_access;
DROP POLICY IF EXISTS "Users can update their own access" ON public.user_access;

-- Diese Funktionen legen Zugänge an und waren für jeden aufrufbar.
-- Aufgerufen werden sie nur vom Stripe-Webhook (Service Role).
REVOKE EXECUTE ON FUNCTION public.create_subscription_access(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_subscription_access(uuid, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_access_after_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_access_after_payment(uuid, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_access_after_payment(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_access_after_payment(uuid, text, text, text) TO service_role;

COMMIT;
