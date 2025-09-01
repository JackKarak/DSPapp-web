-- Fix the UUID/TEXT type mismatch in admin_feedback RLS policies
-- The error "operator does not exist: text = uuid" means we need proper type casting
-- Run this in your Supabase SQL Editor

-- 1. Drop existing policies that have type mismatch issues
DROP POLICY IF EXISTS "enable_select_for_own_feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_select_for_officers" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_update_for_officers" ON public.admin_feedback;

-- 2. Create corrected policies with proper type casting

-- Allow users to view their own feedback (fix UUID/TEXT comparison)
CREATE POLICY "enable_select_for_own_feedback" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Allow officers and president to view ALL feedback (fix UUID/TEXT comparison)
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
                OR president = true
            )
        )
    );

-- Allow officers and president to update feedback (fix UUID/TEXT comparison)
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
                OR president = true
            )
        )
    );

-- 3. Alternative: If the above still doesn't work, use a more permissive approach
-- Uncomment these if the above policies still cause issues:

/*
-- More permissive policies (uncomment if needed)
DROP POLICY IF EXISTS "enable_select_for_own_feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_select_for_officers" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_update_for_officers" ON public.admin_feedback;

-- Allow users to see their own feedback
CREATE POLICY "users_own_feedback" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid()::text);

-- Allow ALL authenticated users to view feedback (temporary for debugging)
CREATE POLICY "authenticated_can_view_feedback" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow ALL authenticated users to update feedback (temporary for debugging)
CREATE POLICY "authenticated_can_update_feedback" ON public.admin_feedback
    FOR UPDATE
    TO authenticated
    USING (true);
*/

-- 4. Test the policies work
-- This should return some results if you have feedback data:
SELECT COUNT(*) as feedback_count FROM public.admin_feedback;

-- 5. Check your user record (make sure you have officer/president permissions)
SELECT user_id, first_name, last_name, officer_position, president, approved 
FROM public.users 
WHERE user_id = auth.uid()::text;
