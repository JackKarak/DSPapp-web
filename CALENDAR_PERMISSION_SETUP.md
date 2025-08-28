## 🔧 Google Calendar Permission Setup

### CRITICAL: Add Service Account to Your Calendar

Your service account email: `dsp-calendar-admin@focal-cooler-470420-d7.iam.gserviceaccount.com`

### Steps to Grant Permissions:

1. **Open Google Calendar**: https://calendar.google.com/calendar/u/0/settings
2. **Find Your DSP Calendar**: Look for calendar ID `2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6@group.calendar.google.com`
3. **Go to "Share with specific people"**
4. **Add Service Account**:
   - Email: `dsp-calendar-admin@focal-cooler-470420-d7.iam.gserviceaccount.com`
   - Permission: **"Make changes to events"**
5. **Click "Send"**

### Alternative Method:
1. Go directly to your calendar: https://calendar.google.com/calendar/embed?src=2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6%40group.calendar.google.com&ctz=America%2FNew_York
2. Click the settings gear (⚙️) 
3. Select "Settings and sharing"
4. Scroll to "Share with specific people"
5. Add the service account with "Make changes to events" permission

### ⚠️ IMPORTANT:
Without this permission, you'll continue to get the authentication error. The service account needs explicit access to write to your specific calendar.

### Test After Adding Permission:
Try approving an event in your DSP app. The calendar integration should work immediately after adding the permission.
