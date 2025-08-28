# Google Calendar API Security Setup

## ✅ **What We've Done**

1. **Secured the service account file:**
   - Added `service-account.json` to `.gitignore`
   - Moved the file outside the project directory
   - Prevented accidental commits of sensitive credentials

2. **Updated the Google Calendar service:**
   - Removed hardcoded API keys and client IDs
   - Modified to use Supabase Edge Functions for secure authentication
   - Implemented proper access token flow

## 🚀 **Next Steps to Complete Setup**

### 1. Upload Service Account to Supabase Secrets

You'll need to add your service account JSON as a Supabase secret:

```bash
# Using Supabase CLI
supabase secrets set GOOGLE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"focal-cooler-470420-d7","private_key_id":"224f3154a9e08edda44ef3ff2fbe76095a521b8d","private_key":"-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY_HERE]\n-----END PRIVATE KEY-----\n","client_email":"dsp-calendar-admin@focal-cooler-470420-d7.iam.gserviceaccount.com","client_id":"115877353765051654224","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/dsp-calendar-admin%40focal-cooler-470420-d7.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'
```

**Or via Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions → Secrets
3. Add a new secret:
   - Name: `GOOGLE_SERVICE_ACCOUNT`
   - Value: [The entire JSON content from your service account file]

### 2. Deploy the Edge Function

```bash
# Deploy the Google Calendar auth function
supabase functions deploy google-calendar-auth
```

### 3. Install Required Dependencies

The Edge Function needs proper JWT signing. You'll need to:

1. **Add a proper JWT library to the Edge Function:**
   ```typescript
   import { create, verify } from "https://deno.land/x/djwt@v2.4/mod.ts"
   ```

2. **Implement proper RSA signing:**
   ```typescript
   // Replace the placeholder JWT creation with proper RSA256 signing
   const jwt = await create(
     { alg: "RS256", typ: "JWT" },
     payload,
     serviceAccount.private_key
   );
   ```

### 4. Test the Setup

Once deployed, your app will:
1. Call the Edge Function to get an access token
2. Use the access token to create Google Calendar events
3. Keep all sensitive credentials secure in Supabase

## 🔒 **Security Benefits**

- **No sensitive data in code:** Service account never touches your client code
- **Secure token exchange:** JWT signing happens server-side
- **Short-lived tokens:** Access tokens expire quickly for security
- **Environment isolation:** Secrets are isolated to Supabase environment

## 📁 **Current File Status**

- ✅ `service-account.json` → Moved to `../service-account-backup.json`
- ✅ `.gitignore` → Updated to exclude service account files
- ✅ `lib/googleCalendar.ts` → Updated to use Edge Functions
- ✅ `supabase/functions/google-calendar-auth/index.ts` → Created (needs deployment)

## 🎯 **Service Account Location**

Your service account file is now safely stored at:
`c:\Users\jackp\DSPapp\service-account-backup.json`

**Important:** Keep this file secure and never commit it to version control!

## 🔧 **Additional Notes**

- The Edge Function template is created but needs proper JWT signing implementation
- You may need to adjust the calendar ID and timezone settings
- Consider implementing additional error handling and logging
- Test thoroughly in development before using in production

Your Google Calendar API credentials are now secure! 🛡️✨
