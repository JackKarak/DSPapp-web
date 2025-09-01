-- STEP 1: Run this first to check data types and current data
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_feedback' 
AND column_name = 'user_id';

-- STEP 2: Check what feedback exists
SELECT id, user_id, subject, message, status, submitted_at 
FROM admin_feedback 
ORDER BY submitted_at DESC;

-- STEP 3: Temporarily disable RLS to test
ALTER TABLE admin_feedback DISABLE ROW LEVEL SECURITY;

-- STEP 4: Test if data is visible without RLS
SELECT id, user_id, subject, message, status 
FROM admin_feedback 
ORDER BY submitted_at DESC;

-- STEP 5: Re-enable RLS
ALTER TABLE admin_feedback ENABLE ROW LEVEL SECURITY;

-- STEP 6: Drop all existing policies (run one at a time if needed)
DROP POLICY IF EXISTS "Users can submit feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Approved users can view all feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON admin_feedback;

-- STEP 7: Create new policies with UUID handling
-- Allow users to insert their own feedback
CREATE POLICY "feedback_insert" ON admin_feedback
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id::uuid);

-- Allow users to see their own feedback
CREATE POLICY "feedback_view_own" ON admin_feedback
    FOR SELECT 
    USING (auth.uid() = user_id::uuid);

-- Allow approved officers to see ALL feedback
CREATE POLICY "feedback_view_all" ON admin_feedback
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- Allow approved officers to update feedback status
CREATE POLICY "feedback_update" ON admin_feedback
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- STEP 8: Make sure president user exists and is approved
INSERT INTO users (user_id, first_name, last_name, approved) 
VALUES ('ad5cdb0b-c3ba-494a-8831-dc31388c9558', 'President', 'User', true)
ON CONFLICT (user_id) 
DO UPDATE SET approved = true;

-- STEP 9: Final test - this should show all feedback
SELECT id, user_id, subject, message, status, submitted_at 
FROM admin_feedback 
WHERE status != 'resolved'
ORDER BY submitted_at DESC;
