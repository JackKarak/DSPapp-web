-- ============================================================================
-- Add Alumni and Abroad Roles
-- ============================================================================
-- Migration: 20260210_add_alumni_abroad_roles
-- Description: Adds "alumni" and "abroad" roles for inactive members who
--              should remain in the system but be excluded from:
--              - Analytics calculations
--              - Event registration
--              - Attendance recording
-- ============================================================================

-- Note: PostgreSQL doesn't enforce ENUM constraints on TEXT columns
-- The role column is TEXT type, so these values can be used immediately
-- Application code will handle validation and access control

-- Add comment to document valid roles
COMMENT ON COLUMN users.role IS 'User role: pledge, brother, officer, admin, alumni, abroad. Alumni and abroad are excluded from analytics and cannot register for events or record attendance.';

-- ============================================================================
-- Update Analytics Queries to Exclude Alumni and Abroad
-- ============================================================================

-- Update get_points_dashboard to exclude alumni and abroad
CREATE OR REPLACE FUNCTION get_points_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_user_points JSON;
  v_category_points JSON;
  v_leaderboard JSON;
  v_user_rank INT;
  v_user_total_points NUMERIC;
  v_user_id UUID;
BEGIN
  -- Get user ID from JWT token
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Calculate current user's points by category
  WITH user_events AS (
    SELECT DISTINCT
      e.id,
      e.point_type,
      e.point_value::NUMERIC AS points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
    
    UNION
    
    SELECT DISTINCT
      e.id,
      e.point_type,
      e.point_value::NUMERIC AS points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
  ),
  category_totals AS (
    SELECT
      point_type,
      SUM(points) AS total_points
    FROM user_events
    GROUP BY point_type
  )
  SELECT
    (SELECT json_object_agg(point_type, COALESCE(total_points, 0)) FROM category_totals),
    (SELECT COALESCE(SUM(points), 0) AS total FROM user_events)
  INTO v_category_points, v_user_total_points;

  -- 2. Calculate leaderboard (top 10, excluding alumni and abroad)
  WITH all_user_points AS (
    SELECT DISTINCT
      u.user_id,
      u.first_name || ' ' || u.last_name AS name,
      COALESCE(SUM(ep.points), 0) AS total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT
        ea.user_id,
        e.point_value::NUMERIC AS points
      FROM event_attendance ea
      JOIN events e ON e.id = ea.event_id
      
      UNION
      
      SELECT DISTINCT
        pa.user_id,
        e.point_value::NUMERIC AS points
      FROM point_appeal pa
      JOIN events e ON e.id = pa.event_id
      WHERE pa.status = 'approved'
    ) ep ON u.user_id = ep.user_id
    WHERE u.role IN ('brother', 'officer', 'president')
    GROUP BY u.user_id, u.first_name, u.last_name
    ORDER BY total_points DESC
    LIMIT 10
  ),
  ranked_users AS (
    SELECT
      name,
      total_points,
      ROW_NUMBER() OVER (ORDER BY total_points DESC) AS rank
    FROM all_user_points
  )
  SELECT
    json_agg(json_build_object(
      'name', name,
      'total_points', total_points,
      'rank', rank
    ))
  INTO v_leaderboard
  FROM ranked_users;

  -- 3. Calculate current user's rank (excluding alumni and abroad)
  WITH all_user_totals AS (
    SELECT DISTINCT
      u.user_id,
      COALESCE(SUM(ep.points), 0) AS total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT
        ea.user_id,
        e.point_value::NUMERIC AS points
      FROM event_attendance ea
      JOIN events e ON e.id = ea.event_id
      
      UNION
      
      SELECT DISTINCT
        pa.user_id,
        e.point_value::NUMERIC AS points
      FROM point_appeal pa
      JOIN events e ON e.id = pa.event_id
      WHERE pa.status = 'approved'
    ) ep ON u.user_id = ep.user_id
    WHERE u.role IN ('brother', 'officer', 'president')
    GROUP BY u.user_id
  )
  SELECT COUNT(*) + 1 INTO v_user_rank
  FROM all_user_totals
  WHERE total_points > v_user_total_points;

  -- 4. Build the user_points object
  SELECT json_build_object(
    'total_points', v_user_total_points,
    'rank', v_user_rank
  ) INTO v_user_points;

  -- 5. Build final result
  SELECT json_build_object(
    'user_points', v_user_points,
    'category_points', COALESCE(v_category_points, '{}'::json),
    'leaderboard', COALESCE(v_leaderboard, '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_points_dashboard() IS 'Returns points dashboard data. Excludes alumni and abroad roles from rankings.';

-- ============================================================================
-- Add RLS Policy to Prevent Event Registration for Alumni/Abroad
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "prevent_alumni_abroad_registration" ON event_registration;

-- Create policy to block alumni and abroad from registering
CREATE POLICY "prevent_alumni_abroad_registration" ON event_registration
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role NOT IN ('alumni', 'abroad')
    )
  );

COMMENT ON POLICY "prevent_alumni_abroad_registration" ON event_registration IS 'Prevents alumni and abroad members from registering for events';

-- ============================================================================
-- Add RLS Policy to Prevent Event Attendance for Alumni/Abroad
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "prevent_alumni_abroad_attendance" ON event_attendance;

-- Create policy to block alumni and abroad from recording attendance
CREATE POLICY "prevent_alumni_abroad_attendance" ON event_attendance
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role NOT IN ('alumni', 'abroad')
    )
  );

COMMENT ON POLICY "prevent_alumni_abroad_attendance" ON event_attendance IS 'Prevents alumni and abroad members from recording attendance';
