

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_access_audio_resource"("user_uuid" "uuid", "resource_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    resource_exists BOOLEAN;
    is_audio_only_flag BOOLEAN;
BEGIN
    -- Prüfe ob Ressource existiert und dem User gehört
    SELECT EXISTS (
        SELECT 1 FROM public.saved_stories
        WHERE id = resource_id
        AND user_id = user_uuid
    ) INTO resource_exists;
    
    IF NOT resource_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Prüfe ob es eine Audio-only Ressource ist
    SELECT is_audio_only INTO is_audio_only_flag
    FROM public.saved_stories
    WHERE id = resource_id;
    
    -- Nur Audio-only Ressourcen durch diese Funktion prüfen
    IF is_audio_only_flag = true THEN
        -- Für jetzt: Audio-Ressourcen sind immer zugänglich
        -- Später: Google Calendar Check hier einbauen
        RETURN TRUE;
    END IF;
    
    -- Für KI-generierte Ressourcen: false zurückgeben (wird anders geprüft)
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_access_audio_resource"("user_uuid" "uuid", "resource_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_access_audio_resource"("user_uuid" "uuid", "resource_id" "uuid") IS 'Prüft ob User Audio-Ressource abspielen kann. Für jetzt: Immer true. Später: Google Calendar Integration.';



CREATE OR REPLACE FUNCTION "public"."can_create_ai_resource"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    ai_resource_count INTEGER;
BEGIN
    -- Zähle nur KI-generierte Ressourcen (ignoriere Audio-only)
    SELECT COUNT(*) INTO ai_resource_count
    FROM public.saved_stories
    WHERE user_id = user_uuid
    AND (is_audio_only IS NULL OR is_audio_only = false);
    
    -- Erste KI-Ressource ist gratis
    IF ai_resource_count = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Ab 2. KI-Ressource: Prüfe aktives Abo
    RETURN EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
        AND subscription_status = 'active' -- Nur aktive Abos
        AND (access_expires_at IS NULL OR access_expires_at > NOW())
    );
END;
$$;


ALTER FUNCTION "public"."can_create_ai_resource"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_create_ai_resource"("user_uuid" "uuid") IS 'Prüft ob User KI-generierte Ressource erstellen kann. Erste Ressource gratis (3 Tage Trial), ab 2. benötigt aktives Abo.';



CREATE OR REPLACE FUNCTION "public"."can_create_resource"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Verwende die neue Funktion für KI-Ressourcen
    RETURN public.can_create_ai_resource(user_uuid);
END;
$$;


ALTER FUNCTION "public"."can_create_resource"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_create_resource"("user_uuid" "uuid") IS 'Prüft ob User noch Ressourcen erstellen kann. 1. Ressource gratis (3 Tage Trial), ab 2. benötigt 5er-Paket (4 weitere Ressourcen).';



