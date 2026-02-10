-- Add unique constraint to event_attendance table
-- Ensures that each user can only have one attendance record per event
-- This prevents duplicate attendance entries

-- Step 1: Remove any duplicate attendance records (keep the earliest)
DELETE FROM event_attendance
WHERE id NOT IN (
  SELECT DISTINCT ON (event_id, user_id) id
  FROM event_attendance
  ORDER BY event_id, user_id, attended_at NULLS LAST, id
);

-- Step 2: Drop existing constraint if it exists (idempotent)
ALTER TABLE event_attendance
DROP CONSTRAINT IF EXISTS unique_event_attendance_user;

-- Step 3: Add unique constraint on (event_id, user_id)
ALTER TABLE event_attendance
ADD CONSTRAINT unique_event_attendance_user UNIQUE (event_id, user_id);

-- Step 4: Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_event_attendance_user ON event_attendance IS 
'Ensures each user can only have one attendance record per event. This prevents duplicate check-ins.';
