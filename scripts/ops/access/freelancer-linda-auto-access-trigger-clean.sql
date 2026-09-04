-- Automatischer Trigger fuer lindaromanova@outlook.de
-- Erstellt automatisch unbegrenzten Zugang, sobald Linda sich registriert

-- 1. Funktion: Erstellt automatisch Zugang fuer Linda
CREATE OR REPLACE FUNCTION public.create_freelancer_access_for_linda()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email = 'lindaromanova@outlook.de' THEN
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
            NEW.id,
            'subscription',
            0,
            999999,
            NOW(),
            NULL,
            'active',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            plan_type = 'subscription',
            resources_limit = 999999,
            access_expires_at = NULL,
            status = 'active',
            updated_at = NOW();
        
        RAISE NOTICE 'Automatischer Zugang fuer lindaromanova@outlook.de erstellt';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Erstelle Trigger
DROP TRIGGER IF EXISTS trigger_create_freelancer_access_for_linda ON auth.users;

CREATE TRIGGER trigger_create_freelancer_access_for_linda
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_freelancer_access_for_linda();

-- 3. Pruefe ob Trigger erstellt wurde
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_freelancer_access_for_linda';