CREATE OR REPLACE FUNCTION "public"."can_register_from_ip"("ip_address_text" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    registration_count INTEGER;
BEGIN
    -- Zähle erfolgreiche Registrierungen in den letzten 24 Stunden
    SELECT COUNT(*) INTO registration_count
    FROM public.registration_attempts
    WHERE ip_address = ip_address_text::INET
    AND success = TRUE
    AND created_at > NOW() - INTERVAL '24 hours';
    
    -- Maximal 2 Registrierungen pro IP pro 24h
    RETURN registration_count < 2;
END;
$$;


ALTER FUNCTION "public"."can_register_from_ip"("ip_address_text" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_register_from_ip"("ip_address_text" "text") IS 'Prüft ob eine IP-Adresse noch weitere Registrierungen durchführen darf (Max 2 pro 24h)';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_stories"("days_old" integer DEFAULT 365) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.saved_stories 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_stories"("days_old" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_stories"("days_old" integer) IS 'Löscht alte Geschichten nach angegebener Anzahl von Tagen';



CREATE OR REPLACE FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    access_id UUID;
    existing_resources INTEGER;
BEGIN
    -- Zähle bereits erstellte Ressourcen (1. ist gratis, daher ab 1 zählen)
    SELECT COUNT(*) INTO existing_resources
    FROM public.saved_stories
    WHERE user_id = user_uuid;
    
    INSERT INTO public.user_access (
        user_id,
        plan_type,
        resources_created,
        resources_limit,
        access_starts_at,
        access_expires_at,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        status
    )
    VALUES (
        user_uuid,
        '3-months',
        GREATEST(0, existing_resources - 1), -- 1. war gratis, daher -1
        3,
        NOW(),
        NOW() + INTERVAL '3 months',
        payment_intent_id,
        checkout_session_id,
        'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_type = '3-months',
        resources_created = GREATEST(0, existing_resources - 1), -- 1. war gratis
        resources_limit = 3,
        access_starts_at = NOW(),
        access_expires_at = NOW() + INTERVAL '3 months',
        stripe_payment_intent_id = payment_intent_id,
        stripe_checkout_session_id = checkout_session_id,
        status = 'active',
        updated_at = NOW()
    RETURNING id INTO access_id;
    
    RETURN access_id;
END;
$$;


ALTER FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text") IS 'Erstellt/aktualisiert Zugang nach erfolgreicher Zahlung';



CREATE OR REPLACE FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text", "plan_type" "text" DEFAULT '5-pack'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    access_id UUID;
    existing_resources INTEGER;
    resources_limit_val INTEGER;
    has_existing_access BOOLEAN;
    is_first_purchase BOOLEAN;
BEGIN
    -- Zähle bereits erstellte Ressourcen
    SELECT COUNT(*) INTO existing_resources
    FROM public.saved_stories
    WHERE user_id = user_uuid;
    
    -- Prüfe ob User bereits ein Paket gekauft hat (hat bereits einen Zugang)
    SELECT EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
    ) INTO has_existing_access;
    
    -- Erstes Paket: User hat noch kein aktives Paket gekauft
    -- Zweites+ Paket: User hat bereits ein Paket gekauft
    is_first_purchase := NOT has_existing_access;
    
    -- Bestimme resources_limit basierend auf plan_type und ob es das erste Paket ist
    -- Erstes Paket: 4 weitere Ressourcen (nach der ersten kostenlosen) = insgesamt 5 Ressourcen
    -- Zweites+ Paket: 5 Ressourcen (alle müssen bezahlt werden)
    IF plan_type = '5-pack' THEN
        IF is_first_purchase THEN
            resources_limit_val := 4; -- Erstes Paket: 4 weitere Ressourcen nach der ersten kostenlosen
        ELSE
            resources_limit_val := 5; -- Zweites+ Paket: 5 Ressourcen (alle müssen bezahlt werden)
        END IF;
    ELSIF plan_type = 'premium' THEN
        IF is_first_purchase THEN
            resources_limit_val := 4; -- Premium erstes Paket: 4 weitere Ressourcen
        ELSE
            resources_limit_val := 5; -- Premium zweites+ Paket: 5 Ressourcen
        END IF;
    ELSE
        resources_limit_val := 3; -- Fallback auf 3
    END IF;
    
    -- Berechne resources_created:
    -- - Erstes Paket: Erste Ressource war gratis → resources_created = existing_resources - 1
    -- - Zweites+ Paket: Keine gratis Ressource mehr → resources_created = existing_resources
    INSERT INTO public.user_access (
        user_id,
        plan_type,
        resources_created,
        resources_limit,
        access_starts_at,
        access_expires_at, -- NULL = kein Zeitlimit
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        status
    )
    VALUES (
        user_uuid,
        plan_type,
        CASE 
            WHEN is_first_purchase THEN GREATEST(0, existing_resources - 1) -- Erstes Paket: erste Ressource war gratis
            ELSE existing_resources -- Zweites+ Paket: alle Ressourcen müssen bezahlt werden
        END,
        resources_limit_val,
        NOW(),
        NULL, -- Kein Zeitlimit für 5er-Paket
        payment_intent_id,
        checkout_session_id,
        'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_type = plan_type,
        resources_created = CASE 
            WHEN is_first_purchase THEN GREATEST(0, existing_resources - 1) -- Erstes Paket: erste Ressource war gratis
            ELSE existing_resources -- Zweites+ Paket: alle Ressourcen müssen bezahlt werden
        END,
        resources_limit = resources_limit_val,
        access_starts_at = NOW(),
        access_expires_at = NULL, -- Kein Zeitlimit
        stripe_payment_intent_id = payment_intent_id,
        stripe_checkout_session_id = checkout_session_id,
        status = 'active',
        updated_at = NOW()
    RETURNING id INTO access_id;
    
    RETURN access_id;
END;
$$;


ALTER FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text", "plan_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text", "plan_type" "text") IS 'Erstellt/aktualisiert Zugang nach erfolgreicher Zahlung. Erstes Paket: 4 weitere Ressourcen (insgesamt 5 mit der ersten kostenlosen). Zweites+ Paket: 5 Ressourcen (alle müssen bezahlt werden, keine gratis Ressource mehr). Kein Zeitlimit.';



CREATE OR REPLACE FUNCTION "public"."create_freelancer_access_for_linda"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_freelancer_access_for_linda"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_subscription_access"("user_uuid" "uuid", "subscription_id" "text", "checkout_session_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    access_id UUID;
BEGIN
    INSERT INTO public.user_access (
        user_id,
        plan_type,
        resources_created,
        resources_limit,
        access_starts_at,
        access_expires_at,
        stripe_subscription_id,
        stripe_checkout_session_id,
        subscription_status,
        status
    )
    VALUES (
        user_uuid,
        'subscription',
        0, -- Abo hat kein Ressourcen-Limit (wird nicht verwendet)
        999999, -- Unbegrenzt (symbolisch)
        NOW(),
        NULL, -- Kein Ablaufdatum (läuft solange Abo aktiv)
        subscription_id,
        checkout_session_id,
        'active',
        'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_type = 'subscription',
        stripe_subscription_id = subscription_id,
        stripe_checkout_session_id = checkout_session_id,
        subscription_status = 'active',
        status = 'active',
        access_starts_at = NOW(),
        access_expires_at = NULL,
        updated_at = NOW()
    RETURNING id INTO access_id;
    
    RETURN access_id;
END;
$$;


ALTER FUNCTION "public"."create_subscription_access"("user_uuid" "uuid", "subscription_id" "text", "checkout_session_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_subscription_access"("user_uuid" "uuid", "subscription_id" "text", "checkout_session_id" "text") IS 'Erstellt/aktualisiert Abo-Zugang nach erfolgreicher Stripe Subscription.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Erstellt automatisch ein Profil für neue Benutzer';



CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_active_access"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_access
        WHERE user_id = user_uuid
        AND status = 'active'
        AND subscription_status = 'active' -- Nur aktive Abos
        AND (access_expires_at IS NULL OR access_expires_at > NOW())
    );
END;
$$;


ALTER FUNCTION "public"."has_active_access"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_active_access"("user_uuid" "uuid") IS 'Prüft ob User aktiven Zugang hat. Unterstützt auch Zugänge ohne Zeitlimit (NULL).';



CREATE OR REPLACE FUNCTION "public"."increment_resource_count"("user_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE public.user_access
    SET resources_created = resources_created + 1,
        updated_at = NOW()
    WHERE user_id = user_uuid
    AND status = 'active'
    AND (access_expires_at IS NULL OR access_expires_at > NOW())
    AND resources_created < resources_limit
    RETURNING resources_created INTO new_count;
    
    RETURN COALESCE(new_count, 0);
END;
$$;


ALTER FUNCTION "public"."increment_resource_count"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_resource_count"("user_uuid" "uuid") IS 'Erhöht Ressourcen-Zähler nach Erstellung';



CREATE OR REPLACE FUNCTION "public"."is_admin_for_audio_storage"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_email TEXT;
  user_id UUID;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id; 
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM public.music_admins 
    WHERE LOWER(email) = LOWER(user_email)
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_admin_for_audio_storage"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin_for_audio_storage"() IS 'Prüft ob der aktuelle User ein Admin ist (Full-Admin oder Music-Admin) für Storage-Zugriff auf audio-files Bucket';



CREATE OR REPLACE FUNCTION "public"."is_email_domain_blocked"("email_text" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    email_domain TEXT;
    blocked_domains TEXT[] := ARRAY[
        '10minutemail.com',
        'guerrillamail.com',
        'tempmail.com',
        'temp-mail.org',
        'mailinator.com',
        'throwaway.email',
        'getnada.com',
        'maildrop.cc',
        'mohmal.com',
        'yopmail.com',
        'mailnesia.com',
        'meltmail.com',
        'dispostable.com',
        'trashmail.com',
        'sharklasers.com',
        'grr.la',
        'spamgourmet.com',
        'emailondeck.com',
        'fakemail.net',
        'mintemail.com',
        'mytrashmail.com',
        'tempail.com',
        'tempmailo.com',
        'tmpmail.org',
        'mailcatch.com',
        'spambox.us',
        'throwaway.email',
        'getairmail.com',
        'mailinater.com',
        'tempr.email',
        'burnermail.io',
        'mail.tm',
        'inboxkitten.com',
        'tempmail.net',
        'mail.tm',
        'tempmail.plus',
        'tempmailaddress.com',
        'tempinbox.co.uk',
        'temp-mail.io',
        'tempail.com',
        'tempr.email',
        'tmail.ws',
        'maildrop.cc',
        'mohmal.com',
        'yopmail.com',
        'mailnesia.com'
    ];
BEGIN
    -- Extrahiere Domain aus Email
    email_domain := LOWER(SPLIT_PART(email_text, '@', 2));
    
    -- Prüfe ob Domain in der Block-Liste ist
    RETURN email_domain = ANY(blocked_domains);
END;
$$;


ALTER FUNCTION "public"."is_email_domain_blocked"("email_text" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_email_domain_blocked"("email_text" "text") IS 'Prüft ob eine Email-Domain blockiert ist (Temp-Mail-Dienste)';



CREATE OR REPLACE FUNCTION "public"."is_music_admin_for_storage"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_email TEXT;
  user_id UUID;
BEGIN
  -- Hole User-ID des aktuellen Users
  user_id := auth.uid();
  
  -- Wenn keine User-ID vorhanden, gibt false zurück
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Hole Email des aktuellen Users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id; 
  
  -- Wenn keine Email gefunden, gibt false zurück
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Prüfe ob Email in music_admins Tabelle ist
  RETURN EXISTS (
    SELECT 1 
    FROM public.music_admins 
    WHERE LOWER(email) = LOWER(user_email)
  );
END;
$$;


ALTER FUNCTION "public"."is_music_admin_for_storage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_registration_attempt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Diese Funktion wird von der API aufgerufen, nicht als Trigger
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_registration_attempt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_background_music_tracks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_background_music_tracks_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."anonymous_resource_creations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "browser_fingerprint" "text" NOT NULL,
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anonymous_resource_creations" OWNER TO "postgres";


COMMENT ON TABLE "public"."anonymous_resource_creations" IS 'Trackt anonyme Ressourcen-Erstellungen pro Browser-Fingerprint (max. 1 pro Fingerprint)';



COMMENT ON COLUMN "public"."anonymous_resource_creations"."browser_fingerprint" IS 'Eindeutiger Browser-Fingerprint (Canvas, WebGL, Fonts, etc.)';



COMMENT ON COLUMN "public"."anonymous_resource_creations"."ip_address" IS 'IP-Adresse des Users (optional, für zusätzliches Tracking)';



CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_config" IS 'Speichert App-Konfigurationen wie Beispiel-Ressourcenfigur-ID';



CREATE TABLE IF NOT EXISTS "public"."background_music_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "figure_id" "text" NOT NULL,
    "figure_name" "text",
    "track_id" "text" NOT NULL,
    "track_url" "text" NOT NULL,
    "track_title" "text",
    "track_artist" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "volume" numeric(3,2) DEFAULT 0.12 NOT NULL
);


ALTER TABLE "public"."background_music_tracks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."background_music_tracks"."volume" IS 'Lautstärke des Tracks (0.00-1.00, Standard: 0.12 = 12%)';



CREATE TABLE IF NOT EXISTS "public"."bug_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_email" "text" NOT NULL,
    "description" "text" NOT NULL,
    "screenshot_urls" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bug_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "message" "text" NOT NULL,
    "screenshot_urls" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_email" "text" NOT NULL,
    "message" "text" NOT NULL,
    "rating" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feedback_messages_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."feedback_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."music_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "admin_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "music_admins_admin_type_check" CHECK (("admin_type" = ANY (ARRAY['full'::"text", 'music'::"text"])))
);


ALTER TABLE "public"."music_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pronunciation_hint" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Benutzerprofile mit erweiterten Informationen';



CREATE TABLE IF NOT EXISTS "public"."registration_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" "inet" NOT NULL,
    "email" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "success" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."registration_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."registration_attempts" IS 'Trackt Registrierungsversuche pro IP-Adresse zur Multi-Account-Prävention';



CREATE TABLE IF NOT EXISTS "public"."saved_stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text",
    "resource_figure" "jsonb" NOT NULL,
    "question_answers" "jsonb" NOT NULL,
    "audio_url" "text",
    "voice_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_audio_only" boolean DEFAULT false,
    "client_email" "text",
    "auto_subtitle" "text",
    "custom_subtitle" "text"
);


ALTER TABLE "public"."saved_stories" OWNER TO "postgres";


COMMENT ON TABLE "public"."saved_stories" IS 'Von Benutzern gespeicherte Geschichten';



COMMENT ON COLUMN "public"."saved_stories"."content" IS 'Text-Inhalt der Ressource (optional für Audio-only Ressourcen)';



COMMENT ON COLUMN "public"."saved_stories"."is_audio_only" IS 'Flag für manuell aufgenommene Audio-Ressourcen (ohne generierten Text)';



COMMENT ON COLUMN "public"."saved_stories"."client_email" IS 'Email des Klienten, für den diese Ressource erstellt wurde (optional)';



CREATE OR REPLACE VIEW "public"."stories_with_users" AS
 SELECT "s"."id",
    "s"."title",
    "s"."content",
    "s"."resource_figure",
    "s"."question_answers",
    "s"."audio_url",
    "s"."voice_id",
    "s"."created_at",
    "s"."updated_at",
    "p"."full_name" AS "author_name",
    "p"."email" AS "author_email"
   FROM ("public"."saved_stories" "s"
     JOIN "public"."profiles" "p" ON (("s"."user_id" = "p"."id")));


ALTER VIEW "public"."stories_with_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_type" "text" DEFAULT '3-months'::"text" NOT NULL,
    "resources_created" integer DEFAULT 0 NOT NULL,
    "resources_limit" integer DEFAULT 3 NOT NULL,
    "access_starts_at" timestamp with time zone DEFAULT "now"(),
    "access_expires_at" timestamp with time zone,
    "stripe_customer_id" "text",
    "stripe_payment_intent_id" "text",
    "stripe_checkout_session_id" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_subscription_id" "text",
    "subscription_status" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."user_access" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_access" IS 'Benutzerzugänge und Subscription-Status';



COMMENT ON COLUMN "public"."user_access"."stripe_subscription_id" IS 'Stripe Subscription ID für monatliches Abo';



COMMENT ON COLUMN "public"."user_access"."subscription_status" IS 'Status der Stripe Subscription: active, canceled, past_due, etc.';



CREATE TABLE IF NOT EXISTS "public"."user_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "story_id" "uuid",
    "resource_figure_name" "text",
    "voice_id" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_analytics" IS 'Trackt Nutzerverhalten: Audio-Plays, Ressourcen-Erstellungen, Dashboard-Besuche';



COMMENT ON COLUMN "public"."user_analytics"."event_type" IS 'Typ des Events: audio_play, resource_created, dashboard_visit, audio_play_complete';



COMMENT ON COLUMN "public"."user_analytics"."metadata" IS 'Zusätzliche Event-Daten als JSON (z.B. play_duration, play_position, completed)';



CREATE OR REPLACE VIEW "public"."user_profiles" AS
 SELECT "u"."id",
    "u"."email",
    "p"."full_name",
    "p"."avatar_url",
    "p"."created_at",
    "p"."updated_at"
   FROM ("auth"."users" "u"
     LEFT JOIN "public"."profiles" "p" ON (("u"."id" = "p"."id")));


ALTER VIEW "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."anonymous_resource_creations"
    ADD CONSTRAINT "anonymous_resource_creations_browser_fingerprint_key" UNIQUE ("browser_fingerprint");



ALTER TABLE ONLY "public"."anonymous_resource_creations"
    ADD CONSTRAINT "anonymous_resource_creations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."background_music_tracks"
    ADD CONSTRAINT "background_music_tracks_figure_id_track_id_key" UNIQUE ("figure_id", "track_id");



ALTER TABLE ONLY "public"."background_music_tracks"
    ADD CONSTRAINT "background_music_tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bug_reports"
    ADD CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_messages"
    ADD CONSTRAINT "feedback_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."music_admins"
    ADD CONSTRAINT "music_admins_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."music_admins"
    ADD CONSTRAINT "music_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registration_attempts"
    ADD CONSTRAINT "registration_attempts_ip_email_key" UNIQUE ("ip_address", "email", "created_at");



ALTER TABLE ONLY "public"."registration_attempts"
    ADD CONSTRAINT "registration_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_stories"
    ADD CONSTRAINT "saved_stories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_access"
    ADD CONSTRAINT "user_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_access"
    ADD CONSTRAINT "user_access_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_anonymous_resource_creations_created_at" ON "public"."anonymous_resource_creations" USING "btree" ("created_at");



CREATE INDEX "idx_anonymous_resource_creations_fingerprint" ON "public"."anonymous_resource_creations" USING "btree" ("browser_fingerprint");



CREATE INDEX "idx_background_music_default" ON "public"."background_music_tracks" USING "btree" ("figure_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_background_music_figure_id" ON "public"."background_music_tracks" USING "btree" ("figure_id");



CREATE INDEX "idx_background_music_volume" ON "public"."background_music_tracks" USING "btree" ("volume");



CREATE INDEX "idx_music_admins_email" ON "public"."music_admins" USING "btree" ("email");



CREATE INDEX "idx_music_admins_type" ON "public"."music_admins" USING "btree" ("admin_type");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_registration_attempts_email" ON "public"."registration_attempts" USING "btree" ("email");



CREATE INDEX "idx_registration_attempts_ip_created" ON "public"."registration_attempts" USING "btree" ("ip_address", "created_at" DESC);



CREATE INDEX "idx_saved_stories_client_email" ON "public"."saved_stories" USING "btree" ("client_email") WHERE ("client_email" IS NOT NULL);



CREATE INDEX "idx_saved_stories_created_at" ON "public"."saved_stories" USING "btree" ("created_at");



CREATE INDEX "idx_saved_stories_is_audio_only" ON "public"."saved_stories" USING "btree" ("is_audio_only") WHERE ("is_audio_only" = true);



CREATE INDEX "idx_saved_stories_user_id" ON "public"."saved_stories" USING "btree" ("user_id");



CREATE INDEX "idx_user_access_expires_at" ON "public"."user_access" USING "btree" ("access_expires_at");



CREATE INDEX "idx_user_access_status" ON "public"."user_access" USING "btree" ("status");



CREATE INDEX "idx_user_access_subscription_id" ON "public"."user_access" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE INDEX "idx_user_access_user_id" ON "public"."user_access" USING "btree" ("user_id");



CREATE INDEX "idx_user_analytics_created_at" ON "public"."user_analytics" USING "btree" ("created_at");



CREATE INDEX "idx_user_analytics_event_type" ON "public"."user_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_user_analytics_resource_figure_name" ON "public"."user_analytics" USING "btree" ("resource_figure_name");



CREATE INDEX "idx_user_analytics_story_id" ON "public"."user_analytics" USING "btree" ("story_id");



CREATE INDEX "idx_user_analytics_user_id" ON "public"."user_analytics" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "handle_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_saved_stories_updated_at" BEFORE UPDATE ON "public"."saved_stories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_background_music_tracks_updated_at" BEFORE UPDATE ON "public"."background_music_tracks" FOR EACH ROW EXECUTE FUNCTION "public"."update_background_music_tracks_updated_at"();



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registration_attempts"
    ADD CONSTRAINT "registration_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_stories"
    ADD CONSTRAINT "saved_stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_access"
    ADD CONSTRAINT "user_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."saved_stories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_analytics"
    ADD CONSTRAINT "user_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow anonymous insert" ON "public"."anonymous_resource_creations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read music tracks" ON "public"."background_music_tracks" FOR SELECT USING (true);



CREATE POLICY "Only admins can delete music tracks" ON "public"."background_music_tracks" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."email")::"text" = ANY (ARRAY['heilung@knobelsdorff-therapie.de'::"text"])) OR (("users"."email")::"text" = ANY (ARRAY['andreas@knobelsdorff-therapie.de'::"text"])))))));



