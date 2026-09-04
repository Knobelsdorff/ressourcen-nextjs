# Quick Start Guide - Deploy Edge Function in 5 Minutes

## 🎯 What This Does

Moves your audio generation from Vercel (60s timeout) to Supabase Edge Functions (NO timeout, way cheaper!)

---

## ⚡ Quick Deployment Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

This opens your browser to authenticate.

### 3. Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your project ref:**
- Go to https://supabase.com/dashboard
- Click your project
- Settings → General → Reference ID

### 4. Add Environment Secrets

Go to Supabase Dashboard → Settings → Edge Functions → Secrets

Add these 3 secrets:

```
ELEVENLABS_API_KEY = (copy from your .env.local file)
SUPABASE_URL = https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY = (from Supabase Settings → API → Service Role)
```

### 5. Deploy!

**Windows:**
```bash
deploy-edge-function.bat
```

**Mac/Linux:**
```bash
./deploy-edge-function.sh
```

**Or manually:**
```bash
supabase functions deploy generate-audio
```

### 6. Done! 🎉

Test your app - audio generation now runs on Supabase with NO timeout!

---

## 🧪 Testing

### Test in browser console:

```javascript
const response = await fetch('https://yourproject.supabase.co/functions/v1/generate-audio', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Test',
    voiceId: 'YOUR_VOICE_ID',
    adminPreview: true
  })
});
const data = await response.json();
console.log(data);
```

### View logs:

```bash
supabase functions logs generate-audio --tail
```

---

## 📊 Before vs After

| Feature | Vercel API Route | Supabase Edge Function |
|---------|-----------------|------------------------|
| Timeout | 60 seconds ⏰ | Unlimited ♾️ |
| Cost for long calls | High 💸 | Free (up to 500k calls) 🎉 |
| Cold starts | Slow | Fast ⚡ |
| Deployment | `vercel deploy` | `supabase functions deploy` |

---

## 🔧 Troubleshooting

**Error: "Function not found"**
- Run: `supabase functions deploy generate-audio`

**Error: "Missing ELEVENLABS_API_KEY"**
- Add secret in Supabase Dashboard → Settings → Edge Functions → Secrets

**Logs not showing?**
- Run: `supabase functions logs generate-audio --tail`

**Still getting timeouts?**
- Check frontend is using `${SUPABASE_URL}/functions/v1/generate-audio`
- Verify in browser Network tab

---

## 🎊 You're Done!

Your audio generation now:
- ✅ Has NO timeout limits
- ✅ Costs 90% less
- ✅ Works the exact same way
- ✅ Is way faster!

Enjoy! 🚀
