-- Add is_non_event column to events table
-- This distinguishes between regular events (can be registered for) and non-events (points only)

ALTER TABLE public.events 
ADD COLUMN is_non_event BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for performance when filtering events
CREATE INDEX IF NOT EXISTS idx_events_is_non_event ON public.events(is_non_event);
