-- Add created_by_position column to track which officer position created the event
-- This enables position-based analytics that persist across officer transitions

-- Add the column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS created_by_position text;

-- Create index for faster position-based queries
CREATE INDEX IF NOT EXISTS idx_events_created_by_position 
ON events(created_by_position);

-- Backfill existing events with position data from users table
UPDATE events e
SET created_by_position = u.officer_position
FROM users u
WHERE e.created_by = u.user_id
  AND u.officer_position IS NOT NULL
  AND e.created_by_position IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN events.created_by_position IS 'The officer position (role) that created this event, allows tracking events by position across officer transitions';
