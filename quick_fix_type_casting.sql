-- Quick Fix for Type Casting Error
-- Run this in your Supabase SQL Editor

-- Drop and recreate the critical attendance policy with proper type casting
DROP POLICY IF EXISTS "Users can record their own attendance" ON event_attendance;

CREATE POLICY "Users can record their own attendance" ON event_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

-- Also fix the view policy for attendance
DROP POLICY IF EXISTS "Users can view their own attendance" ON event_attendance;

CREATE POLICY "Users can view their own attendance" ON event_attendance
    FOR SELECT USING (auth.uid() = user_id::uuid);

-- Fix the feedback policy as well
DROP POLICY IF EXISTS "Users can submit their own feedback" ON admin_feedback;

CREATE POLICY "Users can submit their own feedback" ON admin_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

-- Verify the policies are working
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('event_attendance', 'admin_feedback')
ORDER BY tablename, policyname;
