# Fixing Point Thresholds RLS Error

## Problem
The VP Operations screen was getting a Row-Level Security (RLS) policy error when trying to save point thresholds because the RLS policy only allowed UPDATE but not INSERT operations, and the `upsert` operation requires both.

## Solution
Created a PostgreSQL function with `SECURITY DEFINER` that handles both INSERT and UPDATE operations with proper permission checks.

## Files Changed

### 1. New Migration File
- **File**: `supabase/migrations/20260127_add_update_thresholds_function.sql`
- **What it does**: Creates a secure function that VP Operations can use to update point thresholds

### 2. Updated Operations Screen
- **File**: `app/officer/operations.tsx`
- **Change**: Updated `saveThresholds()` to use RPC function instead of direct database upsert

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260127_add_update_thresholds_function.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl+Enter`

### Option 2: Supabase CLI (if installed)
```bash
supabase db push
```

## Testing
After applying the migration:
1. Open the app and navigate to VP Operations screen
2. Try changing any point threshold value
3. Click "Save Changes"
4. You should see "Point thresholds updated successfully" message

## What the Migration Does
- Creates `update_point_thresholds()` function
- Validates that only VP Operations can execute it
- Handles both insert and update operations
- Returns the updated values as JSON
- Has `SECURITY DEFINER` privilege to bypass RLS policies

## Technical Details
The function checks:
1. User is authenticated (via `auth.uid()`)
2. User has role = 'officer'
3. User has officer_position = 'vp_operations'

If all checks pass, it updates the thresholds using UPSERT with elevated privileges.
