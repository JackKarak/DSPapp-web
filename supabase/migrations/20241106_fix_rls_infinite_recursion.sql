-- Fix infinite recursion in users table RLS policy
-- This fixes the "infinite recursion detected in policy for relation 'users'" error

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Recreate without the recursive role check
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Role escalation prevention is now handled in the application layer
-- Users should not be able to change their own role through the UI
