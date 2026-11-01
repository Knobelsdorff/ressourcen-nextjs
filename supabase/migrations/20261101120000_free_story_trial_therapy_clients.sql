-- Gratis-Story auch für Therapie-Klient:innen mit 7 Tagen Testphase
--
-- Bisher bekam die erste KI-Story nur dann 'trial', wenn der Account noch
-- GAR KEINE Story hatte. Klient:innen, denen Andreas eine Aufnahme aus der
-- Sitzung geschickt hat (is_audio_only = true, client_email gesetzt), haben
-- aber schon eine – ihre eine Gratis-Story bekam deshalb 'always' und wurde
-- nie gesperrt.
--
-- Jetzt zählen nur andere KI-Storys (is_audio_only nicht true). Das passt zu
-- canCreateResource (src/lib/access.ts), das für die Gratis-Story ebenfalls nur
-- KI-Storys zählt.
--
-- Unverändert:
--   - Audio-only-Ressourcen (Therapie, vom Admin geschickt) bleiben 'always' –
--     sie werden per Service Role angelegt, der Trigger fasst sie nicht an.
--   - Bestehende Storys ändern sich nicht (nur INSERT aus dem Browser).
--   - Wer schon eine KI-Story hat oder aktiven Zugang hat, bekommt kein 'trial'.
--
-- Der Server wendet dieselbe Regel in /api/first-story/free-trial an.
--
-- Zurück: 20261018200000_free_story_trial.sql erneut ausführen.

BEGIN;

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
    NEW.first_completed_at := NULL;
    IF NEW.audio_url LIKE 'private-storage:%' THEN
      NEW.audio_url := NULL;
    END IF;

    IF coalesce(NEW.is_audio_only, false) = false
       AND EXISTS (
             SELECT 1 FROM public.user_access a
              WHERE a.user_id = NEW.user_id
                AND a.status = 'active'
                AND a.subscription_status = 'active'
                AND a.stripe_subscription_id IS NOT NULL
                AND (a.access_expires_at IS NULL OR a.access_expires_at > now())
           )
    THEN
      -- KI-Story mit aktivem Stripe-Abo: hängt am Abo.
      NEW.access_policy := 'subscription';

    ELSIF coalesce(NEW.is_audio_only, false) = false
       AND jsonb_typeof(NEW.question_answers) = 'array'
       AND jsonb_array_length(NEW.question_answers) > 0
       AND NOT EXISTS (
             SELECT 1 FROM public.saved_stories s
              WHERE s.user_id = NEW.user_id
                AND s.is_audio_only IS NOT TRUE
           )
       AND NOT EXISTS (
             SELECT 1 FROM public.user_access a
              WHERE a.user_id = NEW.user_id
                AND a.status = 'active'
                AND (a.access_expires_at IS NULL OR a.access_expires_at > now())
           )
    THEN
      -- Erste eigene KI-Story eines Accounts ohne Zugang: 7 Tage kostenlos –
      -- auch wenn die Klient:in schon Audio-only-Ressourcen aus der Therapie hat.
      NEW.access_policy := 'trial';
      NEW.trial_ends_at := now() + interval '7 days';

    ELSE
      -- Manuelle Zugänge, Therapie-Accounts, Audio-only: wie bisher.
      NEW.access_policy := 'always';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE aus dem Browser
  NEW.access_policy := OLD.access_policy;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.first_story_draft_id := OLD.first_story_draft_id;
  NEW.first_completed_at := OLD.first_completed_at;

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

REVOKE ALL ON FUNCTION public.saved_stories_guard_access() FROM PUBLIC, anon, authenticated;

COMMIT;
