# Database Aggregation Deployment Guide

## Overview
This guide walks through deploying the database aggregation functions to improve app performance by 10-50x for large datasets.

## What You'll Deploy
- 5 PostgreSQL functions that perform calculations in the database instead of client-side
- Used in: Leaderboard, Account Analytics, Officer Analytics
- All changes are backward compatible (fallback to client-side if functions don't exist)

## Prerequisites
- Supabase project access (admin/owner role)
- Supabase CLI installed OR access to Supabase Dashboard SQL Editor
- No app code changes needed (already implemented with fallback pattern)

---

## Option 1: Deploy Using Supabase CLI (Recommended)

### Step 1: Install Supabase CLI (if not already installed)
```powershell
# Windows (using npm)
npm install -g supabase

# Verify installation
supabase --version
```

### Step 2: Login to Supabase
```powershell
supabase login
```

### Step 3: Link to Your Project
```powershell
cd c:\Users\jackp\DSPapp\DSPapp
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 4: Apply Migrations
```powershell
# Apply the user points function
supabase db push supabase/migrations/20251016_create_calculate_user_points_function.sql

# Apply the analytics aggregation functions
supabase db push supabase/migrations/20251016_create_analytics_aggregation_functions.sql
```

### Step 5: Verify Deployment
```powershell
supabase db remote ls
```

---

## Option 2: Deploy Using Supabase Dashboard (Alternative)

### Step 1: Access SQL Editor
1. Go to https://app.supabase.com
2. Select your DSPapp project
3. Click "SQL Editor" in left sidebar
4. Click "New query"

### Step 2: Deploy User Points Function
1. Open file: `supabase/migrations/20251016_create_calculate_user_points_function.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run" button
5. Verify success message appears (no red errors)

### Step 3: Deploy Analytics Functions
1. Open file: `supabase/migrations/20251016_create_analytics_aggregation_functions.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run" button
5. Verify success message appears (no red errors)

---

## Verification Steps

### 1. Check Functions Exist
Run this query in SQL Editor:
```sql
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'calculate_user_points',
    'get_event_attendance_stats',
    'get_user_engagement_metrics',
    'get_officer_performance_stats',
    'get_leaderboard'
  )
ORDER BY routine_name;
```

Expected result: 5 rows showing all functions

### 2. Test calculate_user_points Function
```sql
-- Get 5 sample user IDs
SELECT user_id FROM users LIMIT 5;

-- Test the function with those IDs (replace with actual UUIDs)
SELECT * FROM calculate_user_points(
  ARRAY[
    'uuid1'::uuid,
    'uuid2'::uuid,
    'uuid3'::uuid,
    'uuid4'::uuid,
    'uuid5'::uuid
  ]
);
```

Expected result: Table with user_id and total_points columns

### 3. Test get_event_attendance_stats Function
```sql
-- Get 5 sample event IDs
SELECT id FROM events LIMIT 5;

-- Test the function with those IDs (replace with actual UUIDs)
SELECT * FROM get_event_attendance_stats(
  ARRAY[
    'event-uuid1'::uuid,
    'event-uuid2'::uuid,
    'event-uuid3'::uuid
  ]
);
```

Expected result: Table with event_id, attendance_count, registration_count, average_feedback_rating

### 4. Test get_leaderboard Function
```sql
SELECT * FROM get_leaderboard(10);
```

Expected result: Top 10 users with rankings and points

### 5. Check Permissions
```sql
-- Verify functions are executable by authenticated users
SELECT 
  routine_name,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND grantee = 'authenticated'
  AND routine_name LIKE 'calculate_user_points%'
   OR routine_name LIKE 'get_event_attendance_stats%'
   OR routine_name LIKE 'get_user_engagement_metrics%'
   OR routine_name LIKE 'get_officer_performance_stats%'
   OR routine_name LIKE 'get_leaderboard%';
```

Expected result: Multiple rows showing EXECUTE privileges

---

## Post-Deployment Testing

### 1. Test in Mobile App

#### Test Leaderboard
1. Open app
2. Navigate to Points tab
3. Pull to refresh
4. Check console logs for: `"Using database aggregation for leaderboard calculation"`
5. Verify leaderboard loads MUCH faster (should be <1 second)

#### Test Account Analytics
1. Navigate to Account tab
2. Scroll to analytics section
3. Pull to refresh
4. Check console logs for: `"Using database aggregation for analytics calculation"`
5. Verify analytics load quickly

#### Test Officer Analytics
1. Login as officer
2. Navigate to Officer Analytics
3. Pull to refresh
4. Check console logs for: `"Using database aggregation for attendance stats"`
5. Verify charts and stats load quickly

### 2. Monitor Performance

#### Before Database Aggregation
Typical performance (with 50+ users, 100+ events):
- Leaderboard: 3000-5000ms
- Account Analytics: 2000-3000ms
- Officer Analytics: 2000-4000ms

#### After Database Aggregation
Expected performance:
- Leaderboard: 300-500ms (10x faster)
- Account Analytics: 400-600ms (5x faster)
- Officer Analytics: 400-800ms (3-5x faster)

### 3. Check for Fallback Messages
Open app console and search for:
- ❌ `"Using client-side calculation (fallback)"` - RPC function not available
- ✅ `"Using database aggregation"` - RPC function working correctly

If you see fallback messages:
1. Verify functions deployed correctly (run verification queries above)
2. Check function names match exactly (case-sensitive)
3. Verify permissions granted to `authenticated` role
4. Try restarting app/clearing cache

---

## Troubleshooting

### Error: "function calculate_user_points does not exist"
**Cause**: Function not deployed or wrong schema

**Solution**:
1. Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'calculate_user_points';`
2. If empty, re-run migration
3. If exists, check schema: `SELECT routine_schema FROM information_schema.routines WHERE routine_name = 'calculate_user_points';`
4. Should be in `public` schema

