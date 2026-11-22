-- ROLLBACK für supabase/migrations/20261120120000_site_texts.sql
--
-- Gefahrlos für die Seite: Ohne die Tabellen zeigt der Code überall die
-- Original-Texte aus src/content/texts. ACHTUNG: Alle veröffentlichten
-- Textänderungen, Entwürfe und der Verlauf gehen dabei verloren. Wer sie
-- behalten will, exportiert vorher site_texts (z. B. als CSV im Table Editor).

BEGIN;

DROP FUNCTION IF EXISTS public.publish_site_texts(text, text[], uuid);
DROP TABLE IF EXISTS public.site_text_revisions;
DROP TABLE IF EXISTS public.site_text_drafts;
DROP TABLE IF EXISTS public.site_texts;

COMMIT;
