-- Migration: App Config für Beispiel-Ressourcenfigur
-- Führe dieses Skript in der Supabase SQL Editor aus

-- Erstelle app_config Tabelle
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Lösche bestehende Policies falls vorhanden
DROP POLICY IF EXISTS "app_config_select_policy" ON public.app_config;
DROP POLICY IF EXISTS "app_config_insert_policy" ON public.app_config;
DROP POLICY IF EXISTS "app_config_update_policy" ON public.app_config;

-- Policy: Öffentlich lesbar (für alle User, auch nicht eingeloggte)
CREATE POLICY "app_config_select_policy" ON public.app_config
  FOR SELECT USING (true);

-- Policy: Nur Admins können schreiben
CREATE POLICY "app_config_insert_policy" ON public.app_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND LOWER(auth.users.email) = ANY(
        SELECT LOWER(unnest(string_to_array(current_setting('app.settings.admin_emails', true), ',')))
        WHERE current_setting('app.settings.admin_emails', true) IS NOT NULL
      )
    )
  );

CREATE POLICY "app_config_update_policy" ON public.app_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND LOWER(auth.users.email) = ANY(
        SELECT LOWER(unnest(string_to_array(current_setting('app.settings.admin_emails', true), ',')))
        WHERE current_setting('app.settings.admin_emails', true) IS NOT NULL
      )
    )
  );

-- Kommentar hinzufügen
COMMENT ON TABLE public.app_config IS 'Speichert App-Konfigurationen wie Beispiel-Ressourcenfigur-ID';

