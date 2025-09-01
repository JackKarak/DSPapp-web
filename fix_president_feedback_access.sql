-- Fix RLS policies so officers can view all feedback
-- Run this in your Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;

-- Create new policy that allows officers to view all feedback
CREATE POLICY "Officers can view all feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (
        -- Allow users to see their own feedback
        auth.uid()::text = user_id
        OR
        -- Allow officers to see all feedback (check if user is approved in users table)
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- Also ensure officers can update feedback status (for resolving)
CREATE POLICY "Officers can update feedback status" ON public.admin_feedback
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_feedback';
