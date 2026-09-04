-- Add pronunciation_hint column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pronunciation_hint TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.pronunciation_hint IS 'Optional pronunciation hint for user name in audio generation';
