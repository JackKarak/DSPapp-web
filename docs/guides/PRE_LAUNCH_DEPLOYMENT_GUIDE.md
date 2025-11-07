# 🚀 PRE-LAUNCH DEPLOYMENT GUIDE

**MANDATORY STEPS BEFORE LAUNCH - DO NOT SKIP**

Last Updated: November 7, 2025

---

## ⚠️ CRITICAL: Complete All Steps In Order

This guide will take you through the final critical steps needed to launch your DSP app safely. Estimated time: 30-60 minutes.

---

## 📋 STEP 1: Set Up Environment Variables (5 minutes)

### 1.1 Create Your .env File

1. In the root of your project, create a file named `.env` (if it doesn't exist)
2. Copy the contents from `.env.example`
3. Fill in your actual values:

```bash
# Supabase Configuration (Required)
EXPO_PUBLIC_SUPABASE_URL=https://brjmujpjbmzhjepxamek.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... # Your actual key

# Google Services  
GOOGLE_CALENDAR_ID=your_actual_calendar_id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}

# App Environment
NODE_ENV=production
```

### 1.2 Verify .gitignore

Make sure `.env` is in your `.gitignore` file so you don't commit credentials:

```bash
# Check if .env is ignored
cat .gitignore | grep ".env"
```

If not present, add it:
```bash
.env
.env.local
.env.production
```

### 1.3 Test Environment Loading

Stop your dev server and restart:

```powershell
# Stop current server (Ctrl+C)
npx expo start --clear
```

If you see an error about missing Supabase configuration, your .env file is set up correctly! (The hardcoded fallbacks were removed for security)

---

## 🔒 STEP 2: Apply Critical Security Migrations (10 minutes)

### ⚠️ THIS IS THE MOST IMPORTANT STEP - DO NOT SKIP

These migrations fix critical security vulnerabilities where any user could view other users' data.

### 2.1 Open Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in and select your DSP project
3. Click **SQL Editor** in the left sidebar

### 2.2 Apply First Migration: Account Dashboard Security

1. Click **New Query**
2. Open the file `supabase/migrations/20241106_fix_account_dashboard_security.sql` in VS Code
3. Copy **ALL** the content (Ctrl+A, Ctrl+C)
4. Paste into the Supabase SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. ✅ Verify you see "Success" message with no errors

**If you get an error:** The function may already exist. That's OK - the important part is that it uses `auth.uid()` and doesn't accept a `p_user_id` parameter.

### 2.3 Apply Second Migration: Points Dashboard Security

1. Click **New Query** again
2. Open the file `supabase/migrations/20241106_fix_points_dashboard_security.sql` in VS Code
3. Copy **ALL** the content
4. Paste into the Supabase SQL Editor
5. Click **Run**
6. ✅ Verify you see "Success" message with no errors

### 2.4 Verify Migrations Applied Correctly

Run this query in Supabase SQL Editor to verify:

```sql
-- Check that functions exist and don't have user_id parameter
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name IN ('get_account_dashboard', 'get_points_dashboard')
  AND routine_schema = 'public';
```

You should see both functions listed. In their definitions, verify:
- They should contain `auth.uid()` 
- They should **NOT** have `p_user_id` in the parameter list

---

## 🧪 STEP 3: Critical Security Testing (15 minutes)

### 3.1 Test Account Dashboard Security

1. Open Chrome DevTools (F12)
2. Go to **Console** tab
3. Log in to your app with a test account
4. In the console, run this test:

```javascript
// Try to access another user's data (this should FAIL)
const response = await fetch('https://brjmujpjbmzhjepxamek.supabase.co/rest/v1/rpc/get_account_dashboard', {
  method: 'POST',
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    p_user_id: 'some-other-users-uuid'  // Try to pass someone else's ID
  })
});
console.log(await response.json());
```

**Expected Result:** You should get your own data, not the data for the user ID you tried to pass. The function now ignores the parameter.

### 3.2 Test Points Dashboard Security

Same test but for points:

```javascript
// Try to access another user's points (this should FAIL)
const response = await fetch('https://brjmujpjbmzhjepxamek.supabase.co/rest/v1/rpc/get_points_dashboard', {
  method: 'POST',
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    p_user_id: 'some-other-users-uuid'
  })
});
console.log(await response.json());
```

**Expected Result:** You should get your own points, not the points for the user ID you tried to pass.

✅ **If both tests return YOUR data (not the other user's):** Security is working correctly!

❌ **If you can see other users' data:** STOP - Do not deploy. Contact support or review the migration files.

---

## 🏗️ STEP 4: Build for Production (20 minutes)

### 4.1 Clean Build

```powershell
# Clear cache and reinstall
npm install
npx expo start --clear
```

### 4.2 Create Production Build

```powershell
# For iOS
eas build --platform ios --profile production

# For Android
eas build --platform android --profile production

# Or both
eas build --platform all --profile production
```

### 4.3 Monitor Build Progress

- Go to [https://expo.dev](https://expo.dev)
- Watch the build logs for errors
- Build typically takes 10-20 minutes

---

## ✅ STEP 5: Final Pre-Launch Checklist

Before submitting to App Store or releasing to users, verify:

### Security ✅
- [ ] Both SQL migrations applied successfully in Supabase
- [ ] Security tests pass (Step 3)
- [ ] No hardcoded credentials in code (check `lib/supabase.ts`)
- [ ] `.env` file is in `.gitignore`
- [ ] Environment variables are set in EAS Secrets (for builds)

### Functionality ✅
- [ ] Can sign up as new user
- [ ] Can log in with existing account
- [ ] Can view own profile/account data
- [ ] Can view own points
- [ ] Can check into events (QR code)
- [ ] Officers can create events
- [ ] President can approve events
- [ ] File uploads work (test bank)

### Build ✅
- [ ] Production build completes without errors
- [ ] App version incremented in `app.json` (currently 1.0.3)
- [ ] iOS build number incremented (currently 9)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No critical ESLint warnings

### Legal & Compliance ✅
- [ ] Privacy policy link works: https://sites.google.com/terpmail.umd.edu/dspapp/privacy-policy
- [ ] Terms of service link works: https://sites.google.com/terpmail.umd.edu/dspapp/terms-of-service
- [ ] App Store metadata ready (description, screenshots, keywords)

---

## 🚨 CRITICAL POST-LAUNCH MONITORING (First 24 Hours)

### Watch These Metrics:

1. **Supabase Dashboard → Logs**
   - Watch for errors in real-time
   - Look for failed authentication attempts
   - Monitor RPC function calls

2. **User Reports**
   - Set up a feedback channel (Discord, Slack, email)
   - Respond quickly to critical issues
   - Document any bugs for hot-fix

3. **Error Tracking**
   - If you have Sentry configured, monitor dashboard
   - Check Expo error reporting

### Common Issues to Watch For:

- Users can't log in → Check Supabase auth logs
- "Missing configuration" errors → Environment variables not set
- Crashes on iOS/Android → Check platform-specific logs
- File uploads failing → Check Supabase storage bucket permissions

---

## 🆘 EMERGENCY ROLLBACK

If you need to rollback after deployment:

### Option 1: Revert to Previous Build
```powershell
# Deploy previous working build from EAS
eas build:list
# Note the previous build ID
eas submit --build-id <previous-build-id>
```

### Option 2: Disable Features
If specific features are broken, disable them server-side:
- Update Supabase RLS policies to restrict access
- Create a maintenance mode flag in Supabase

---

## 📞 SUPPORT CONTACTS

**Supabase Support:** https://supabase.com/support  
**Expo Support:** https://expo.dev/support  
**Emergency Contact:** [Your tech lead/senior member]

---

## 🎉 LAUNCH CHECKLIST COMPLETE!

Once all steps above are complete with checkmarks, you're ready to:

1. **Submit to App Store** (iOS): Follow Apple's review process
2. **Submit to Play Store** (Android): Follow Google's review process
3. **Beta Test**: Release to 10-15 trusted users first via TestFlight
4. **Monitor**: Watch metrics for 24-48 hours
5. **Full Launch**: Announce to all 120 members

**Good luck with your launch! 🚀**