### Error: "permission denied for function calculate_user_points"
**Cause**: Missing GRANT statement

**Solution**:
```sql
GRANT EXECUTE ON FUNCTION calculate_user_points(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_attendance_stats(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_officer_performance_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard(integer) TO authenticated;
```

### Error: "syntax error near 'CREATE OR REPLACE'"
**Cause**: Using MSSQL instead of PostgreSQL

**Solution**: Make sure you're running in PostgreSQL database, not MSSQL. All SQL files are PostgreSQL-specific.

### App Still Using Client-Side Calculation
**Cause**: RPC call failing silently

**Solution**:
1. Check browser/app console for actual error message
2. Verify Supabase connection working: `await supabase.from('users').select('count')`
3. Test RPC directly: `await supabase.rpc('calculate_user_points', { user_ids: ['test-uuid'] })`
4. Check response for error property: `if (result.error) console.error(result.error)`

### Performance Not Improving
**Cause**: Small dataset or network bottleneck

**Investigation**:
1. Check dataset size: `SELECT COUNT(*) FROM events; SELECT COUNT(*) FROM event_attendance;`
2. Performance gains more noticeable with 100+ events, 50+ users
3. Test on slow network (3G simulation) to see difference
4. Use browser DevTools Network tab to compare before/after request sizes

### Function Returns Empty Results
**Cause**: No data matches criteria

**Solution**:
1. Verify data exists: `SELECT COUNT(*) FROM event_attendance;`
2. Check user_ids array is not empty
3. Verify events have `status = 'approved'`
4. Check appeals have `status = 'approved'`
5. Test with known good user IDs

---

## Rollback Procedure

If issues arise, you can safely rollback:

### Option 1: Drop Functions (Clean Rollback)
```sql
DROP FUNCTION IF EXISTS calculate_user_points(uuid[]);
DROP FUNCTION IF EXISTS get_event_attendance_stats(uuid[]);
DROP FUNCTION IF EXISTS get_user_engagement_metrics(uuid);
DROP FUNCTION IF EXISTS get_officer_performance_stats(uuid);
DROP FUNCTION IF EXISTS get_leaderboard(integer);
```

**Effect**: App will automatically use client-side fallback (slower but functional)

### Option 2: Do Nothing
**Effect**: Since all code has fallback logic, if functions fail the app continues working using client-side calculations. No data loss or breakage.

---

## Performance Monitoring

### Set Up Monitoring Query
Run periodically to check function usage:
```sql
SELECT 
  schemaname,
  funcname,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_user_functions
WHERE funcname IN (
  'calculate_user_points',
  'get_event_attendance_stats', 
  'get_user_engagement_metrics',
  'get_officer_performance_stats',
  'get_leaderboard'
)
ORDER BY calls DESC;
```

### Metrics to Track
- `calls`: How many times function was called
- `total_time`: Total execution time (milliseconds)
- `mean_time`: Average execution time per call
- `max_time`: Longest execution time

### Expected Performance
- `calculate_user_points`: 10-50ms avg for 100 users
- `get_event_attendance_stats`: 20-100ms avg for 50 events
- `get_leaderboard`: 50-200ms avg for top 100 users

---

## Next Steps After Deployment

1. **Monitor console logs** for 1 week to ensure RPC calls succeeding
2. **Collect user feedback** on performance improvements
3. **Review pg_stat_user_functions** to identify slow queries
4. **Consider additional optimizations**:
   - Materialized views for frequently accessed data
   - Database indexes on commonly filtered columns
   - Real-time subscriptions for live updates
5. **Document performance wins** for future reference

---

## Success Criteria

✅ All 5 functions deployed successfully  
✅ Verification queries return expected results  
✅ App console shows "Using database aggregation" messages  
✅ No "fallback" messages in console  
✅ Leaderboard loads in <1 second  
✅ Account analytics loads in <1 second  
✅ Officer analytics loads in <1 second  
✅ No errors in Supabase logs  
✅ Users report faster app performance  

---

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard > Logs
2. Review app console for error messages
3. Test functions manually using SQL Editor
4. Verify all prerequisite tables exist (users, events, event_attendance, point_appeal)
5. Confirm RLS policies allow function execution

Remember: **Fallback pattern ensures zero downtime**. Even if deployment fails, app continues working with client-side calculations.
