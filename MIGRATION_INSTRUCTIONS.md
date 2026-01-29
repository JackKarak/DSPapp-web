# Database Migration Required

## Issue
The app is getting errors because the database function `get_account_dashboard()` references:
1. ~~`event_registration` table (which doesn't exist)~~ - Fixed in file
2. ~~`ea.attended` column (which doesn't exist)~~ - Fixed in file  
3. Column "e.start_time" GROUP BY error - Fixed in new migration

## Solution
Run the new migration file to update the database function.

## Steps to Fix

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com
   - Navigate to: SQL Editor

2. **Run the Migration**
   - Open the file: `supabase/migrations/20260129_fix_event_registration_error.sql`
   - Copy the ENTIRE contents (all 345 lines)
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify the Fix**
   - Go back to your app
   - Navigate to the Account tab
   - The errors should be resolved

## What This Migration Does

- **Removes** references to non-existent `event_registration` table
- **Fixes** all `ea.attended` references to use `ea.attended_at IS NOT NULL` instead
- **Fixes** GROUP BY error in events counting query
- **Removes** early_bird achievement (requires event_registration table)
- **Updates** all attendance checks to use the correct schema

## Current Schema (for reference)

### event_attendance table
- `event_id` (UUID)
- `user_id` (UUID)
- `attended_at` (TIMESTAMP) - NOT NULL if person attended, NULL if they didn't
- ❌ No `attended` boolean column

### events table  
- `id` (UUID)
- `title` (TEXT)
- `start_time` (TIMESTAMP)
- `point_type` (TEXT)
- `point_value` (INTEGER)
- etc.

### ❌ event_registration table
- **Does not exist** - removed/never created

## After Running Migration

The account screen should load without errors and show:
- User profile information
- Recent events attended
- Total points
- Analytics (streaks, rankings)
- Achievements (except early_bird)
- Appealable events
- Point appeals

---

**Created:** January 29, 2026  
**Migration File:** `20260129_fix_event_registration_error.sql`