CREATE POLICY "Only admins can insert music tracks" ON "public"."background_music_tracks" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."email")::"text" = ANY (ARRAY['heilung@knobelsdorff-therapie.de'::"text"])) OR (("users"."email")::"text" = ANY (ARRAY['andreas@knobelsdorff-therapie.de'::"text"])))))));



CREATE POLICY "Only admins can update music tracks" ON "public"."background_music_tracks" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."email")::"text" = ANY (ARRAY['heilung@knobelsdorff-therapie.de'::"text"])) OR (("users"."email")::"text" = ANY (ARRAY['andreas@knobelsdorff-therapie.de'::"text"])))))));



CREATE POLICY "Service role can manage registration_attempts" ON "public"."registration_attempts" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can delete their own stories" ON "public"."saved_stories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own access" ON "public"."user_access" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own analytics" ON "public"."user_analytics" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own stories" ON "public"."saved_stories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own access" ON "public"."user_access" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own stories" ON "public"."saved_stories" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own access" ON "public"."user_access" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own analytics" ON "public"."user_analytics" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own stories" ON "public"."saved_stories" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."anonymous_resource_creations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_config_insert_policy" ON "public"."app_config" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("lower"(("users"."email")::"text") IN ( SELECT "lower"("unnest"("string_to_array"("current_setting"('app.settings.admin_emails'::"text", true), ','::"text"))) AS "lower"
          WHERE ("current_setting"('app.settings.admin_emails'::"text", true) IS NOT NULL)))))));



