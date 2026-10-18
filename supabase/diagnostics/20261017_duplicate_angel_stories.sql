-- Diagnose: mehrfache Engel-Storys pro Account (NUR LESEND, ändert nichts)
--
-- Beantwortet, WIE die Mehrfach-Storys entstanden sind:
--   distinct_texts = stories  -> jede Zeile ist eine eigene Erzeugung
--                                (mehrere Tabs / Neustart der Vorbereitung)
--   distinct_texts < stories  -> dieselbe Story wurde mehrfach gespeichert
--                                (parallele Speicherpfade im Browser)

-- 1) Übersicht pro Account
SELECT
    s.user_id,
    p.email,
    count(*)                                        AS stories,
    count(DISTINCT md5(coalesce(s.content, '')))    AS distinct_texts,
    count(DISTINCT s.audio_url)                     AS distinct_audios,
    min(s.created_at)                               AS first_created,
    max(s.created_at)                               AS last_created,
    max(s.created_at) - min(s.created_at)           AS time_span
FROM public.saved_stories s
LEFT JOIN public.profiles p ON p.id = s.user_id
WHERE coalesce(s.is_audio_only, false) = false
  AND (
        s.title = 'Engel'
     OR (s.resource_figure #>> '{}') = 'Engel'
     OR s.resource_figure ->> 'name' = 'Engel'
  )
GROUP BY s.user_id, p.email
HAVING count(*) > 1
ORDER BY stories DESC, last_created DESC;


-- 2) Einzelne Zeilen mit Abstand zur vorherigen Story desselben Accounts
--    (Sekunden = Speicher-Race, Minuten = neue Erzeugung)
SELECT
    p.email,
    s.id,
    s.created_at,
    s.created_at - lag(s.created_at) OVER w        AS gap_to_previous,
    left(md5(coalesce(s.content, '')), 10)          AS content_hash,
    s.audio_url
FROM public.saved_stories s
LEFT JOIN public.profiles p ON p.id = s.user_id
WHERE coalesce(s.is_audio_only, false) = false
  AND (
        s.title = 'Engel'
     OR (s.resource_figure #>> '{}') = 'Engel'
     OR s.resource_figure ->> 'name' = 'Engel'
  )
  AND s.user_id IN (
      SELECT user_id
        FROM public.saved_stories
       WHERE coalesce(is_audio_only, false) = false
         AND (title = 'Engel' OR (resource_figure #>> '{}') = 'Engel')
       GROUP BY user_id
      HAVING count(*) > 1
  )
WINDOW w AS (PARTITION BY s.user_id ORDER BY s.created_at)
ORDER BY p.email, s.created_at;


-- 3) Exakte Doppelungen über ALLE Figuren (gleicher Account + gleiches Audio)
SELECT
    p.email,
    s.title,
    s.audio_url,
    count(*)            AS copies,
    min(s.created_at)   AS first_created,
    max(s.created_at)   AS last_created
FROM public.saved_stories s
LEFT JOIN public.profiles p ON p.id = s.user_id
WHERE s.audio_url IS NOT NULL
  AND s.user_id IS NOT NULL
GROUP BY p.email, s.user_id, s.title, s.audio_url
HAVING count(*) > 1
ORDER BY copies DESC;
