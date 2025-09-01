-- Simple fix for UUID/TEXT type mismatch
-- Copy and paste these commands one by one into Supabase SQL Editor

-- Step 1: Check the data types (run this first)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_feedback' 
AND column_name = 'user_id';

-- Step 2: If user_id is TEXT, try this policy:
DROP POLICY IF EXISTS "Users can view own feedback" ON admin_feedback;
CREATE POLICY "Users can view own feedback" ON admin_feedback
    FOR SELECT 
    USING (auth.uid()::text = user_id);

-- Step 3: If user_id is UUID, try this policy instead:
DROP POLICY IF EXISTS "Users can view own feedback" ON admin_feedback;
CREATE POLICY "Users can view own feedback" ON admin_feedback
    FOR SELECT 
    USING (auth.uid() = user_id::uuid);

-- Step 4: Officer policy (adjust based on user_id type from Step 1)
DROP POLICY IF EXISTS "Officers can view all feedback" ON admin_feedback;

-- If user_id is TEXT in admin_feedback table:
CREATE POLICY "Officers can view all feedback" ON admin_feedback
    FOR SELECT 
    USING (
        auth.uid()::text = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true
        )
    );

-- Step 5: Make sure president is approved
UPDATE users 
SET approved = true 
WHERE user_id = 'ad5cdb0b-c3ba-494a-8831-dc31388c9558';

-- Step 6: Test the query
SELECT id, user_id, subject, message, status 
FROM admin_feedback 
ORDER BY submitted_at DESC;
