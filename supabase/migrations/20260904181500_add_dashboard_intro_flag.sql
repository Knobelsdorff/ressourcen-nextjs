-- Add has_seen_dashboard_intro flag to profiles
-- Referenced by src/app/dashboard/page.tsx but missing from production schema.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_dashboard_intro BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.has_seen_dashboard_intro IS 'Flag, das anzeigt, ob der User die Dashboard-Intro-Überschrift bereits gesehen hat';
