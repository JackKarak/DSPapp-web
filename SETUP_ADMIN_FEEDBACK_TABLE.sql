-- Complete setup for admin_feedback table and RLS policies
-- Run this in your Supabase SQL Editor to fix the messages not loading issue

-- 1. Create the admin_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_feedback (
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
    status TEXT DEFAULT 'pending',
    admin_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.admin_feedback ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies
DROP POLICY IF EXISTS "Users can submit their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can update feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_select_for_own_feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_select_for_officers" ON public.admin_feedback;
DROP POLICY IF EXISTS "enable_update_for_officers" ON public.admin_feedback;

-- 4. Create working RLS policies

-- Allow any authenticated user to submit feedback
CREATE POLICY "enable_insert_for_authenticated_users" ON public.admin_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own feedback
CREATE POLICY "enable_select_for_own_feedback" ON public.admin_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Allow officers and president to view ALL feedback
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

-- Allow officers and president to update feedback (mark as resolved)
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

-- 5. Grant necessary permissions
GRANT SELECT, INSERT ON public.admin_feedback TO authenticated;
GRANT UPDATE ON public.admin_feedback TO authenticated;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_feedback_user_id ON public.admin_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_status ON public.admin_feedback(status);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_submitted_at ON public.admin_feedback(submitted_at);

-- 7. Test the setup (optional - check if you can see any data)
-- SELECT COUNT(*) FROM public.admin_feedback;

-- 8. Insert sample data for testing (optional)
-- INSERT INTO public.admin_feedback (user_id, subject, message) 
-- VALUES ('test-user-id', 'Test Subject', 'Test message for debugging');
