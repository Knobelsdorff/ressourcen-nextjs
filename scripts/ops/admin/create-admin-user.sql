-- Erstelle Admin-User für localhost-Entwicklung
-- Führe dieses Skript in der Supabase SQL Editor aus

-- WICHTIG: Ersetze 'DEIN_PASSWORT_HIER' mit einem sicheren Passwort
-- Das Passwort wird mit bcrypt gehasht (Supabase verwendet bcrypt)

DO $$
DECLARE
  user_email TEXT := 'andreas@knobelsdorff-therapie.de';
  user_password TEXT := 'DEIN_PASSWORT_HIER'; -- ← HIER DEIN PASSWORT EINTRAGEN
  user_id UUID;
  existing_user_id UUID;
BEGIN
  -- Prüfe ob User bereits existiert
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF existing_user_id IS NOT NULL THEN
    RAISE NOTICE 'User mit Email % existiert bereits (ID: %)', user_email, existing_user_id;
    RAISE NOTICE 'Falls du das Passwort zurücksetzen möchtest, verwende Supabase Dashboard → Authentication → Users';
  ELSE
    -- Erstelle neuen User
    -- Verwende auth.uid() für die User-ID (wird automatisch generiert)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      user_email,
      crypt(user_password, gen_salt('bf')), -- bcrypt hash
      NOW(), -- Email sofort bestätigt (für localhost)
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO user_id;
    
    RAISE NOTICE 'User erfolgreich erstellt: % (ID: %)', user_email, user_id;
    RAISE NOTICE 'Email ist bereits bestätigt (für localhost)';
    RAISE NOTICE 'Du kannst dich jetzt mit diesem Passwort anmelden';
    
    -- Erstelle automatisch ein Profil (falls profiles Tabelle existiert)
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
      VALUES (user_id, user_email, 'Andreas', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
      RAISE NOTICE 'Profil erstellt';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Profil konnte nicht erstellt werden (Tabelle existiert möglicherweise nicht): %', SQLERRM;
    END;
  END IF;
END $$;

-- Zeige alle User mit dieser Email (zur Bestätigung)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'andreas@knobelsdorff-therapie.de';

