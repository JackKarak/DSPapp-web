-- Fix RLS policies for admin_feedback table
-- This addresses the RLS violation issue

-- Drop existing policies
DROP POLICY IF EXISTS "Users can submit their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;

-- Create more permissive policies that work better with the app
CREATE POLICY "Users can submit feedback" ON public.admin_feedback
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own feedback" ON public.admin_feedback
    FOR SELECT 
    USING (auth.uid()::text = user_id);

-- Alternative: If the above still doesn't work, we can temporarily disable RLS for inserts
-- and handle permissions in the application logic
-- ALTER TABLE public.admin_feedback DISABLE ROW LEVEL SECURITY;

-- Optional: Add a function to handle feedback submission that bypasses RLS
CREATE OR REPLACE FUNCTION public.submit_admin_feedback(
    subject TEXT,
    message TEXT,
    file_name TEXT DEFAULT NULL,
    file_size BIGINT DEFAULT NULL,
    file_type TEXT DEFAULT NULL,
    has_attachment BOOLEAN DEFAULT FALSE,
    attachment_info JSONB DEFAULT NULL
) RETURNS TABLE(id BIGINT, submitted_at TIMESTAMP WITH TIME ZONE) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to submit feedback';
    END IF;

    -- Insert the feedback record
    RETURN QUERY
    INSERT INTO public.admin_feedback (
        user_id, 
        subject, 
        message, 
        file_name, 
        file_size, 
        file_type, 
        has_attachment, 
        attachment_info,
        submitted_at
    ) VALUES (
        auth.uid()::text,
        subject,
        message,
        file_name,
        file_size,
        file_type,
        has_attachment,
        attachment_info,
        NOW()
    )
    RETURNING admin_feedback.id, admin_feedback.submitted_at;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_admin_feedback TO authenticated;
