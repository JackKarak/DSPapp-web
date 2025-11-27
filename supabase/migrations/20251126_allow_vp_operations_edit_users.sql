-- Allow VP Operations to edit user profiles
-- Created: 2025-11-26

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "VP Operations can update user profiles" ON users;

-- Create policy allowing VP Operations to update role, officer_position, and approved fields
CREATE POLICY "VP Operations can update user profiles"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role = 'officer'
    AND users.officer_position = 'vp_operations'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role = 'officer'
    AND users.officer_position = 'vp_operations'
  )
);

-- Add comment
COMMENT ON POLICY "VP Operations can update user profiles" ON users IS 
  'Allows VP Operations officers to update member role, officer_position, and approved status';
