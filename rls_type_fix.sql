-- Emergency fix for RLS type casting issues
-- Run this in your Supabase SQL Editor

-- First, check the actual data types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_feedback' 
AND column_name IN ('user_id', 'id');

-- Check what's in the table
SELECT COUNT(*) as total_feedback FROM public.admin_feedback;
SELECT user_id, subject, message FROM public.admin_feedback LIMIT 3;

-- Temporarily disable RLS to test if that's the issue
ALTER TABLE public.admin_feedback DISABLE ROW LEVEL SECURITY;

-- Test query without RLS
SELECT id, submitted_at, subject, message, user_id, status
FROM public.admin_feedback 
WHERE status != 'resolved'
ORDER BY submitted_at DESC;

-- If the above works, then it's definitely an RLS issue
-- Re-enable RLS and create working policies
ALTER TABLE public.admin_feedback ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can submit feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Approved users can view all feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;

-- Create new policies with proper type handling
-- Policy 1: Users can insert their own feedback
CREATE POLICY "feedback_insert_policy" ON public.admin_feedback
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        CASE 
            WHEN pg_typeof(user_id) = 'text'::regtype THEN auth.uid()::text = user_id
            WHEN pg_typeof(user_id) = 'uuid'::regtype THEN auth.uid() = user_id
            ELSE false
        END
    );

-- Policy 2: Users can view their own feedback  
CREATE POLICY "feedback_select_own_policy" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (
        CASE 
            WHEN pg_typeof(user_id) = 'text'::regtype THEN auth.uid()::text = user_id
            WHEN pg_typeof(user_id) = 'uuid'::regtype THEN auth.uid() = user_id
            ELSE false
        END
    );

-- Policy 3: Approved users can view ALL feedback (for officers/presidents)
CREATE POLICY "feedback_select_all_policy" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- Make sure the president is approved
INSERT INTO public.users (user_id, approved, first_name, last_name) 
VALUES ('ad5cdb0b-c3ba-494a-8831-dc31388c9558', true, 'President', 'User')
ON CONFLICT (user_id) 
DO UPDATE SET approved = true;

-- Final test
SELECT 'Testing final query...' as test;
SELECT id, submitted_at, subject, message, user_id, status
FROM public.admin_feedback 
WHERE status != 'resolved'
ORDER BY submitted_at DESC;
