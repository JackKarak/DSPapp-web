-- EMERGENCY TEST: Temporarily disable RLS to confirm it's the issue
-- Run this in Supabase SQL Editor to quickly test

-- Disable RLS on tables needed for leaderboard
ALTER TABLE event_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Test your app now - leaderboard should work

-- IMPORTANT: After testing, re-enable RLS and apply proper policies:
-- ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE event_registration ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- Then run the fix_leaderboard_rls.sql file
