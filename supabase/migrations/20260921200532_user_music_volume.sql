-- Nutzer-eigene Lautstärke für Hintergrundmusik
--
-- Hintergrund: background_music_tracks.volume ist eine globale Admin-Einstellung
-- pro Track. Klient:innen berichten, dass je nach Stimme und Track eine andere
-- Musik-Lautstärke nötig ist. Dieser Faktor erlaubt es, die Admin-Vorgabe
-- individuell anzupassen, ohne sie für alle anderen zu verändern.
--
-- Semantik: Faktor, kein Absolutwert. Effektive Lautstärke =
--   clamp(track.volume * profiles.music_volume_factor, 0, 1)
-- 1.00 = unverändert (Admin-Vorgabe), 0.00 = Musik aus, 3.00 = dreifach.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS music_volume_factor numeric(4,2) NOT NULL DEFAULT 1.00;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_music_volume_factor_range;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_music_volume_factor_range
  CHECK (music_volume_factor >= 0 AND music_volume_factor <= 3);

COMMENT ON COLUMN public.profiles.music_volume_factor IS
  'Nutzer-Faktor auf die Admin-Lautstärke der Hintergrundmusik (0.00-3.00, Standard 1.00 = Admin-Vorgabe unverändert).';
