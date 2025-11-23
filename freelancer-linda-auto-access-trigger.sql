-- Automatischer Trigger für lindaromanova@outlook.de
-- Erstellt automatisch unbegrenzten Zugang, sobald Linda sich registriert
-- Führe dieses Skript JETZT aus - es richtet alles vorab ein

-- 1. Funktion: Erstellt automatisch Zugang für Linda
CREATE OR REPLACE FUNCTION public.create_freelancer_access_for_linda()
RETURNS TRIGGER AS $$
BEGIN
    -- Prüfe ob es Linda's Email ist
    IF NEW.email = 'lindaromanova@outlook.de' THEN
        -- Erstelle automatisch unbegrenzten Zugang
        INSERT INTO public.user_access (
            user_id,
            plan_type,
            resources_created,
            resources_limit,
            access_starts_at,
            access_expires_at,
            status,
            created_at,
            updated_at
        ) VALUES (
            NEW.id, -- User-ID des neu registrierten Users
            'subscription', -- Behandelt wie ein Abo
            0, -- Noch keine Ressourcen erstellt
            999999, -- Unbegrenzte Ressourcen
            NOW(), -- Startet jetzt
            NULL, -- Kein Ablaufdatum (unbegrenzt)
            'active', -- Aktiv
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            plan_type = 'subscription',
            resources_limit = 999999,
            access_expires_at = NULL,
            status = 'active',
            updated_at = NOW();
        
        RAISE NOTICE 'Automatischer Zugang für lindaromanova@outlook.de erstellt!';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Erstelle Trigger, der nach User-Registrierung ausgelöst wird
DROP TRIGGER IF EXISTS trigger_create_freelancer_access_for_linda ON auth.users;

CREATE TRIGGER trigger_create_freelancer_access_for_linda
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_freelancer_access_for_linda();

-- 3. Prüfe ob Trigger erstellt wurde
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_freelancer_access_for_linda';

-- 4. Info
DO $$
BEGIN
    RAISE NOTICE 'Trigger erfolgreich erstellt!';
    RAISE NOTICE 'Sobald sich lindaromanova@outlook.de registriert, wird automatisch ein unbegrenzter Zugang erstellt.';
    RAISE NOTICE 'Du musst nichts weiter tun - alles laeuft automatisch!';
END $$;

