-- Browser-Fingerprint-Tracking für anonyme Ressourcen-Erstellung
-- Führe dieses Skript in der Supabase SQL Editor aus

-- 1. Erstelle die anonymous_resource_creations Tabelle
CREATE TABLE IF NOT EXISTS public.anonymous_resource_creations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    browser_fingerprint TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(browser_fingerprint)
);

-- 2. Aktiviere RLS (Row Level Security)
ALTER TABLE public.anonymous_resource_creations ENABLE ROW LEVEL SECURITY;

-- 3. Lösche bestehende Policies
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.anonymous_resource_creations;
DROP POLICY IF EXISTS "Allow anonymous select" ON public.anonymous_resource_creations;

-- 4. Erstelle Policies (anonyme User können nur eigene Einträge sehen/erstellen)
-- Da wir keinen auth.uid() haben, erlauben wir INSERT für alle, SELECT nur für Service Role
CREATE POLICY "Allow anonymous insert" ON public.anonymous_resource_creations
    FOR INSERT WITH CHECK (true);

-- Service Role kann alles sehen (für API-Prüfung)
-- Anonyme User können nichts sehen (Security)

-- 5. Index für Performance
CREATE INDEX IF NOT EXISTS idx_anonymous_resource_creations_fingerprint ON public.anonymous_resource_creations(browser_fingerprint);
CREATE INDEX IF NOT EXISTS idx_anonymous_resource_creations_created_at ON public.anonymous_resource_creations(created_at);

-- 6. Kommentare
COMMENT ON TABLE public.anonymous_resource_creations IS 'Trackt anonyme Ressourcen-Erstellungen pro Browser-Fingerprint (max. 1 pro Fingerprint)';
COMMENT ON COLUMN public.anonymous_resource_creations.browser_fingerprint IS 'Eindeutiger Browser-Fingerprint (Canvas, WebGL, Fonts, etc.)';
COMMENT ON COLUMN public.anonymous_resource_creations.ip_address IS 'IP-Adresse des Users (optional, für zusätzliches Tracking)';

