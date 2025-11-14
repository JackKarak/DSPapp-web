-- Add approved_at timestamp to events table
-- This tracks when an event was approved by an admin

-- Add approved_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for performance on approved events
CREATE INDEX IF NOT EXISTS idx_events_approved_at ON public.events(approved_at) 
  WHERE approved_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.events.approved_at IS 
'Timestamp when the event was approved. For Points Only events (is_non_event=true), this also sets the start_time.';
