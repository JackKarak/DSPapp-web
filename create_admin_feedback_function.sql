-- Create a function to get admin feedback that bypasses RLS issues
-- This function will be called by the app to get feedback data

CREATE OR REPLACE FUNCTION public.get_admin_feedback_for_officers()
RETURNS TABLE (
    id BIGINT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    subject TEXT,
    message TEXT,
    user_id TEXT,
    status TEXT,
    has_attachment BOOLEAN,
    file_name TEXT,
    first_name TEXT,
    last_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is authenticated and is an officer/president
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Check if user has officer permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE user_id = auth.uid()::text 
        AND approved = true 
        AND (
            officer_position IS NOT NULL 
            OR officer_position = 'president'
            OR president = true
        )
    ) THEN
        RAISE EXCEPTION 'User does not have officer permissions';
    END IF;
    
    -- Return feedback with user information
    RETURN QUERY
    SELECT 
        af.id,
        af.submitted_at,
        af.subject,
        af.message,
        af.user_id,
        af.status,
        af.has_attachment,
        af.file_name,
        u.first_name,
        u.last_name
    FROM public.admin_feedback af
    LEFT JOIN public.users u ON u.user_id = af.user_id
    ORDER BY af.submitted_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_feedback_for_officers TO authenticated;
