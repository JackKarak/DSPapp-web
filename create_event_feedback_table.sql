-- Create event_feedback table with correct columns
CREATE TABLE IF NOT EXISTS public.event_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    would_attend_again BOOLEAN,
    well_organized BOOLEAN,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_feedback_user_id ON public.event_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_event_id ON public.event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_created_at ON public.event_feedback(created_at);

-- Enable Row Level Security
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all event feedback" ON public.event_feedback
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own event feedback" ON public.event_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event feedback" ON public.event_feedback
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event feedback" ON public.event_feedback
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_event_feedback_updated_at
    BEFORE UPDATE ON public.event_feedback
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
