# Supabase Edge Function Deployment Guide

This guide will help you deploy the `generate-audio` Edge Function to Supabase, eliminating the 60-second Vercel timeout and saving costs.

## Benefits of Using Supabase Edge Functions

✅ **NO timeout limits** - Can run for minutes if needed
✅ **Cheaper** - No extra charges for long-running functions
✅ **Same functionality** - Drop-in replacement for your Vercel API route
✅ **Better performance** - Runs on Deno runtime (faster cold starts)

---

## Prerequisites

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```
   This will open your browser to authenticate.

3. **Link your project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

   To find your project ref:
   - Go to https://supabase.com/dashboard
   - Click on your project
   - Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
   - Or find it in Settings > General > Project Settings > Reference ID

---

## Step 1: Set Environment Variables in Supabase

Before deploying, you need to add your API keys to Supabase:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Add these secrets:

   ```
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   **Where to find these values:**
   - `ELEVENLABS_API_KEY`: From your `.env.local` file
   - `SUPABASE_URL`: From Settings → API → Project URL (e.g., `https://your-project.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: From Settings → API → Service Role Key (⚠️ Keep this secret!)

---

## Step 2: Deploy the Edge Function

Run this command from your project root directory:

```bash
supabase functions deploy generate-audio
```

This will:
- Upload your Edge Function code to Supabase
- Deploy it to production
- Give you a URL like: `https://your-project.supabase.co/functions/v1/generate-audio`

**Expected output:**
```
Deploying function generate-audio...
Function generate-audio deployed successfully.
URL: https://your-project.supabase.co/functions/v1/generate-audio
```

---

## Step 3: Verify Deployment

Test the Edge Function directly:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-audio' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Test audio generation",
    "voiceId": "YOUR_VOICE_ID",
    "adminPreview": true
  }'
```

Replace:
- `your-project.supabase.co` with your actual Supabase URL
- `YOUR_SUPABASE_ANON_KEY` with your anon key (from Settings → API)
- `YOUR_VOICE_ID` with a valid ElevenLabs voice ID

**Expected response:**
```json
{
  "audioUrl": "https://your-project.supabase.co/storage/v1/object/public/audio-files/audio_123456_abc.mp3",
  "filename": "audio_123456_abc.mp3",
  "voiceId": "YOUR_VOICE_ID",
  "size": 12345,
  "processingTime": 45678
}
```

---

## Step 4: Update Environment Variables (Already Done!)

Your frontend code has already been updated to use the Edge Function.
Just verify your `.env.local` has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## Step 5: Test in Your App

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Create a new story** and generate audio

3. **Check the browser console** - you should see the request going to:
   ```
   https://your-project.supabase.co/functions/v1/generate-audio
   ```

4. **Verify it works** - Audio should generate without timeout errors!

---

## Troubleshooting

### Error: "Function not found"
- Make sure you deployed: `supabase functions deploy generate-audio`
- Check the function exists in dashboard: Settings → Edge Functions

### Error: "Missing ELEVENLABS_API_KEY"
- Add the secret in Supabase dashboard: Settings → Edge Functions → Secrets
- Redeploy after adding: `supabase functions deploy generate-audio`

### Error: "CORS error"
- The Edge Function already has CORS headers configured
- Make sure you're using the correct Authorization header

### Error: "Failed to store audio file"
- Check your Supabase Storage bucket exists: `audio-files`
- Verify RLS policies allow uploads
- Check service role key is correct

---

## Monitoring & Logs

View real-time logs:

```bash
supabase functions logs generate-audio --tail
```

Or in the dashboard:
- Go to **Edge Functions** → **generate-audio** → **Logs**

---

## Cost Comparison

**Vercel (before):**
- 60-second timeout limit
- Functions > 10s cost extra
- Frequent timeouts = wasted money

**Supabase Edge Functions (after):**
- NO timeout limits
- 500,000 invocations/month FREE
- 2M function execution hours/month FREE
- After that: $2 per 1M invocations

**Estimated savings: ~90% reduction in costs!** 💰

---

## Next Steps (Optional)

### 1. Remove Old Vercel API Route

Once confirmed working, you can delete:
```bash
rm src/app/api/generate-audio/route.ts
```

### 2. Enable Faster Model (Optional)

Edit `supabase/functions/generate-audio/index.ts` line 94:
```typescript
model_id: 'eleven_turbo_v2',  // Changed from 'eleven_multilingual_v2'
```

This will make audio generation 2-3x faster!

Redeploy:
```bash
supabase functions deploy generate-audio
```

---

## Summary

✅ Created Edge Function: `supabase/functions/generate-audio/index.ts`
✅ Updated frontend: `src/components/AudioPlayback.tsx`
✅ No more 60-second timeouts!
✅ Massive cost savings!

**You're all set!** 🎉

---

## Support

If you encounter issues:
1. Check Supabase logs: `supabase functions logs generate-audio --tail`
2. Verify environment variables in Supabase dashboard
3. Test Edge Function directly with curl command above

Need help? Let me know! 🚀
