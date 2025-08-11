-- Create event_feedback table
CREATE TABLE IF NOT EXISTS public.event_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    event_id UUID REFERENCES events(id) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    would_attend_again BOOLEAN,
    well_organized BOOLEAN,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert their own event feedback" ON public.event_feedback 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own event feedback" ON public.event_feedback 
    FOR SELECT USING (auth.uid() = user_id);

-- Allow officers and admins to view all feedback (assuming officer_position is not null for officers)
CREATE POLICY "Officers can view all event feedback" ON public.event_feedback 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid() 
            AND officer_position IS NOT NULL
        )
    );

-- Add unique constraint to prevent duplicate feedback from same user for same event
ALTER TABLE public.event_feedback 
ADD CONSTRAINT unique_user_event_feedback 
UNIQUE (user_id, event_id);

-- Add indexes for better performance
CREATE INDEX idx_event_feedback_user_id ON public.event_feedback(user_id);
CREATE INDEX idx_event_feedback_event_id ON public.event_feedback(event_id);
CREATE INDEX idx_event_feedback_created_at ON public.event_feedback(created_at);
