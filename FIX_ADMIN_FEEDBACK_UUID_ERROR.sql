-- Fix the UUID vs TEXT type mismatch error in admin_feedback table
-- Run this in your Supabase SQL Editor

-- 1. First, let's check the current structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'admin_feedback' AND table_schema = 'public';

-- 2. Drop all existing policies that have the type mismatch
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_select_for_own_feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_select_for_officers" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_update_for_officers" ON public.admin_feedback;

-- 3. Method A: Fix by changing user_id column to UUID type (recommended)
-- This aligns the table with Supabase auth which uses UUID

-- First backup any existing data (optional)
-- CREATE TABLE admin_feedback_backup AS SELECT * FROM public.admin_feedback;

-- Change the column type to UUID
ALTER TABLE public.admin_feedback 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 4. Create new policies with proper UUID handling
CREATE POLICY "enable_insert_for_authenticated_users" ON public.admin_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "enable_select_for_own_feedback" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "enable_select_for_officers" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id::uuid = auth.uid()
            AND approved = true 
            AND (
                officer_position IS NOT NULL 
                OR officer_position = 'president'
                OR president = true
            )
        )
    );

CREATE POLICY "enable_update_for_officers" ON public.admin_feedback
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id::uuid = auth.uid()
            AND approved = true 
            AND (
                officer_position IS NOT NULL 
                OR officer_position = 'president'
                OR president = true
            )
        )
    );

-- 5. Grant permissions
GRANT SELECT, INSERT ON public.admin_feedback TO authenticated;
GRANT UPDATE ON public.admin_feedback TO authenticated;

-- 6. Test the fix
-- SELECT COUNT(*) FROM public.admin_feedback;

-- 7. Optional: Add some test data to verify it works
-- INSERT INTO public.admin_feedback (user_id, subject, message) 
-- VALUES (auth.uid(), 'Test Subject', 'Test message after UUID fix');
