-- Create point_appeal table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.point_appeal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    appeal_reason TEXT NOT NULL,
    picture_url TEXT,  -- Optional evidence URL
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    admin_response TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, event_id, status) -- Prevent duplicate pending appeals
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_point_appeal_user_id ON public.point_appeal(user_id);
CREATE INDEX IF NOT EXISTS idx_point_appeal_event_id ON public.point_appeal(event_id);
CREATE INDEX IF NOT EXISTS idx_point_appeal_status ON public.point_appeal(status);
CREATE INDEX IF NOT EXISTS idx_point_appeal_created_at ON public.point_appeal(created_at DESC);

-- Enable RLS
ALTER TABLE public.point_appeal ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own appeals
CREATE POLICY "Users can view own appeals" ON public.point_appeal
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own appeals
CREATE POLICY "Users can create own appeals" ON public.point_appeal
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Officers can view all appeals
CREATE POLICY "Officers can view all appeals" ON public.point_appeal
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid()
            AND (role = 'admin' OR officer_position IS NOT NULL)
        )
    );

-- Policy: Officers can update appeals
CREATE POLICY "Officers can update appeals" ON public.point_appeal
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid()
            AND (role = 'admin' OR officer_position IS NOT NULL)
        )
    );

-- Add comment
COMMENT ON TABLE public.point_appeal IS 'Stores user appeals for event points with evidence and admin review';
