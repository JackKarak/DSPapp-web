-- Fix RLS policies to allow leaderboard functionality
-- This allows users to see attendance data for leaderboard calculations
-- while maintaining security for other operations

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('event_attendance', 'event_registration', 'users', 'events');

-- For event_attendance table - allow SELECT for leaderboard
DROP POLICY IF EXISTS "Users can view all attendance for leaderboard" ON public.event_attendance;
CREATE POLICY "Users can view all attendance for leaderboard" ON public.event_attendance
    FOR SELECT 
    TO authenticated
    USING (true);

-- For event_registration table - allow SELECT for leaderboard  
DROP POLICY IF EXISTS "Users can view all registrations for leaderboard" ON public.event_registration;
CREATE POLICY "Users can view all registrations for leaderboard" ON public.event_registration
    FOR SELECT 
    TO authenticated
    USING (true);

-- For users table - allow SELECT of basic profile info for leaderboard
DROP POLICY IF EXISTS "Users can view approved profiles for leaderboard" ON public.users;
CREATE POLICY "Users can view approved profiles for leaderboard" ON public.users
    FOR SELECT 
    TO authenticated
    USING (approved = true);

-- For events table - allow SELECT for leaderboard calculations
DROP POLICY IF EXISTS "Users can view events for leaderboard" ON public.events;
CREATE POLICY "Users can view events for leaderboard" ON public.events
    FOR SELECT 
    TO authenticated
    USING (true);

-- Show the policies that were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('event_attendance', 'event_registration', 'users', 'events')
ORDER BY tablename, policyname;
