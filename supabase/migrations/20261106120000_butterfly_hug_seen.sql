-- Pflicht-Hinweis zur Klopfübung beim allerersten Abspielen einer Story.
-- NULL = noch nicht bestätigt. Gesetzt wird der Wert im Dashboard
-- (src/hooks/useButterflyHugGate.ts); die vorhandene Update-Policy auf profiles
-- erlaubt das für das eigene Profil.
--
-- Bestehende Accounts bleiben bewusst NULL: Sie sehen den Hinweis einmal.
--
-- Rollback: ALTER TABLE public.profiles DROP COLUMN IF EXISTS butterfly_hug_seen_at;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS butterfly_hug_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.butterfly_hug_seen_at IS 'Zeitpunkt, an dem die Klopfübung vor dem ersten Abspielen bestätigt wurde';
