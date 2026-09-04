# Step-by-Step Deployment Commands

Follow these commands **in order** to deploy your Edge Function.

---

## ✅ Step 1: Install Supabase CLI

Run this command:

```bash
npm install -g supabase
```

**Verify installation:**
```bash
supabase --version
```

You should see something like: `1.142.2`

---

## ✅ Step 2: Login to Supabase

```bash
supabase login
```

This will:
1. Open your browser automatically
2. Ask you to authorize the CLI
3. Confirm "Successfully logged in!"

---

## ✅ Step 3: Find Your Project Reference ID

**Option A - From Dashboard:**
1. Go to https://supabase.com/dashboard
2. Click on your project
3. Go to Settings → General
4. Copy the "Reference ID" (it looks like: `abcdefghijklmnopqrst`)

**Option B - From URL:**
Look at your Supabase dashboard URL:
```
https://supabase.com/dashboard/project/abcdefghijklmnopqrst
                                       ^^^^^^^^^^^^^^^^^^^^
                                       This is your project ref
```

---

## ✅ Step 4: Link Your Project

Replace `YOUR_PROJECT_REF` with your actual project reference:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**Example:**
```bash
supabase link --project-ref abcdefghijklmnopqrst
```

You should see: `Linked to project YOUR_PROJECT_REF`

---

## ✅ Step 5: Add Environment Variables

**Open Supabase Dashboard:**
https://supabase.com/dashboard

**Navigate to:**
Your Project → Settings → Edge Functions → **Manage secrets**

**Click "Add new secret"** and add these **3 secrets**:

### Secret 1: ELEVENLABS_API_KEY
- **Name:** `ELEVENLABS_API_KEY`
- **Value:** Copy from your `.env.local` file (look for `ELEVENLABS_API_KEY=...`)

### Secret 2: SUPABASE_URL
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** Your Supabase URL (e.g., `https://abcdefghijklmnopqrst.supabase.co`)
- **Find it:** Settings → API → Project URL

### Secret 3: SUPABASE_SERVICE_ROLE_KEY
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** Your service role key
- **Find it:** Settings → API → Service Role (secret) → Click "Reveal" → Copy
- ⚠️ **IMPORTANT:** Keep this secret! Never commit to git!

**After adding all 3 secrets, click "Save"**

---

## ✅ Step 6: Deploy the Edge Function

Run this command from your project root:

```bash
supabase functions deploy generate-audio
```

**Expected output:**
```
Deploying Function generate-audio...
Bundling generate-audio
Deploying generate-audio (project ref: abcdefghijklmnopqrst)
Deployed Function generate-audio
  Version: 20241130-xxxxx
  URL: https://abcdefghijklmnopqrst.supabase.co/functions/v1/generate-audio
```

**✅ Success!** Your Edge Function is now deployed!

---

## ✅ Step 7: Test the Deployment

### Test 1: Check Function Exists

```bash
supabase functions list
```

You should see `generate-audio` in the list.

### Test 2: View Logs

```bash
supabase functions logs generate-audio --tail
```

Leave this running. In another terminal, test your app.

### Test 3: Test in Your App

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Open your app:** http://localhost:3000

3. **Create a story and generate audio**

4. **Watch the logs** (from Step 7, Test 2)
   - You should see: "=== Audio Generation Request ==="
   - You should see: "ElevenLabs API took: XXXXms"
   - You should see: "Audio uploaded successfully"

### Test 4: Direct API Test (Optional)

Replace the placeholders and run in your terminal:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-audio' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Dies ist ein Test",
    "voiceId": "YOUR_VOICE_ID",
    "adminPreview": true
  }'
```

**Where to find values:**
- `YOUR_PROJECT_REF`: From Step 3
- `YOUR_ANON_KEY`: Settings → API → Project API keys → anon public
- `YOUR_VOICE_ID`: Any valid ElevenLabs voice ID (e.g., from your app)

---

## 🎉 You're Done!

Your audio generation is now running on Supabase Edge Functions with:
- ✅ NO 60-second timeout
- ✅ NO extra Vercel charges
- ✅ Same functionality
- ✅ Better performance

---

## 🔄 Making Updates

If you change the Edge Function code:

```bash
supabase functions deploy generate-audio
```

That's it! Updates deploy in seconds.

---

## 🐛 Troubleshooting

### Issue: "supabase: command not found"
**Solution:**
```bash
npm install -g supabase
```

### Issue: "Not logged in"
**Solution:**
```bash
supabase login
```

### Issue: "Project not linked"
**Solution:**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Issue: "Missing ELEVENLABS_API_KEY"
**Solution:**
- Go to Supabase Dashboard → Settings → Edge Functions → Manage secrets
- Add the secret
- Redeploy: `supabase functions deploy generate-audio`

### Issue: Frontend still uses /api/generate-audio
**Solution:**
The code has been updated. Just restart your dev server:
```bash
npm run dev
```

### Issue: CORS error
**Solution:**
The Edge Function already has CORS configured. Make sure you're using the `Authorization` header.

---

## 📚 Useful Commands

**View all functions:**
```bash
supabase functions list
```

**View logs (live):**
```bash
supabase functions logs generate-audio --tail
```

**Delete function:**
```bash
supabase functions delete generate-audio
```

**Check login status:**
```bash
supabase projects list
```

---

## 💰 Cost Savings

**Before (Vercel):**
- Timeout at 60 seconds
- Extra charges for long-running functions
- Frequent failures

**After (Supabase):**
- NO timeout limit
- 500,000 free invocations/month
- 2M execution hours/month FREE
- **Estimated savings: 90%+** 🎊

---

## 🎊 Next Steps (Optional)

### 1. Use Faster Model

Edit `supabase/functions/generate-audio/index.ts` line 94:

```typescript
model_id: 'eleven_turbo_v2',  // Faster than multilingual_v2
```

Then redeploy:
```bash
supabase functions deploy generate-audio
```

### 2. Remove Old Vercel Route (After Confirming It Works)

```bash
rm src/app/api/generate-audio/route.ts
git add .
git commit -m "Remove old Vercel API route, use Supabase Edge Function"
```

---

## 📞 Need Help?

1. **Check logs:** `supabase functions logs generate-audio --tail`
2. **Verify secrets:** Supabase Dashboard → Settings → Edge Functions → Manage secrets
3. **Test directly:** Use the curl command from Test 4 above

---

**Ready to deploy? Start with Step 1!** 🚀
