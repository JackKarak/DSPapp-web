-- Fix RLS policies for admin_feedback table to allow user submissions
-- This replaces the restrictive policy with one that works properly

-- First, check if the table exists and has RLS enabled
ALTER TABLE public.admin_feedback ENABLE ROW LEVEL SECURITY;

-- Drop the problematic existing policies
DROP POLICY IF EXISTS "Users can submit their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can update feedback" ON public.admin_feedback;

-- Create a simple, working insert policy
-- Allow any authenticated user to insert feedback
CREATE POLICY "enable_insert_for_authenticated_users" ON public.admin_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own feedback
-- Use proper UUID comparison
CREATE POLICY "enable_select_for_own_feedback" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Allow officers to view all feedback
CREATE POLICY "enable_select_for_officers" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (
                officer_position IS NOT NULL 
                OR officer_position = 'president'
            )
        )
    );

-- Allow officers to update feedback (for responses)
CREATE POLICY "enable_update_for_officers" ON public.admin_feedback
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (
                officer_position IS NOT NULL 
                OR officer_position = 'president'
            )
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.admin_feedback TO authenticated;
GRANT UPDATE ON public.admin_feedback TO authenticated;
