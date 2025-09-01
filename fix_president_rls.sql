-- Fix RLS policies for president dashboard access to admin_feedback table
-- Run this in your Supabase SQL Editor

-- First, let's check what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_feedback';

-- Check if RLS is enabled on the table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'admin_feedback';

-- Drop any existing problematic policies
DROP POLICY IF EXISTS "admin_feedback_policy" ON admin_feedback;
DROP POLICY IF EXISTS "Users can view feedback based on role" ON admin_feedback;
DROP POLICY IF EXISTS "Allow admin access" ON admin_feedback;
DROP POLICY IF EXISTS "Admin users can access all feedback" ON admin_feedback;

-- Create a comprehensive policy that allows admin users to access all feedback
CREATE POLICY "admin_users_full_access" ON admin_feedback
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.user_id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Also create a policy for officers to view feedback (if needed)
CREATE POLICY "officer_users_read_access" ON admin_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.user_id = auth.uid() 
    AND users.role IN ('admin', 'officer')
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_feedback';

-- Test query to see if data is now accessible
SELECT id, subject, message, submitted_at, status, user_id
FROM admin_feedback
ORDER BY submitted_at DESC
LIMIT 5;
