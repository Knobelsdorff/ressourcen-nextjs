-- Langzeit-Zugangslinks für Klienten
--
-- Ersetzt die 24h-Supabase-Recovery-Links, die in der Praxis abgelaufen sind,
-- bevor die Klient:innen sie geöffnet haben. Ein Invite bleibt 60 Tage gültig
-- und überlebt beliebig viele Öffnungen. Er endet nur, wenn
--   a) die Klient:in ein Passwort gesetzt hat (consumed_at), oder
--   b) die 60 Tage abgelaufen sind (expires_at), oder
--   c) ein Admin ihn widerrufen hat (revoked_at).
--
-- Gespeichert wird ausschließlich der SHA-256-Hash des Tokens. Der Klartext
-- existiert nur in der versendeten E-Mail.

CREATE TABLE IF NOT EXISTS public.power_story_invites (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash    text NOT NULL UNIQUE,
    email         text NOT NULL,
    user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id   uuid REFERENCES public.saved_stories(id) ON DELETE SET NULL,
    created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at    timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
    revoked_at    timestamptz,
    consumed_at   timestamptz,
    use_count     integer NOT NULL DEFAULT 0,
    last_used_at  timestamptz,
    last_used_ip  text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.power_story_invites OWNER TO postgres;

COMMENT ON TABLE public.power_story_invites IS
  'Langlebige, widerrufbare Zugangslinks für Klienten. Ersetzt die 24h-Supabase-Recovery-Links.';
COMMENT ON COLUMN public.power_story_invites.token_hash IS
  'SHA-256-Hash des Tokens. Der Klartext existiert nur in der versendeten E-Mail.';
COMMENT ON COLUMN public.power_story_invites.consumed_at IS
  'Zeitpunkt, zu dem die Klient:in ein Passwort gesetzt hat. Erst dann verliert der Link seine Gültigkeit.';
COMMENT ON COLUMN public.power_story_invites.use_count IS
  'Nur zur Nachvollziehbarkeit. Der Link bleibt unabhängig von der Anzahl der Öffnungen gültig.';
COMMENT ON COLUMN public.power_story_invites.expires_at IS
  'Standard: 60 Tage. Über den Spalten-Default änderbar, ohne Code-Deployment.';

CREATE INDEX IF NOT EXISTS power_story_invites_email_idx
    ON public.power_story_invites (lower(email));

CREATE INDEX IF NOT EXISTS power_story_invites_active_idx
    ON public.power_story_invites (expires_at)
    WHERE revoked_at IS NULL AND consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS power_story_invites_user_idx
    ON public.power_story_invites (user_id);

ALTER TABLE public.power_story_invites ENABLE ROW LEVEL SECURITY;

-- Einlösung läuft ausschließlich serverseitig über den Service-Role-Key.
-- Kein anon/authenticated Zugriff auf die Tabelle.
DROP POLICY IF EXISTS "Service role can manage invites" ON public.power_story_invites;
CREATE POLICY "Service role can manage invites"
  ON public.power_story_invites
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can read invites" ON public.power_story_invites;
CREATE POLICY "Admins can read invites"
  ON public.power_story_invites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE users.id = auth.uid()
      AND (users.email)::text = ANY (ARRAY[
        'heilung@knobelsdorff-therapie.de'::text,
        'andreas@knobelsdorff-therapie.de'::text
      ])
  ));


-- Einlösung: ein einziges atomares UPDATE ... RETURNING, damit parallele Klicks
-- (E-Mail-Scanner, Doppelklick) nicht zu Race-Conditions führen.
--
-- Wichtig: Es gibt bewusst KEINE Prüfung auf use_count. Der Link darf beliebig
-- oft geöffnet werden; nur consumed_at / revoked_at / expires_at beenden ihn.
CREATE OR REPLACE FUNCTION public.redeem_power_story_invite(
    p_token_hash text,
    p_ip text DEFAULT NULL
)
RETURNS TABLE (invite_id uuid, invite_email text, invite_user_id uuid, invite_resource_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.power_story_invites i
     SET use_count    = i.use_count + 1,
         last_used_at = now(),
         last_used_ip = p_ip
   WHERE i.token_hash  = p_token_hash
     AND i.revoked_at  IS NULL
     AND i.consumed_at IS NULL
     AND i.expires_at  > now()
  RETURNING i.id, i.email, i.user_id, i.resource_id;
END;
$$;

COMMENT ON FUNCTION public.redeem_power_story_invite(text, text) IS
  'Löst einen Zugangslink ein und zählt die Nutzung mit. Begrenzt die Anzahl der Öffnungen NICHT.';


-- Wird aufgerufen, sobald die Klient:in tatsächlich ein Passwort gesetzt hat.
-- Ab diesem Moment werden alle offenen Invites dieser Person entwertet.
CREATE OR REPLACE FUNCTION public.consume_power_story_invites(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.power_story_invites
     SET consumed_at = now()
   WHERE user_id = p_user_id
     AND consumed_at IS NULL
     AND revoked_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.consume_power_story_invites(uuid) IS
  'Entwertet alle offenen Zugangslinks einer Person, sobald ein Passwort gesetzt wurde.';


-- Die Funktionen sind SECURITY DEFINER und dürfen nur vom Server (Service Role)
-- aufgerufen werden, niemals direkt von Client-Sessions.
REVOKE ALL ON FUNCTION public.redeem_power_story_invite(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_power_story_invite(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_power_story_invite(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_power_story_invite(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.consume_power_story_invites(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_power_story_invites(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.consume_power_story_invites(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_power_story_invites(uuid) TO service_role;
