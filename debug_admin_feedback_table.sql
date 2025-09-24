-- Alternative approach: Create admin_feedback table with proper RLS policies
-- Run this in your Supabase SQL Editor

-- First, check if table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_feedback') THEN
        -- Create the table
        CREATE TABLE public.admin_feedback (
            id BIGSERIAL PRIMARY KEY,
            user_id TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            file_name TEXT,
            file_size BIGINT,
            file_type TEXT,
            has_attachment BOOLEAN DEFAULT FALSE,
            attachment_info JSONB,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
            admin_response TEXT,
            responded_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX idx_admin_feedback_user_id ON public.admin_feedback(user_id);
        CREATE INDEX idx_admin_feedback_status ON public.admin_feedback(status);
        CREATE INDEX idx_admin_feedback_submitted_at ON public.admin_feedback(submitted_at DESC);
    END IF;
END
$$;

-- Enable RLS
ALTER TABLE public.admin_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can submit their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can update feedback" ON public.admin_feedback;

-- Create RLS policies with more permissive approach for debugging
-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can submit their own feedback" ON public.admin_feedback
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Allow officers to view all feedback
CREATE POLICY "Officers can view all feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (officer_position IS NOT NULL OR president = true)
        )
    );

-- Allow officers to update feedback status and add responses
CREATE POLICY "Officers can update feedback" ON public.admin_feedback
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (officer_position IS NOT NULL OR president = true)
        )
    );

-- Test the setup
-- This should show you if the policies are working correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'admin_feedback';
