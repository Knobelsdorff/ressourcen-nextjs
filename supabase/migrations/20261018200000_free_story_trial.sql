-- Kostenlose erste Story auch bei normaler Registrierung (ohne Engel-Funnel)
--
-- Bisher bekam nur die Engel-Erststory die Testphase (access_policy = 'trial').
-- Wer sich normal registriert und im Dashboard seine erste Story erstellt,
-- bekam 'always' – sie wurde nie gesperrt. Jetzt gilt für beide Wege dasselbe:
--   7 Tage kostenlos ab Speichern, danach nur mit aktivem Zugang,
--   einmal das Abo-Angebot nach dem ersten vollständigen Hören.
--
-- Die Regel setzt der Trigger beim INSERT aus dem Browser (nicht umgehbar).
-- Er setzt immer 7 Tage; der Server kürzt danach auf FIRST_STORY_TRIAL_MINUTES,
-- falls gesetzt (lokal zum Testen, /api/first-story/free-trial).
--
-- 'trial' bekommt eine Story nur, wenn ALLES zutrifft:
--   - KI-Story (nicht Audio-only) mit Antworten (question_answers nicht leer –
--     alte Ankommen-Kopien werden ohne Antworten gespeichert),
--   - der Account hat noch KEINE einzige Story (Therapie-Klient:innen haben
--     ihre Audio-only-Ressourcen → bleiben wie bisher bei 'always'),
--   - kein aktiver Zugang (Stripe-Abo → 'subscription', manueller Zugang → 'always').
--
-- Bestehende Storys ändern sich nicht.
--
-- Zurück zum vorherigen Verhalten: saved_stories_guard_access() aus
-- 20261018120000_story_access_paywall.sql erneut ausführen (Spalte kann bleiben).

BEGIN;

-- Erster vollständiger Hördurchlauf (Angebot nur einmal) – für Storys ohne
-- Engel-Entwurf. Engel-Storys merken sich das weiter am Entwurf.
ALTER TABLE public.saved_stories
    ADD COLUMN IF NOT EXISTS first_completed_at timestamptz;

COMMENT ON COLUMN public.saved_stories.first_completed_at IS
  'Erstes vollständiges Hören einer Gratis-Story (ohne Engel-Entwurf); steuert das einmalige Abo-Angebot.';


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
       AND NOT EXISTS (SELECT 1 FROM public.saved_stories s WHERE s.user_id = NEW.user_id)
       AND NOT EXISTS (
             SELECT 1 FROM public.user_access a
              WHERE a.user_id = NEW.user_id
                AND a.status = 'active'
                AND (a.access_expires_at IS NULL OR a.access_expires_at > now())
           )
    THEN
      -- Erste eigene Story eines Accounts ohne Zugang: 7 Tage kostenlos.
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
