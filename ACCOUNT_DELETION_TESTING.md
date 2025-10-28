# Account Deletion Testing Guide

## Pre-Testing Setup

### 1. Create a Test Account
```
Email: test-deletion@example.com
Password: TestPass123!
Name: Test User
```

### 2. Add Some Data
- Check in to 1-2 events
- Submit test bank upload
- Create a point appeal
- Submit event feedback

---

## Testing Steps

### Test 1: Navigate to Deletion Feature
1. ✅ Open app and log in with test account
2. ✅ Tap "Account" tab (bottom navigation)
3. ✅ Scroll down to "Settings" section
4. ✅ Verify "Delete Account" button is visible and styled in red

**Expected Result:** Button clearly visible with warning styling

---

### Test 2: Initial Warning Alert
1. ✅ Tap "Delete Account" button
2. ✅ Verify Alert appears with:
   - Title: "Delete Account"
   - Message explaining action cannot be undone
   - Two buttons: "Cancel" and "Continue"

**Expected Result:** Clear warning before proceeding

---

### Test 3: Deletion Modal Display
1. ✅ Tap "Continue" in alert
2. ✅ Verify modal appears with:
   - ⚠️ Title "Delete Account"
   - Red warning box with list of what will be deleted
   - Blue recovery info box (7-day recovery window)
   - Text input field
   - "Cancel" and "Delete Forever" buttons

**Expected Result:** Comprehensive modal with all warnings

---

### Test 4: Confirmation Text Validation
1. ✅ Try typing incorrect text: "delete"
2. ✅ Verify "Delete Forever" button stays disabled
3. ✅ Try typing: "DELETE MY ACCOUN" (missing T)
4. ✅ Verify button still disabled
5. ✅ Type correctly: "DELETE MY ACCOUNT"
6. ✅ Verify:
   - Input field turns green
   - "Delete Forever" button becomes enabled (bright red)

**Expected Result:** Button only enables with exact match

---

### Test 5: Cancel Functionality
1. ✅ With text entered, tap "Cancel"
2. ✅ Verify modal closes
3. ✅ Verify still on Account screen
4. ✅ Verify still logged in

**Expected Result:** Can cancel at any time

---

### Test 6: Execute Deletion
1. ✅ Tap "Delete Account" again
2. ✅ Proceed through alert
3. ✅ Type "DELETE MY ACCOUNT"
4. ✅ Tap "Delete Forever" button
5. ✅ Observe loading state (spinner appears)
6. ✅ Verify success alert appears
7. ✅ Verify automatically signed out
8. ✅ Verify returned to login screen

**Expected Result:** Smooth deletion process with clear feedback

---

### Test 7: Verify Account Deletion
1. ✅ Try to log back in with deleted account credentials
2. ✅ Verify login fails with error message

**Expected Result:** Cannot access deleted account

---

### Test 8: Verify Data Anonymization (Database Check)

Run in Supabase SQL Editor:
```sql
-- Check user record is marked deleted
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  deleted_at,
  status
FROM users 
WHERE email LIKE 'deleted_%@deleted.local'
ORDER BY deleted_at DESC
LIMIT 5;

-- Should show:
-- email: deleted_[UUID]@deleted.local
-- first_name: Deleted
-- last_name: User
-- deleted_at: [timestamp]
-- status: deleted
```

**Expected Result:** Personal data anonymized, marked as deleted

---

### Test 9: Verify Data Cleanup
```sql
-- Check organization memberships removed
SELECT COUNT(*) 
FROM organization_members 
WHERE user_id = '[deleted_user_uuid]';
-- Should return: 0

-- Check appeals anonymized
SELECT appeal_reason, picture_url
FROM point_appeals
WHERE user_id = '[deleted_user_uuid]';
-- Should show: '[REDACTED - User deleted]' and NULL

-- Check notifications anonymized
SELECT title, body
FROM notifications
WHERE user_id = '[deleted_user_uuid]'
LIMIT 1;
-- Should show: '[REDACTED]'
```

**Expected Result:** Related data cleaned or anonymized

---

### Test 10: VoiceOver Accessibility (iOS)

1. ✅ Enable VoiceOver: Settings → Accessibility → VoiceOver → On
2. ✅ Navigate to Account tab
3. ✅ Swipe to "Delete Account" button
4. ✅ Verify announcement: "Delete account, button. Double tap to permanently delete your account and all associated data"
5. ✅ Open deletion modal
6. ✅ Verify warnings are read aloud
7. ✅ Navigate to confirmation input
8. ✅ Verify: "Account deletion confirmation input. Type DELETE MY ACCOUNT in capital letters to enable the deletion button"
9. ✅ Navigate to "Delete Forever" button when disabled
10. ✅ Verify: "Delete account permanently, button, dimmed. Enter the confirmation text to enable this button"

**Expected Result:** Full VoiceOver support with helpful descriptions

---

## Edge Cases to Test

### Edge Case 1: Network Error
1. Turn on Airplane Mode
2. Try to delete account
3. Verify error handling

**Expected Result:** Clear error message shown

---

### Edge Case 2: App Backgrounding
1. Start deletion process
2. Background the app (home button)
3. Return to app
4. Verify modal still present or state maintained

**Expected Result:** Graceful handling of app state

---

### Edge Case 3: Multiple Rapid Taps
1. Type confirmation text
2. Rapidly tap "Delete Forever" multiple times
3. Verify deletion only happens once

**Expected Result:** Button disables after first tap, no duplicate deletions

---

## Database Verification Queries

### Check Deletion Log
```sql
SELECT 
  action,
  metadata,
  created_at
FROM activity_logs
WHERE user_id = '[deleted_user_uuid]'
AND action IN ('account_deletion_initiated', 'account_deletion_completed')
ORDER BY created_at DESC;
```

### Verify 30-Day Purge Eligibility
```sql
SELECT can_purge_user_data('[deleted_user_uuid]');
-- Should return: false (until 30 days pass)
```

---

## Apple Review Specific Testing

### Demo for Reviewer
Create a screen recording showing:
1. ✅ Launch app
2. ✅ Log in
3. ✅ Navigate to Account → Settings
4. ✅ Show "Delete Account" button clearly visible
5. ✅ Tap button and show warning
6. ✅ Show deletion modal with all warnings
7. ✅ Type confirmation text
8. ✅ Show button enabling
9. ✅ Complete deletion
10. ✅ Show logged out state

**Save as:** `account-deletion-demo.mov`

---

## Recovery Testing (Optional)

### Test Recovery Window
1. Delete account
2. Within 7 days, contact operationsdspgs@gmail.com
3. Request account recovery
4. Verify recovery request is logged

**Note:** Full recovery requires admin approval (not automated)

---

## Regression Testing

After account deletion implementation, verify these still work:

- [ ] Regular login/logout
- [ ] Profile updates
- [ ] Event check-ins
- [ ] Point appeals
- [ ] Test bank uploads
- [ ] Event feedback
- [ ] Data consent modal
- [ ] Settings updates

---

## Success Criteria

✅ **All tests pass**
✅ **No console errors**
✅ **Data properly anonymized**
✅ **User experience is clear and safe**
✅ **Accessibility fully supported**
✅ **Apple guidelines fully met**

---

## Issues Found

_(Document any issues discovered during testing)_

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| _None yet_ | - | - | - |

---

## Sign-Off

- [ ] All tests completed successfully
- [ ] Edge cases handled properly
- [ ] Accessibility verified
- [ ] Database queries confirm proper deletion
- [ ] Ready for Apple Review submission

**Tested By:** _________________  
**Date:** _________________  
**Build Version:** _________________