CREATE POLICY "app_config_select_policy" ON "public"."app_config" FOR SELECT USING (true);



CREATE POLICY "app_config_update_policy" ON "public"."app_config" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("lower"(("users"."email")::"text") IN ( SELECT "lower"("unnest"("string_to_array"("current_setting"('app.settings.admin_emails'::"text", true), ','::"text"))) AS "lower"
          WHERE ("current_setting"('app.settings.admin_emails'::"text", true) IS NOT NULL)))))));



ALTER TABLE "public"."background_music_tracks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_policy" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_policy" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_policy" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."registration_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_stories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stories_delete_policy" ON "public"."saved_stories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "stories_insert_policy" ON "public"."saved_stories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "stories_select_policy" ON "public"."saved_stories" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "stories_update_policy" ON "public"."saved_stories" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_analytics" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."can_access_audio_resource"("user_uuid" "uuid", "resource_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_audio_resource"("user_uuid" "uuid", "resource_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_audio_resource"("user_uuid" "uuid", "resource_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_ai_resource"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_ai_resource"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_ai_resource"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_resource"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_resource"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_resource"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_register_from_ip"("ip_address_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_register_from_ip"("ip_address_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_register_from_ip"("ip_address_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_stories"("days_old" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_stories"("days_old" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_stories"("days_old" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text", "plan_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text", "plan_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_access_after_payment"("user_uuid" "uuid", "payment_intent_id" "text", "checkout_session_id" "text", "plan_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_freelancer_access_for_linda"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_freelancer_access_for_linda"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_freelancer_access_for_linda"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_subscription_access"("user_uuid" "uuid", "subscription_id" "text", "checkout_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_subscription_access"("user_uuid" "uuid", "subscription_id" "text", "checkout_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_subscription_access"("user_uuid" "uuid", "subscription_id" "text", "checkout_session_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_active_access"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_active_access"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_active_access"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_resource_count"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_resource_count"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_resource_count"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_for_audio_storage"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_for_audio_storage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_for_audio_storage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_email_domain_blocked"("email_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_email_domain_blocked"("email_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_email_domain_blocked"("email_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_music_admin_for_storage"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_music_admin_for_storage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_music_admin_for_storage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_registration_attempt"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_registration_attempt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_registration_attempt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_background_music_tracks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_background_music_tracks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_background_music_tracks_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."anonymous_resource_creations" TO "anon";
GRANT ALL ON TABLE "public"."anonymous_resource_creations" TO "authenticated";
GRANT ALL ON TABLE "public"."anonymous_resource_creations" TO "service_role";



GRANT ALL ON TABLE "public"."app_config" TO "anon";
GRANT ALL ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";



GRANT ALL ON TABLE "public"."background_music_tracks" TO "anon";
GRANT ALL ON TABLE "public"."background_music_tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."background_music_tracks" TO "service_role";



GRANT ALL ON TABLE "public"."bug_reports" TO "anon";
GRANT ALL ON TABLE "public"."bug_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."bug_reports" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_messages" TO "anon";
GRANT ALL ON TABLE "public"."feedback_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_messages" TO "service_role";



GRANT ALL ON TABLE "public"."music_admins" TO "anon";
GRANT ALL ON TABLE "public"."music_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."music_admins" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."registration_attempts" TO "anon";
GRANT ALL ON TABLE "public"."registration_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."registration_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."saved_stories" TO "anon";
GRANT ALL ON TABLE "public"."saved_stories" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_stories" TO "service_role";



GRANT ALL ON TABLE "public"."stories_with_users" TO "anon";
GRANT ALL ON TABLE "public"."stories_with_users" TO "authenticated";
GRANT ALL ON TABLE "public"."stories_with_users" TO "service_role";



GRANT ALL ON TABLE "public"."user_access" TO "anon";
GRANT ALL ON TABLE "public"."user_access" TO "authenticated";
GRANT ALL ON TABLE "public"."user_access" TO "service_role";



GRANT ALL ON TABLE "public"."user_analytics" TO "anon";
GRANT ALL ON TABLE "public"."user_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























