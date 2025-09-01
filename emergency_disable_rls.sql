-- EMERGENCY FIX: Temporarily disable RLS to test president dashboard
-- Run this in your Supabase SQL Editor Dashboard

-- First check if the table exists and has data
SELECT COUNT(*) as total_records FROM admin_feedback;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'admin_feedback';

-- TEMPORARILY disable RLS to test if that's the issue
ALTER TABLE admin_feedback DISABLE ROW LEVEL SECURITY;

-- Test query to see if data is now accessible
SELECT id, subject, message, submitted_at, status, user_id
FROM admin_feedback
ORDER BY submitted_at DESC
LIMIT 5;

-- If the above works, then we know it's an RLS issue
-- After testing, you can re-enable RLS with:
-- ALTER TABLE admin_feedback ENABLE ROW LEVEL SECURITY;
