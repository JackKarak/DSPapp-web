-- Diagnostic queries to check president dashboard issues
-- Run these in Supabase SQL Editor to debug

-- 1. Check if admin_feedback table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'admin_feedback';

-- 2. Check if there's any feedback data
SELECT COUNT(*) as total_feedback, 
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_feedback
FROM admin_feedback;

-- 3. Check your user's role and permissions
SELECT user_id, first_name, last_name, role, officer_position, approved
FROM users 
WHERE user_id = auth.uid()::text;

-- 4. Check RLS policies on admin_feedback
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'admin_feedback';

-- 5. Test if you can read admin_feedback directly
SELECT id, subject, message, status, submitted_at, user_id
FROM admin_feedback 
ORDER BY submitted_at DESC 
LIMIT 5;

-- 6. Check if RPC function exists
SELECT routine_name, routine_type, data_type
FROM information_schema.routines 
WHERE routine_name = 'get_admin_feedback_for_officers';

-- 7. Test basic auth
SELECT auth.uid() as my_user_id, auth.role() as my_role;
