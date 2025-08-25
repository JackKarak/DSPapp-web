-- Create a stored procedure to handle admin feedback submission
-- This bypasses RLS issues by running with security definer privileges
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.submit_admin_feedback(
    subject TEXT,
    message TEXT,
    file_name TEXT DEFAULT NULL,
    file_size BIGINT DEFAULT NULL,
    file_type TEXT DEFAULT NULL,
    has_attachment BOOLEAN DEFAULT FALSE,
    attachment_info JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner
AS $$
DECLARE
    current_user_id TEXT;
    feedback_id BIGINT;
    result JSON;
BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid()::text;
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Insert the feedback record
    INSERT INTO public.admin_feedback (
        user_id,
        subject,
        message,
        submitted_at,
        file_name,
        file_size,
        file_type,
        has_attachment,
        attachment_info
    ) VALUES (
        current_user_id,
        subject,
        message,
        NOW(),
        file_name,
        file_size,
        file_type,
        COALESCE(has_attachment, false),
        attachment_info
    )
    RETURNING id INTO feedback_id;
    
    -- Return success result
    result := json_build_object(
        'success', true,
        'feedback_id', feedback_id,
        'message', 'Feedback submitted successfully'
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error result
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_admin_feedback TO authenticated;

-- Test the function (optional - remove this line in production)
-- SELECT public.submit_admin_feedback('Test Subject', 'Test message from stored procedure');
