-- Test script to verify event_attendance policies work
-- This should be run after the migration

-- Test: Create a sample event (as an officer would)
INSERT INTO events (
    id,
    title,
    description,
    start_time,
    end_time,
    location,
    code,
    point_value,
    point_type,
    status,
    created_by,
    created_at
) VALUES (
    gen_random_uuid(),
    'Test Event for Attendance',
    'Testing attendance functionality',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '2 hours',
    'Test Location',
    'TEST123',
    5,
    'general',
    'approved',
    (SELECT user_id FROM users WHERE approved = true LIMIT 1),
    NOW()
) ON CONFLICT DO NOTHING;

-- Instructions:
-- 1. Run this migration with: npx supabase db push
-- 2. Test attendance by using code 'TEST123' in the app
-- 3. Brothers should be able to submit attendance successfully
-- 4. If it still fails, check the auth.users table and users table alignment
