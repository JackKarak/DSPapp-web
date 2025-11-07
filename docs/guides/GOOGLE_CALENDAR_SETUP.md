# 🗓️ Google Calendar Integration Setup Guide

Your Edge Function code is **correct**! This guide explains how to configure Google Calendar integration for your DSP app.

---

## 📋 Overview

Your app uses **Google Service Account authentication** via Supabase Edge Functions to add events to a shared Google Calendar. This is the right approach for server-to-server authentication.

**Architecture:**
```
React Native App → Supabase Edge Function → Google Calendar API
                    (holds service account)
```

---

## ✅ What You Already Have

1. ✅ **Edge Function Code** - Your `google-calendar-auth` function is correctly implemented
2. ✅ **Calendar ID** - Already configured: `2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6@group.calendar.google.com`
3. ✅ **Client Code** - `lib/googleCalendar.ts` properly calls your Edge Function

---

## 🔧 Step-by-Step Setup

### Step 1: Create Google Cloud Service Account (If Not Done)

If you haven't already created a service account:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Calendar API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google Calendar API"
   - Click **Enable**

4. Create Service Account:
   - Go to **IAM & Admin** → **Service Accounts**
   - Click **Create Service Account**
   - Name: `dsp-calendar-service`
   - Click **Create and Continue**
   - Skip role assignment (click **Continue**)
   - Click **Done**

5. Create Private Key:
   - Click on your new service account
   - Go to **Keys** tab
   - Click **Add Key** → **Create New Key**
   - Choose **JSON** format
   - Click **Create**
   - **Save this file securely** - you'll need it in Step 2

---

### Step 2: Share Calendar with Service Account

1. Open [Google Calendar](https://calendar.google.com)
2. Find your DSP calendar (with ID: `2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6@group.calendar.google.com`)
3. Click the three dots next to the calendar → **Settings and sharing**
4. Scroll to **Share with specific people**
5. Click **Add people**
6. Enter your service account email (from the JSON file):
   - Format: `something@your-project.iam.gserviceaccount.com`
7. Set permission to **Make changes to events**
8. Click **Send**

---

### Step 3: Configure Supabase Edge Function Secret

**⚠️ IMPORTANT:** Service account credentials should NEVER be in your `.env` file or committed to git!

#### Via Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your DSP project
3. Navigate to **Edge Functions** in the left sidebar
4. Click **Manage Secrets** (or **Settings** → **Edge Functions**)
5. Add a new secret:
   - **Name:** `GOOGLE_SERVICE_ACCOUNT`
   - **Value:** Paste the **entire contents** of your service account JSON file

**Example of what the value should look like:**
```json
{"type":"service_account","project_id":"your-project-123","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n","client_email":"dsp-calendar@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}
```

**Important Notes:**
- Copy as **one line** (no extra spaces or line breaks)
- Include the entire JSON object with all fields
- Make sure the `private_key` contains `\n` (literal backslash-n), not actual newlines

#### Via Supabase CLI (Alternative):

```bash
# Set the secret
supabase secrets set GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Verify it's set
supabase secrets list
```

---

### Step 4: Deploy Your Edge Function

If you haven't deployed your Edge Function yet:

```bash
# From your project root
supabase functions deploy google-calendar-auth
```

**Verify deployment:**
```bash
supabase functions list
```

You should see `google-calendar-auth` in the list.

---

### Step 5: Test the Integration

#### Test via Supabase Dashboard:

1. Go to **Edge Functions** → `google-calendar-auth`
2. Click **Invoke Function**
3. Send an empty request body: `{}`
4. You should get a response like:
```json
{
  "access_token": "ya29.a0AfB_byD...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### Test from Your App:

1. Log in as a President or Officer
2. Try to approve an event (in `app/president/approve.tsx`)
3. Check the calendar - the event should appear
4. Check console logs for success/error messages

---

## 🐛 Troubleshooting

### Error: "Service account configuration missing"
- **Cause:** `GOOGLE_SERVICE_ACCOUNT` secret not set in Supabase
- **Fix:** Complete Step 3 above

### Error: "Invalid service account JSON format"
- **Cause:** JSON is malformed or has line breaks
- **Fix:** Ensure JSON is on one line, properly escaped

### Error: "Failed to import private key"
- **Cause:** Private key format is incorrect
- **Fix:** Ensure private key has `\n` (not actual newlines) and includes BEGIN/END markers

### Error: "Token exchange failed: 403"
- **Cause:** Service account doesn't have calendar access
- **Fix:** Complete Step 2 - share calendar with service account email

### Error: "Calendar integration failed"
- **Cause:** Edge Function not deployed or wrong calendar ID
- **Fix:** Deploy function (Step 4) and verify calendar ID

### Events Don't Appear in Calendar
- **Cause:** Service account lacks "Make changes to events" permission
- **Fix:** In Google Calendar sharing settings, ensure permission is set correctly

---

## 🔒 Security Best Practices

✅ **DO:**
- Store service account in Supabase Edge Function secrets
- Use service accounts for server-to-server authentication
- Limit calendar permissions to only what's needed
- Rotate service account keys periodically

❌ **DON'T:**
- Put service account credentials in `.env` file
- Commit service account JSON to git
- Share service account credentials in Slack/email
- Use user OAuth for server-side calendar operations

---

## 📝 Environment Variable Summary

### In Your `.env` File:
```bash
GOOGLE_CALENDAR_ID=2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6@group.calendar.google.com
```

### In Supabase Edge Function Secrets:
```
GOOGLE_SERVICE_ACCOUNT = {"type":"service_account",...}
```

### NOT in `.env` or Git:
- ❌ Service account JSON file
- ❌ Private keys
- ❌ Service account credentials

---

## ✅ Verification Checklist

Before considering Google Calendar integration complete:

- [ ] Google Calendar API enabled in Google Cloud Console
- [ ] Service account created with JSON key downloaded
- [ ] Calendar shared with service account email
- [ ] `GOOGLE_SERVICE_ACCOUNT` secret set in Supabase
- [ ] Edge Function deployed successfully
- [ ] Test invocation returns access token
- [ ] Event creation works from app
- [ ] Events appear in Google Calendar

---

## 🔄 Optional: Update Calendar ID

If you want to use a different calendar:

1. Create a new Google Calendar
2. Get the Calendar ID:
   - Calendar Settings → Integrate calendar → Calendar ID
3. Update in your `.env`:
```bash
GOOGLE_CALENDAR_ID=your-new-calendar-id@group.calendar.google.com
```
4. Update in `lib/googleCalendar.ts` (line 6) if you want it hardcoded
5. Share new calendar with service account

---

## 📞 Need Help?

**Google Cloud Console:** https://console.cloud.google.com  
**Supabase Dashboard:** https://app.supabase.com  
**Google Calendar API Docs:** https://developers.google.com/calendar

---

**Your Edge Function code is correct and follows Google's recommended patterns for service account authentication!** ✅
