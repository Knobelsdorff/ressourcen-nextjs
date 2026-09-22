#!/bin/bash

# Deployment script for Supabase Edge Function
# This deploys the generate-audio function to Supabase

echo "🚀 Deploying generate-audio Edge Function to Supabase..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI is installed"
echo ""

# Check if logged in
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null
then
    echo "❌ Not logged in to Supabase."
    echo "Login with: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Deploy the function
echo "Deploying function..."
supabase functions deploy generate-audio --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Add environment variables in Supabase Dashboard:"
    echo "   Settings → Edge Functions → Secrets"
    echo ""
    echo "2. Add these secrets:"
    echo "   - ELEVENLABS_API_KEY"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "3. Test your deployment:"
    echo "   supabase functions logs generate-audio --tail"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check the error messages above."
    exit 1
fi
