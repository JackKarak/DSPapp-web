-- Comprehensive fix for admin_feedback table and RLS policies
-- Run this in your Supabase SQL Editor

-- First, check the current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'admin_feedback' 
ORDER BY ordinal_position;

-- Add the missing responded_at column if it doesn't exist
ALTER TABLE public.admin_feedback 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can update feedback status" ON public.admin_feedback;

-- Create comprehensive policies
-- 1. Users can insert their own feedback
CREATE POLICY "Users can submit feedback" ON public.admin_feedback
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

-- 2. Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (auth.uid()::text = user_id);

-- 3. Approved officers can view ALL feedback (this is the key fix!)
CREATE POLICY "Approved officers can view all feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- 4. Approved officers can update feedback (mark as resolved)
CREATE POLICY "Approved officers can update feedback" ON public.admin_feedback
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- Verify the user is approved (replace with actual user ID)
-- Run this to check if the president user is approved:
SELECT user_id, first_name, last_name, approved 
FROM public.users 
WHERE user_id = 'ad5cdb0b-c3ba-494a-8831-dc31388c9558';

-- If the user is not approved, approve them:
UPDATE public.users 
SET approved = true 
WHERE user_id = 'ad5cdb0b-c3ba-494a-8831-dc31388c9558';

-- Test the policies by checking what feedback is visible
SELECT COUNT(*) as total_feedback FROM public.admin_feedback;
SELECT user_id, subject, status FROM public.admin_feedback ORDER BY submitted_at DESC;
