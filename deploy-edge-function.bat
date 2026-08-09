@echo off
REM Deployment script for Supabase Edge Function (Windows)
REM This deploys the generate-audio function to Supabase

echo.
echo 🚀 Deploying generate-audio Edge Function to Supabase...
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI is not installed.
    echo Install it with: npm install -g supabase
    exit /b 1
)

echo ✅ Supabase CLI is installed
echo.

REM Check if logged in
echo Checking Supabase login status...
supabase projects list >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged in to Supabase.
    echo Login with: supabase login
    exit /b 1
)

echo ✅ Logged in to Supabase
echo.

REM Deploy the function
echo Deploying function...
supabase functions deploy generate-audio --no-verify-jwt

if %errorlevel% equ 0 (
    echo.
    echo ✅ Deployment successful!
    echo.
    echo 📋 Next steps:
    echo 1. Add environment variables in Supabase Dashboard:
    echo    Settings → Edge Functions → Secrets
    echo.
    echo 2. Add these secrets:
    echo    - ELEVENLABS_API_KEY
    echo    - SUPABASE_URL
    echo    - SUPABASE_SERVICE_ROLE_KEY
    echo.
    echo 3. Test your deployment:
    echo    supabase functions logs generate-audio --tail
    echo.
) else (
    echo.
    echo ❌ Deployment failed!
    echo Check the error messages above.
    exit /b 1
)
