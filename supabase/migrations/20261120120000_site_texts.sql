-- Bearbeitbare Seitentexte (Admin-Texteditor)
--
-- Alle Texte stehen mit Schlüssel und Original im Code (src/content/texts).
-- Hier liegt nur, was ein Admin davon abweichend geändert hat:
--
--   site_texts           veröffentlicht – das sehen Besucher
--   site_text_drafts     Entwürfe – sehen nur Admins im Bearbeitungsmodus
--   site_text_revisions  Verlauf: wer hat wann was veröffentlicht
--
-- Gelesen und geschrieben wird ausschließlich vom Server (Service Role):
-- RLS ist an, es gibt bewusst keine Policies. Besucher lesen die Texte nie
-- direkt aus Supabase – der Server cached sie (Next.js-Tag "site-texts") und
-- fragt die Datenbank erst nach dem nächsten Veröffentlichen wieder.
--
-- Der Code funktioniert auch ohne diese Tabellen: dann erscheinen überall die
-- Original-Texte und der Editor meldet, dass die Datenbank fehlt.
-- Zurück: supabase/rollback/20261120120000_site_texts_down.sql

BEGIN;

-- ── Veröffentlichte Texte ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_texts (
    locale      text        NOT NULL DEFAULT 'de',
    key         text        NOT NULL,
    value       text        NOT NULL,
    -- Prüfsumme des Original-Texts im Code zum Zeitpunkt der Änderung.
    -- Weicht sie später ab, zeigt der Editor "Original im Code wurde geändert".
    base_hash   text,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    updated_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (locale, key),
    CONSTRAINT site_texts_locale_format CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    CONSTRAINT site_texts_key_format    CHECK (key ~ '^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_-]+)+$' AND char_length(key) <= 150),
    CONSTRAINT site_texts_value_length  CHECK (char_length(value) BETWEEN 1 AND 20000)
);

COMMENT ON TABLE public.site_texts IS
  'Veröffentlichte Abweichungen vom Original-Text im Code (src/content/texts). Fehlt ein Schlüssel, gilt das Original.';

-- ── Entwürfe ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_text_drafts (
    locale      text        NOT NULL DEFAULT 'de',
    key         text        NOT NULL,
    -- NULL = beim Veröffentlichen zurück auf das Original aus dem Code.
    value       text,
    base_hash   text,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    updated_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (locale, key),
    CONSTRAINT site_text_drafts_locale_format CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    CONSTRAINT site_text_drafts_key_format    CHECK (key ~ '^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_-]+)+$' AND char_length(key) <= 150),
    CONSTRAINT site_text_drafts_value_length  CHECK (value IS NULL OR char_length(value) BETWEEN 1 AND 20000)
);

COMMENT ON TABLE public.site_text_drafts IS
  'Noch nicht veröffentlichte Textänderungen der Admins. value NULL = zurück auf das Original.';

-- ── Verlauf ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_text_revisions (
    id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    locale      text        NOT NULL DEFAULT 'de',
    key         text        NOT NULL,
    old_value   text,       -- NULL = vorher galt das Original
    new_value   text,       -- NULL = zurück auf das Original
    base_hash   text,
    changed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_text_revisions_key_idx
    ON public.site_text_revisions (locale, key, changed_at DESC);
CREATE INDEX IF NOT EXISTS site_text_revisions_changed_at_idx
    ON public.site_text_revisions (changed_at DESC);

COMMENT ON TABLE public.site_text_revisions IS
  'Jede Veröffentlichung einer Textänderung (alt → neu, wer, wann).';

-- ── Zugriff: nur Service Role ───────────────────────────────────────────────
ALTER TABLE public.site_texts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_text_drafts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_text_revisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.site_texts, public.site_text_drafts, public.site_text_revisions FROM anon, authenticated;
GRANT ALL ON TABLE public.site_texts, public.site_text_drafts, public.site_text_revisions TO service_role;

-- ── Veröffentlichen: Entwürfe → site_texts + Verlauf, in einer Transaktion ──
CREATE OR REPLACE FUNCTION public.publish_site_texts(
    p_locale text,
    p_keys   text[],
    p_actor  uuid
)
RETURNS TABLE (text_key text, action text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    d       record;
    v_old   text;
    v_found boolean;
BEGIN
    FOR d IN
        SELECT dr.key, dr.value, dr.base_hash
        FROM public.site_text_drafts dr
        WHERE dr.locale = p_locale
          AND dr.key = ANY (p_keys)
        ORDER BY dr.key
        FOR UPDATE
    LOOP
        SELECT st.value INTO v_old
        FROM public.site_texts st
        WHERE st.locale = p_locale AND st.key = d.key
        FOR UPDATE;
        v_found := FOUND;

        IF d.value IS NULL THEN
            IF v_found THEN
                DELETE FROM public.site_texts st WHERE st.locale = p_locale AND st.key = d.key;
                INSERT INTO public.site_text_revisions (locale, key, old_value, new_value, base_hash, changed_by)
                VALUES (p_locale, d.key, v_old, NULL, d.base_hash, p_actor);
                text_key := d.key; action := 'reset'; RETURN NEXT;
            ELSE
                text_key := d.key; action := 'unchanged'; RETURN NEXT;
            END IF;
        ELSIF v_found AND v_old = d.value THEN
            text_key := d.key; action := 'unchanged'; RETURN NEXT;
        ELSE
            INSERT INTO public.site_texts AS st (locale, key, value, base_hash, updated_at, updated_by)
            VALUES (p_locale, d.key, d.value, d.base_hash, now(), p_actor)
            ON CONFLICT ON CONSTRAINT site_texts_pkey DO UPDATE
                SET value = EXCLUDED.value,
                    base_hash = EXCLUDED.base_hash,
                    updated_at = now(),
                    updated_by = EXCLUDED.updated_by;
            INSERT INTO public.site_text_revisions (locale, key, old_value, new_value, base_hash, changed_by)
            VALUES (p_locale, d.key, CASE WHEN v_found THEN v_old END, d.value, d.base_hash, p_actor);
            text_key := d.key; action := 'published'; RETURN NEXT;
        END IF;

        DELETE FROM public.site_text_drafts dr WHERE dr.locale = p_locale AND dr.key = d.key;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_site_texts(text, text[], uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_site_texts(text, text[], uuid) TO service_role;

COMMENT ON FUNCTION public.publish_site_texts(text, text[], uuid) IS
  'Veröffentlicht die genannten Entwürfe: schreibt site_texts, legt Verlauf an, löscht die Entwürfe. Nur Service Role.';

COMMIT;
