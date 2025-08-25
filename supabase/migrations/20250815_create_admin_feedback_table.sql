-- Create admin_feedback table if it doesn't exist
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
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    admin_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_feedback_user_id ON public.admin_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_status ON public.admin_feedback(status);
CREATE INDEX IF NOT EXISTS idx_admin_feedback_submitted_at ON public.admin_feedback(submitted_at DESC);

-- Enable RLS
ALTER TABLE public.admin_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can submit their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;

-- Create RLS policies
CREATE POLICY "Users can submit their own feedback" ON public.admin_feedback
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own feedback" ON public.admin_feedback
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Officers can view all feedback" ON public.admin_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- Allow officers to update feedback status and add responses
CREATE POLICY "Officers can update feedback" ON public.admin_feedback
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );
