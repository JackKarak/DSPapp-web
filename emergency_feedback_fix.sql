-- Quick fix for president dashboard access to all feedback
-- Run this in your Supabase SQL Editor

-- Step 1: Check current feedback in the table
SELECT id, user_id, subject, message, status, submitted_at 
FROM public.admin_feedback 
ORDER BY submitted_at DESC;

-- Step 2: Check if the president user is approved
SELECT user_id, first_name, last_name, approved 
FROM public.users 
WHERE user_id = 'ad5cdb0b-c3ba-494a-8831-dc31388c9558';

-- Step 3: Make sure the president is approved (if not already)
UPDATE public.users 
SET approved = true 
WHERE user_id = 'ad5cdb0b-c3ba-494a-8831-dc31388c9558';

-- Step 4: Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Approved officers can view all feedback" ON public.admin_feedback;

-- Step 5: Create simple policies that work (FIXED TYPE CASTING)
CREATE POLICY "Users can view own feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id::uuid);

CREATE POLICY "Approved users can view all feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- Step 6: Test the query that the app is running
-- This should return all feedback if RLS is working correctly
SELECT id, submitted_at, subject, message, user_id, status
FROM public.admin_feedback 
WHERE status != 'resolved'
ORDER BY submitted_at DESC;
