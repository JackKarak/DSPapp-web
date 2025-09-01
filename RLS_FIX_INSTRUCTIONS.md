# PostgreSQL RLS Fix Instructions

## Quick Fix Option 1: Disable RLS Temporarily
Run this in Supabase Dashboard > SQL Editor:

```sql
ALTER TABLE admin_feedback DISABLE ROW LEVEL SECURITY;
```

Then test your president dashboard. If it works, RLS was indeed the issue.

## Option 2: Fix RLS with Proper Policies
Run this in Supabase Dashboard > SQL Editor:

```sql
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Officers can view all feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Users can insert feedback" ON admin_feedback;

-- Create new policies with proper UUID handling
CREATE POLICY "Users can insert feedback" ON admin_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can view own feedback" ON admin_feedback
  FOR SELECT USING (auth.uid() = user_id::uuid);

CREATE POLICY "Officers can view all feedback" ON admin_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.user_id::uuid = auth.uid() 
      AND users.approved = true
    )
  );

CREATE POLICY "Officers can update feedback" ON admin_feedback
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.user_id::uuid = auth.uid() 
      AND users.approved = true
    )
  );
```

## Test After Fix:
1. Go to Account tab, submit feedback
2. Go to President dashboard, check if feedback appears
3. Try resolving feedback to test update permissions

## Debugging Commands:
```sql
-- Check if your president user is approved
SELECT user_id, email, approved FROM users WHERE user_id = 'ad5cdb0b-c3ba-494a-8831-dc31388c9558';

-- Check all feedback records
SELECT id, user_id, subject, message, status, submitted_at FROM admin_feedback ORDER BY submitted_at DESC;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'admin_feedback';
```
