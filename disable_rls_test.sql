-- EMERGENCY FIX: Temporarily disable RLS to test
-- Run this in Supabase SQL Editor to quickly test if RLS is the issue

-- Step 1: Disable RLS temporarily
ALTER TABLE admin_feedback DISABLE ROW LEVEL SECURITY;

-- Step 2: Test if app works now
-- Go test your president dashboard - it should now show all feedback

-- Step 3: If it works, you can re-enable RLS with fixed policies later:
-- ALTER TABLE admin_feedback ENABLE ROW LEVEL SECURITY;

-- Step 4: Check what feedback exists
SELECT id, user_id, subject, message, status, submitted_at 
FROM admin_feedback 
ORDER BY submitted_at DESC;
