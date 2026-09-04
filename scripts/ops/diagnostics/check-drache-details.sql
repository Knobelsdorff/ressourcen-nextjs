-- Prüfe Details der Ressource "Drache"
-- Führe dieses Skript im Supabase SQL Editor aus

-- 1. Prüfe ob "Drache" eine Audio-only Ressource ist
SELECT 
    ss.id,
    ss.title,
    ss.resource_figure,
    ss.is_audio_only,
    ss.content,
    ss.audio_url,
    ss.voice_id,
    ss.client_email,
    ss.user_id,
    u.email as user_email,
    ss.created_at
FROM public.saved_stories ss
LEFT JOIN auth.users u ON ss.user_id = u.id
WHERE 
    ss.id = 'd32821cf-89de-40ca-b13d-dc0063258ad4' OR
    (ss.title = 'Drache' AND (u.email = 'sabelleka@gmail.com' OR ss.client_email = 'sabelleka@gmail.com'))
ORDER BY ss.created_at DESC;


