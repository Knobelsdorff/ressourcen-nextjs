-- Nach dem Einspielen von 20261018120000_story_access_paywall.sql ausführen.
-- NUR LESEND. Jede Abfrage nennt das erwartete Ergebnis.

-- 1) Verteilung der Zugriffsregeln.
--    Erwartet direkt nach dem Einspielen:
--      always       = alle bisherigen Storys
--      trial        = nur Storys aus dem neuen Erststory-Flow (bisher Tests)
--      subscription = 0
SELECT access_policy, count(*) AS stories,
       count(*) FILTER (WHERE is_audio_only) AS audio_only,
       count(*) FILTER (WHERE first_story_draft_id IS NOT NULL) AS from_first_story_flow
FROM public.saved_stories
GROUP BY access_policy
ORDER BY access_policy;

-- 2) Sicherheitscheck: Keine Audio-only-/Therapie-Ressource darf etwas anderes als 'always' sein.
--    Erwartet: 0
SELECT count(*) AS must_be_zero
FROM public.saved_stories
WHERE access_policy <> 'always'
  AND (is_audio_only OR client_email IS NOT NULL);

-- 3) Der private Bucket existiert und ist nicht öffentlich.
--    Erwartet: eine Zeile, public = false
SELECT id, public FROM storage.buckets WHERE id = 'story-audio-private';

-- 4) Storage-Policies, die NICHT auf einen bestimmten Bucket beschränkt sind,
--    würden auch den privaten Bucket öffnen.
--    Erwartet: keine Zeilen (sonst bitte melden, bevor Storys gesperrt werden)
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND coalesce(qual, '') NOT LIKE '%bucket_id%'
  AND coalesce(with_check, '') NOT LIKE '%bucket_id%';

-- 5) Storage-Policies, die den privaten Bucket ausdrücklich nennen.
--    Erwartet: keine Zeilen
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND (coalesce(qual, '') LIKE '%story-audio-private%' OR coalesce(with_check, '') LIKE '%story-audio-private%');

-- 6) user_access: Der Browser darf nur noch lesen.
--    Erwartet: nur eine SELECT-Policy ("Users can view their own access")
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_access';

-- 7) Zugänge anlegen dürfen nur noch Server-Rollen.
--    Erwartet: anon = false, authenticated = false, service_role = true
SELECT p.oid::regprocedure AS function,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
       has_function_privilege('service_role', p.oid, 'EXECUTE')  AS service_role
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_subscription_access', 'create_access_after_payment');

-- 8) Bestehende Abonnent:innen: Alle ihre bisherigen Storys sind 'always'.
--    Erwartet: 0
SELECT count(*) AS must_be_zero
FROM public.saved_stories s
JOIN public.user_access a ON a.user_id = s.user_id
WHERE a.stripe_subscription_id IS NOT NULL
  AND s.access_policy <> 'always'
  AND s.first_story_draft_id IS NULL
  AND s.created_at < '2026-10-18';
