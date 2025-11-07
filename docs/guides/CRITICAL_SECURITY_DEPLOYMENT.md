# CRITICAL SECURITY FIX - Deployment Instructions

## Overview
This fixes three critical issues before production deployment:
1. **Security Vulnerability #1**: `get_account_dashboard` RPC accepting user_id from client
2. **Security Vulnerability #2**: `get_points_dashboard` RPC accepting user_id from client  
3. **File Upload Hack**: Placeholder URLs instead of actual file uploads

---

## 🚨 IMMEDIATE ACTION REQUIRED - MULTIPLE SECURITY HOLES FOUND

### Step 1: Apply SQL Migrations (CRITICAL - Do First)

**Location**: 
- `supabase/migrations/20241106_fix_account_dashboard_security.sql`
- `supabase/migrations/20241106_fix_points_dashboard_security.sql`

**How to Apply**:

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. **First**, copy the entire contents of `20241106_fix_account_dashboard_security.sql`
5. Paste into the SQL editor and click **Run** (or press Ctrl+Enter)
6. Verify success message appears
7. **Then**, click **New Query** again
8. Copy the entire contents of `20241106_fix_points_dashboard_security.sql`
9. Paste into the SQL editor and click **Run**
10. Verify success message appears

#### Option B: Via Supabase CLI
```powershell
# From project root
cd c:\Users\jackp\DSPapp\DSPapp
supabase db push
```

**⚠️ IMPORTANT**: Both migrations must be applied. Don't skip either one.

### Step 2: Verify Storage Bucket Exists

The test-bank storage bucket should already exist from previous migration `20241106_create_test_bank_storage_bucket.sql`.

**Verify in Supabase Dashboard**:
1. Go to **Storage** section
2. Confirm `test-bank` bucket exists
3. If not, run the migration:
   ```sql
   -- Run in SQL Editor
   \i supabase/migrations/20241106_create_test_bank_storage_bucket.sql
   ```

### Step 3: Deploy Updated TypeScript Code

The following files have been fixed:
- `app/(tabs)/account/_hooks/useAccount.ts`
- `app/(tabs)/account/_hooks/useAccountData.ts`
- `hooks/points/usePointsData.ts`

**Deploy via your normal process** (EAS Build, etc.)

---

## What Was Fixed

### 🔴 Critical Security Vulnerability #1: Account Dashboard

**BEFORE** (Vulnerable):
```typescript
// Client could pass ANY user_id
const { data } = await supabase.rpc('get_account_dashboard', {
  p_user_id: user.id  // ⚠️ Can be manipulated
});
```

```sql
-- RPC accepted user_id from client
CREATE FUNCTION get_account_dashboard(p_user_id UUID)
```

**AFTER** (Secure):
```typescript
// No user_id parameter - server determines from JWT
const { data } = await supabase.rpc('get_account_dashboard');
```

```sql
-- RPC gets user_id from auth.uid() - can't be spoofed
CREATE FUNCTION get_account_dashboard()
RETURNS JSON AS $$
  DECLARE v_user_id UUID := auth.uid();
```

**Impact**: 
- **Before**: Any user could view any other user's account data (profile, events, analytics, appeals)
- **After**: Users can only access their own data

---

### 🔴 Critical Security Vulnerability #2: Points Dashboard

**BEFORE** (Vulnerable):
```typescript
// Client could pass ANY user_id
const { data } = await supabase.rpc('get_points_dashboard', {
  p_user_id: user.id  // ⚠️ Can be manipulated
});
```

```sql
-- RPC accepted user_id from client
CREATE FUNCTION get_points_dashboard(p_user_id UUID)
```

**AFTER** (Secure):
```typescript
// No user_id parameter - server determines from JWT
const { data } = await supabase.rpc('get_points_dashboard');
```

```sql
-- RPC gets user_id from auth.uid() - can't be spoofed
CREATE FUNCTION get_points_dashboard()
RETURNS JSON AS $$
  DECLARE v_user_id UUID := auth.uid();
```

**Impact**: 
- **Before**: Any user could view any other user's points data (category breakdown, rankings)
- **After**: Users can only access their own data

---

### 🟠 File Upload Placeholder Hack

**BEFORE** (Broken):
```typescript
// Silently failed and stored fake URLs
let fileUrl = `placeholder_${testBankSelectedFile.name}`;
try {
  const result = await uploadFileToStorage(...);
  if (result.success) { fileUrl = result.filePath; }
} catch {
  console.warn('Upload failed, using placeholder');
  // Continues with placeholder!
}
```

**AFTER** (Proper):
```typescript
// Throws error if upload fails - user knows immediately
const result = await uploadFileToStorage(...);
if (!result.success || !result.filePath) {
  throw new Error(result.error || 'File upload failed');
}
// Only proceeds if upload succeeded
```

**Impact**:
- **Before**: Users thought files uploaded but actually stored placeholder strings
- **After**: Upload either succeeds or shows clear error message

---

## Testing Checklist

After deployment, test the following:

### Security Tests
- [ ] **Account Dashboard**: Log in as User A, try to access User B's account data (should fail)
- [ ] **Points Dashboard**: Log in as User A, try to access User B's points data (should fail)
- [ ] Confirm both RPCs return only authenticated user's data

### File Upload Test
- [ ] Go to Account tab
- [ ] Open Test Bank section
- [ ] Try uploading a PDF file
- [ ] Verify file appears in Supabase Storage → test-bank bucket
- [ ] Verify file URL in `test_bank` table is NOT a placeholder

### Account Data Test
- [ ] Verify profile loads correctly
- [ ] Verify events list loads
- [ ] Verify analytics display
- [ ] Verify appeals section works
- [ ] Verify feedback can be submitted

### Points Data Test
- [ ] Verify points breakdown by category displays
- [ ] Verify leaderboard displays
- [ ] Verify user rank displays correctly

---

## Rollback Plan

If issues occur after deployment:

### Rollback SQL (Emergency Only)
```sql
-- Restore old functions temporarily (DO NOT USE IN PRODUCTION LONG-TERM)
CREATE OR REPLACE FUNCTION get_account_dashboard(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- ... (old implementation)
$$;

CREATE OR REPLACE FUNCTION get_points_dashboard(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- ... (old implementation)
$$;
```

### Rollback TypeScript
```typescript
// Revert to passing user_id (INSECURE - temporary only)
const { data } = await supabase.rpc('get_account_dashboard', {
  p_user_id: user.id
});
const { data } = await supabase.rpc('get_points_dashboard', {
  p_user_id: user.id
});
```

**⚠️ IMPORTANT**: Rollback should only be used temporarily while debugging. The security fixes MUST be deployed before going to production.

---

## Additional Recommendations

### Before Production Launch:
1. ✅ Security fix applied
2. ✅ File upload working
3. [ ] Test with 5-10 real users
4. [ ] Monitor error logs for first 24 hours
5. [ ] Have admin credentials ready for emergency fixes

### Post-Launch Monitoring:
- Watch Supabase logs for RPC errors
- Monitor storage bucket usage
- Check for any 403/401 authentication errors
- Verify no placeholder URLs in test_bank table

---

## Questions?

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Check browser console for client-side errors
3. Verify migration was applied: Check `schema_migrations` table
4. Verify storage bucket permissions are correct

---

**Status**: 🔴 **NOT DEPLOYED YET - APPLY IMMEDIATELY**
**Priority**: CRITICAL - Block production launch until fixed
**Estimated Time**: 10 minutes
