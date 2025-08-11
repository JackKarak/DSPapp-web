-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_bank ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Approved users can view other approved users" ON users;

DROP POLICY IF EXISTS "Everyone can view approved events" ON events;
DROP POLICY IF EXISTS "Officers can manage events" ON events;

DROP POLICY IF EXISTS "Users can view their own attendance" ON event_attendance;
DROP POLICY IF EXISTS "Users can record their own attendance" ON event_attendance;
DROP POLICY IF EXISTS "Officers can view all attendance" ON event_attendance;

DROP POLICY IF EXISTS "Users can submit their own feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON admin_feedback;

DROP POLICY IF EXISTS "Users can submit to test bank" ON test_bank;
DROP POLICY IF EXISTS "Officers can view test bank submissions" ON test_bank;

-- USERS TABLE POLICIES
-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Allow approved users to view other approved users (for leaderboards, etc.)
CREATE POLICY "Approved users can view other approved users" ON users
    FOR SELECT USING (
        approved = true AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text AND approved = true
        )
    );

-- EVENTS TABLE POLICIES
-- Allow everyone to view approved events
CREATE POLICY "Everyone can view approved events" ON events
    FOR SELECT USING (status = 'approved');

-- Allow officers to manage events (create, update, delete)
CREATE POLICY "Officers can manage events" ON events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- EVENT_ATTENDANCE TABLE POLICIES
-- Allow users to view their own attendance records
CREATE POLICY "Users can view their own attendance" ON event_attendance
    FOR SELECT USING (auth.uid()::text = user_id);

-- CRITICAL: Allow users to insert their own attendance records
CREATE POLICY "Users can record their own attendance" ON event_attendance
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Allow officers to view all attendance records
CREATE POLICY "Officers can view all attendance" ON event_attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- Allow officers to insert attendance for others (if needed for manual entry)
CREATE POLICY "Officers can record attendance for others" ON event_attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- ADMIN_FEEDBACK TABLE POLICIES
-- Allow users to submit their own feedback
CREATE POLICY "Users can submit their own feedback" ON admin_feedback
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback" ON admin_feedback
    FOR SELECT USING (auth.uid()::text = user_id);

-- Allow officers to view all feedback
CREATE POLICY "Officers can view all feedback" ON admin_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- TEST_BANK TABLE POLICIES
-- Allow users to submit to test bank
CREATE POLICY "Users can submit to test bank" ON test_bank
    FOR INSERT WITH CHECK (auth.uid()::text = submitted_by);

-- Allow users to view their own submissions
CREATE POLICY "Users can view their own test bank submissions" ON test_bank
    FOR SELECT USING (auth.uid()::text = submitted_by);

-- Allow officers to view all test bank submissions
CREATE POLICY "Officers can view test bank submissions" ON test_bank
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- Allow officers to update test bank submission status
CREATE POLICY "Officers can update test bank status" ON test_bank
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );
