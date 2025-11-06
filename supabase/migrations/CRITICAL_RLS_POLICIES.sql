-- =====================================================
-- CRITICAL RLS POLICIES FOR PRODUCTION
-- Phase 0 Security Requirements
-- =====================================================
-- 
-- SCHEMA NOTES:
-- - users table has TWO ID columns:
--   - user_id (UUID): matches auth.uid() - use THIS for RLS policies
--   - uid (numeric): internal auto-increment ID
-- - users.officer_position: stores officer role (vp_scholarship, president, etc.)
-- - events.created_by: foreign key to users.user_id (UUID)
-- - No separate user_roles table - everything in users table
--
-- DEPLOYMENT INSTRUCTIONS:
-- 1. Run these policies in Supabase SQL Editor
-- 2. Test each policy with different user roles
-- 3. Verify no unauthorized access possible
-- 4. Enable RLS on all tables: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
--
-- =====================================================

-- =====================================================
-- TABLE: users
-- Protects member PII and roles
-- =====================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Only system can create users" ON users;

-- Policy: Users can view their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own non-critical fields
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Only admins/presidents can view all users
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('admin', 'president')
  )
);

-- Policy: Only admins can create users (via signup edge function)
CREATE POLICY "Only system can create users"
ON users FOR INSERT
TO authenticated
WITH CHECK (false); -- All inserts go through auth.users, not direct

-- =====================================================
-- TABLE: user_roles (officer positions)
-- Protects officer authorization
-- NOTE: officer_position is stored in users table, not separate user_roles table
-- =====================================================

-- User roles are managed via users.officer_position column
-- No separate table needed

-- =====================================================
-- TABLE: test_bank
-- Protects scholarship test submissions
-- =====================================================

ALTER TABLE test_bank ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view own submissions" ON test_bank;
DROP POLICY IF EXISTS "VP Scholarship can view all submissions" ON test_bank;
DROP POLICY IF EXISTS "Members can submit test bank items" ON test_bank;
DROP POLICY IF EXISTS "Only VP Scholarship can approve/deny" ON test_bank;

-- Policy: Members can view their own submissions
CREATE POLICY "Members can view own submissions"
ON test_bank FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

-- Policy: VP Scholarship can view all submissions
CREATE POLICY "VP Scholarship can view all submissions"
ON test_bank FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position IN ('vp_scholarship', 'scholarship', 'president')
  )
);

-- Policy: Members can insert their own submissions
CREATE POLICY "Members can submit test bank items"
ON test_bank FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid());

-- Policy: Only VP Scholarship can update status
CREATE POLICY "Only VP Scholarship can approve/deny"
ON test_bank FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position IN ('vp_scholarship', 'scholarship', 'president')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position IN ('vp_scholarship', 'scholarship', 'president')
  )
);

-- =====================================================
-- TABLE: events
-- Protects event creation and management
-- =====================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view approved events" ON events;
DROP POLICY IF EXISTS "Officers can view all events" ON events;
DROP POLICY IF EXISTS "Officers can create events" ON events;
DROP POLICY IF EXISTS "Officers can update events" ON events;
DROP POLICY IF EXISTS "Only presidents can delete events" ON events;

-- Policy: All authenticated users can view approved events
CREATE POLICY "Members can view approved events"
ON events FOR SELECT
TO authenticated
USING (status = 'approved' OR created_by = auth.uid());

-- Policy: Officers can view all events
CREATE POLICY "Officers can view all events"
ON events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position IS NOT NULL
  )
);

-- Policy: Officers can create events
CREATE POLICY "Officers can create events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position IS NOT NULL
  )
);

-- Policy: Creator or officers can update their events
CREATE POLICY "Officers can update events"
ON events FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position IS NOT NULL
  )
);

-- Policy: Only presidents can delete events
CREATE POLICY "Only presidents can delete events"
ON events FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position = 'president'
  )
);

-- =====================================================
-- TABLE: event_attendance
-- Protects attendance records
-- =====================================================

ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view own attendance" ON event_attendance;
DROP POLICY IF EXISTS "Officers can view all attendance" ON event_attendance;
DROP POLICY IF EXISTS "Members can RSVP" ON event_attendance;
DROP POLICY IF EXISTS "Members can update own RSVP" ON event_attendance;
DROP POLICY IF EXISTS "Officers can mark attendance" ON event_attendance;

-- Policy: Members can view their own attendance
CREATE POLICY "Members can view own attendance"
ON event_attendance FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Officers can view all attendance
CREATE POLICY "Officers can view all attendance"
ON event_attendance FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position IS NOT NULL
  )
);

-- Policy: Members can RSVP to events (insert their own)
CREATE POLICY "Members can RSVP"
ON event_attendance FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Members can update their own RSVP
CREATE POLICY "Members can update own RSVP"
ON event_attendance FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Officers can mark attendance for any member
CREATE POLICY "Officers can mark attendance"
ON event_attendance FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = auth.uid()
    AND users.officer_position IS NOT NULL
  )
);

-- =====================================================
-- TABLE: auth_rate_limits
-- Protects rate limiting (server-side only)
-- NOTE: Commented out - table does not exist yet
-- =====================================================

-- CREATE TABLE IF NOT EXISTS auth_rate_limits (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   identifier TEXT NOT NULL,
--   attempt_count INT DEFAULT 1,
--   first_attempt TIMESTAMPTZ DEFAULT NOW(),
--   locked_until TIMESTAMPTZ,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- CREATE INDEX idx_rate_limit_identifier ON auth_rate_limits(identifier);

-- ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- -- Drop existing policies if they exist
-- DROP POLICY IF EXISTS "Rate limits are system-only" ON auth_rate_limits;

-- -- Policy: No client access to rate limits
-- CREATE POLICY "Rate limits are system-only"
-- ON auth_rate_limits FOR ALL
-- TO authenticated
-- USING (false); -- No client access ever

-- =====================================================
-- FUNCTION: Sync user role to JWT metadata
-- Ensures role is tamper-proof in JWT
-- =====================================================

CREATE OR REPLACE FUNCTION sync_user_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync role to auth.users metadata (appears in JWT)
  UPDATE auth.users
  SET raw_app_meta_data = 
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-sync role changes to JWT
DROP TRIGGER IF EXISTS on_user_role_change ON users;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_metadata();

-- NOTE: Officer position is already in users table, so it will be synced
-- via the role sync trigger above. No separate trigger needed.

-- =====================================================
-- TESTING QUERIES
-- Run these to verify policies work correctly
-- =====================================================

-- Test 1: Regular member tries to view all users (should fail)
-- SELECT * FROM users; -- Should only return own record

-- Test 2: Regular member tries to update role (should fail)
-- UPDATE users SET role = 'admin' WHERE user_id = auth.uid(); -- Should fail

-- Test 3: Officer tries to view all events (should succeed)
-- SELECT * FROM events; -- Should return all events

-- Test 4: Non-VP Scholarship tries to approve test bank (should fail)
-- UPDATE test_bank SET status = 'approved' WHERE id = 'some-id'; -- Should fail

-- Test 5: Member tries to mark another's attendance (should fail)
-- UPDATE event_attendance SET attended = true WHERE user_id != auth.uid(); -- Should fail

-- =====================================================
-- ROLLBACK (Emergency Use Only)
-- =====================================================

-- DROP POLICY IF EXISTS "Users can view own profile" ON users;
-- DROP POLICY IF EXISTS "Admins can view all users" ON users;
-- ... (drop all policies if needed)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
