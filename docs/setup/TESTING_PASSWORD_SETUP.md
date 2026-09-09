# Testing Password Setup Flow - Local & Production

## Important: Supabase Configuration

### For Localhost Testing:

1. **Update Supabase Site URL (Temporary for Testing)**
   - Go to: https://supabase.com/dashboard/project/wfnvjmockhcualjgymyl/auth/url-configuration
   - Set **Site URL** to: `http://localhost:3000`
   - Set **Redirect URLs** to include: `http://localhost:3000/**`

2. **After Testing - Revert to Production**
   - Set **Site URL** back to: `https://www.ressourcen.app`
   - Set **Redirect URLs** to: `https://www.ressourcen.app/**`

### Alternative: Test Without Changing Supabase Config

If you don't want to change Supabase settings, you can test the flow by:

1. Create resource for client on localhost
2. Check server console for the magic link
3. Copy the link and manually replace the domain:
   - Replace `https://www.ressourcen.app` with `http://localhost:3000`
   - Example:
     ```
     Original: https://wfnvjmockhcualjgymyl.supabase.co/auth/v1/verify?token=xxx&type=recovery&redirect_to=https://www.ressourcen.app/auth/set-password

     Modified: https://wfnvjmockhcualjgymyl.supabase.co/auth/v1/verify?token=xxx&type=recovery&redirect_to=http://localhost:3000/auth/set-password
     ```
4. Paste the modified link in your browser

## Testing Steps

### Test 1: New User (First Time Setup)

1. **Create Resource for New Client**
   - Go to admin dashboard: http://localhost:3000/dashboard
   - Click "Ressource für Klienten erstellen"
   - Record audio and add resource name
   - Enter a NEW email (one not in Supabase yet)
   - Click "Versenden"

2. **Check Email**
   - Subject should be: "Willkommen! Deine Ressource wartet auf dich"
   - Email should have yellow warning box saying "Dies ist dein erster Zugang"
   - Button should say "Passwort einrichten"

3. **Click Link in Email**
   - Should redirect to: `http://localhost:3000/auth/set-password`
   - Should show "Willkommen!" page
   - No error messages

4. **Set Password**
   - Enter password (min 6 characters)
   - Confirm password
   - Click "Passwort einrichten"
   - Should redirect to dashboard with resource

5. **Verify Login Works**
   - Log out
   - Try logging in with email + password
   - Should work!

### Test 2: Existing User WITH Password

1. **Send Another Resource to Same Email**
   - Create another resource
   - Send to the SAME email from Test 1

2. **Check Email**
   - Subject: "Deine Ressource ist bereit!"
   - NO yellow warning box
   - Button says "Zur Ressource"
   - Has tip about logging in with password

3. **Click Link**
   - Should go directly to dashboard
   - Should see the new resource

### Test 3: Existing User WITHOUT Password

This tests the case where a user exists but never set up password:

1. **Manually Create User in Supabase Without Password**
   - Go to: https://supabase.com/dashboard/project/wfnvjmockhcualjgymyl/auth/users
   - Click "Add user"
   - Enter email: test-no-password@example.com
   - Check "Auto Confirm User"
   - Don't set password
   - Save

2. **Send Resource to This User**
   - Create resource on localhost
   - Send to: test-no-password@example.com

3. **Check Email**
   - Should have "Passwort einrichten" button
   - Should have yellow warning box

4. **Complete Password Setup**
   - Click link → set password → redirect to dashboard

## Production Testing

### Before Deploying to Production:

1. **Verify Supabase Site URL is Set to Production**
   - Site URL: `https://www.ressourcen.app`
   - Redirect URLs: `https://www.ressourcen.app/**`

2. **Deploy Your Code**
   - Push changes to production

3. **Test the Flow**
   - Use the same 3 tests above but with production URL
   - Email should contain `https://www.ressourcen.app` links
   - Everything should work the same way

## Debugging

### Check Server Logs

The API route logs helpful information:
```
[API/resources/client/create-batch] Detected origin: http://localhost:3000
[API/resources/client/create-batch] Redirect URLs: { ... }
[API/resources/client/create-batch] Recovery link generated for new user
[API/resources/client/create-batch] Modified redirect_to: http://localhost:3000/auth/set-password
```

### Check Browser Console

The set-password page logs:
```
[Set Password] URL Parameters: { ... }
[Set Password] User already has session, showing password setup form
[Set Password] Resource ID from session: xxx
```

### Common Issues

**Issue**: Link redirects to production instead of localhost
- **Fix**: Update Supabase Site URL to `http://localhost:3000` OR manually modify the link

**Issue**: "Link is invalid or expired"
- **Fix**: Generate a new link (links expire after 24 hours)

**Issue**: After setting password, redirects to wrong place
- **Fix**: Check that resource_id is in user metadata

**Issue**: User can't login after setting password
- **Fix**: Check that `password_set: true` is in user metadata

## Summary

✅ **For Localhost**: Temporarily change Supabase Site URL OR manually modify links
✅ **For Production**: Make sure Supabase Site URL is set to production domain
✅ **Both**: Code will work on both environments once Supabase is configured correctly

The code now automatically:
- Detects the environment (localhost vs production)
- Modifies redirect URLs in the generated links
- Preserves resource_id through the flow
- Shows different emails for new vs existing users
