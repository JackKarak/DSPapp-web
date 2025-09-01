-- Fix UUID/TEXT type mismatch in admin_feedback RLS policies
-- This addresses the "operator does not exist: text = uuid" error

-- Drop existing problematic policies
DROP POLICY IF EXISTS "enable_select_for_own_feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_select_for_officers" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_update_for_officers" ON public.admin_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can update feedback" ON public.admin_feedback;

-- Create corrected policies with proper type casting

-- Policy 1: Users can view their own feedback
CREATE POLICY "users_view_own_feedback" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Policy 2: Officers and presidents can view all feedback
CREATE POLICY "officers_view_all_feedback" ON public.admin_feedback
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
                OR president = true
            )
        )
    );

-- Policy 3: Officers and presidents can update feedback status
CREATE POLICY "officers_update_feedback" ON public.admin_feedback
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
                OR president = true
            )
        )
    );

-- Grant necessary permissions
GRANT SELECT ON public.admin_feedback TO authenticated;
GRANT UPDATE ON public.admin_feedback TO authenticated;
