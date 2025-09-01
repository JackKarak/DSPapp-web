-- COMPLETE RLS FIX for President Dashboard
-- Copy and paste this entire block into your Supabase SQL Editor

-- Step 1: Check current state
SELECT 'Current admin_feedback records:' as step;
SELECT COUNT(*) as total_records FROM admin_feedback;

SELECT 'Current RLS status:' as step;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'admin_feedback';

SELECT 'Current policies:' as step;
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'admin_feedback';

-- Step 2: Completely reset RLS policies
ALTER TABLE admin_feedback DISABLE ROW LEVEL SECURITY;

-- Remove all existing policies
DO $$ 
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "admin_feedback_policy" ON admin_feedback;
    DROP POLICY IF EXISTS "Users can view feedback based on role" ON admin_feedback;
    DROP POLICY IF EXISTS "Allow admin access" ON admin_feedback;
    DROP POLICY IF EXISTS "Admin users can access all feedback" ON admin_feedback;
    DROP POLICY IF EXISTS "admin_users_full_access" ON admin_feedback;
    DROP POLICY IF EXISTS "officer_users_read_access" ON admin_feedback;
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- Ignore if policy doesn't exist
END $$;

-- Step 3: Re-enable RLS and create simple, working policies
ALTER TABLE admin_feedback ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for admin users
CREATE POLICY "admin_full_access" ON admin_feedback
FOR ALL
TO authenticated
USING (
  auth.uid()::text IN (
    SELECT user_id FROM users WHERE role = 'admin'
  )
);

-- Step 4: Verify the fix
SELECT 'Verification - RLS enabled:' as step;
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'admin_feedback';

SELECT 'Verification - New policies:' as step;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'admin_feedback';

SELECT 'Verification - Sample data access test:' as step;
SELECT id, subject, user_id, status FROM admin_feedback LIMIT 3;
