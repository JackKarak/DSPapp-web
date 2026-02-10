-- ============================================================================
-- Remove 1.5x Registration Bonus from Legacy SQL Functions
-- ============================================================================
-- Migration: 20260210_remove_registration_bonus_legacy_functions
-- Description: Updates legacy parameterized functions to match current system
--              (no registration bonus). These functions are not currently used
--              by the frontend but exist in the database.
-- Functions Updated:
--   1. calculate_user_points(user_ids uuid[])
--   2. get_points_dashboard(p_user_id UUID)
--   3. get_account_dashboard(p_user_id UUID)
-- ============================================================================

-- ============================================================================
-- 1. Update calculate_user_points function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_user_points(user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  total_points numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH user_events AS (
    -- Get all attended events (attendance + approved appeals combined, deduplicated)
    SELECT DISTINCT
      ea.user_id,
      ea.event_id
    FROM event_attendance ea
    WHERE ea.user_id = ANY(user_ids)
    
    UNION
    
    SELECT DISTINCT
      pa.user_id,
      pa.event_id
    FROM point_appeal pa
    WHERE pa.user_id = ANY(user_ids)
      AND pa.status = 'approved'
  ),
  user_points AS (
    -- Calculate points: event point_value only (no registration bonus)
    SELECT 
      ue.user_id,
      SUM(e.point_value) as total_points
    FROM user_events ue
    JOIN events e ON e.id = ue.event_id
    GROUP BY ue.user_id
  ),
  all_users AS (
    SELECT unnest(user_ids) as user_id
  )
  SELECT 
    au.user_id,
    COALESCE(up.total_points, 0) as total_points
  FROM all_users au
  LEFT JOIN user_points up ON au.user_id = up.user_id
  ORDER BY total_points DESC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION calculate_user_points(uuid[]) TO authenticated;

COMMENT ON FUNCTION calculate_user_points IS 'Calculates total points for given users. Each event attendance or approved appeal awards the event point_value. No registration bonus.';

-- ============================================================================
-- 2. Update get_points_dashboard(p_user_id UUID) function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_points_dashboard(p_user_id UUID)
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
BEGIN
  -- 1. Calculate current user's points by category
  -- Attended event = point_value (no registration bonus)
  -- Approved appeal = point_value
  WITH user_events AS (
    SELECT DISTINCT
      e.id,
      e.point_type,
      e.point_value AS points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = p_user_id
    
    UNION
    
    SELECT DISTINCT
      e.id,
      e.point_type,
      e.point_value AS points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = p_user_id
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

  -- 2. Calculate leaderboard (top 10)
  WITH all_user_points AS (
    SELECT DISTINCT
      u.user_id,
      u.first_name || ' ' || u.last_name AS name,
      COALESCE(SUM(ep.points), 0) AS total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT
        ea.user_id,
        e.point_value AS points
      FROM event_attendance ea
      JOIN events e ON e.id = ea.event_id
      
      UNION
      
      SELECT DISTINCT
        pa.user_id,
        e.point_value AS points
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

  -- 3. Calculate current user's rank
  WITH all_user_totals AS (
    SELECT DISTINCT
      u.user_id,
      COALESCE(SUM(ep.points), 0) AS total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT
        ea.user_id,
        e.point_value AS points
      FROM event_attendance ea
      JOIN events e ON e.id = ea.event_id
      
      UNION
      
      SELECT DISTINCT
        pa.user_id,
        e.point_value AS points
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

GRANT EXECUTE ON FUNCTION get_points_dashboard(UUID) TO authenticated;

COMMENT ON FUNCTION get_points_dashboard(UUID) IS 'Returns points dashboard data for a specific user. Each event attendance or approved appeal awards the event point_value. No registration bonus.';

-- ============================================================================
-- 3. Update get_account_dashboard(p_user_id UUID) function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_dashboard(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_total_points NUMERIC := 0;
  v_events_this_month INT := 0;
  v_events_this_semester INT := 0;
  v_current_streak INT := 0;
  v_longest_streak INT := 0;
  v_pledge_class_rank INT := 0;
  v_overall_rank INT := 0;
BEGIN
  -- 1. Calculate total points (no registration bonus)
  SELECT COALESCE(SUM(e.point_value), 0) INTO v_total_points
  FROM (
    SELECT DISTINCT event_id
    FROM event_attendance
    WHERE user_id = p_user_id
    
    UNION
    
    SELECT DISTINCT event_id
    FROM point_appeal
    WHERE user_id = p_user_id AND status = 'approved'
  ) user_events
  JOIN events e ON e.id = user_events.event_id;

  -- 2. Calculate events this month
  SELECT COUNT(DISTINCT e.id) INTO v_events_this_month
  FROM events e
  WHERE EXISTS (
    SELECT 1 FROM event_attendance ea
    WHERE ea.event_id = e.id AND ea.user_id = p_user_id
  )
  AND DATE_TRUNC('month', e.start_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- 3. Calculate events this semester
  SELECT COUNT(DISTINCT e.id) INTO v_events_this_semester
  FROM events e
  WHERE EXISTS (
    SELECT 1 FROM event_attendance ea
    WHERE ea.event_id = e.id AND ea.user_id = p_user_id
  )
  AND e.start_time >= CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8 THEN
      MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 8, 1)
    ELSE
      MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 1)
  END;

  -- 4. Calculate streaks (simplified version)
  WITH attendance_dates AS (
    SELECT DISTINCT DATE(ea.attended_at) as attendance_date
    FROM event_attendance ea
    WHERE ea.user_id = p_user_id
    ORDER BY DATE(ea.attended_at)
  )
  SELECT 
    COUNT(*) as current_streak
  INTO v_current_streak
  FROM attendance_dates
  WHERE attendance_date >= CURRENT_DATE - INTERVAL '7 days';

  v_longest_streak := v_current_streak; -- Simplified for now

  -- 5. Calculate pledge class rank
  WITH user_info AS (
    SELECT pledge_class FROM users WHERE user_id = p_user_id
  ),
  pledge_class_points AS (
    SELECT 
      u.user_id,
      COALESCE(SUM(e.point_value), 0) as total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT user_id, event_id
      FROM event_attendance
      UNION
      SELECT DISTINCT user_id, event_id
      FROM point_appeal WHERE status = 'approved'
    ) ue ON u.user_id = ue.user_id
    LEFT JOIN events e ON e.id = ue.event_id
    WHERE u.pledge_class = (SELECT pledge_class FROM user_info)
    GROUP BY u.user_id
  )
  SELECT COUNT(*) + 1 INTO v_pledge_class_rank
  FROM pledge_class_points
  WHERE total_points > v_total_points;

  -- 6. Calculate overall rank
  WITH all_points AS (
    SELECT 
      u.user_id,
      COALESCE(SUM(e.point_value), 0) as total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT user_id, event_id
      FROM event_attendance
      UNION
      SELECT DISTINCT user_id, event_id
      FROM point_appeal WHERE status = 'approved'
    ) ue ON u.user_id = ue.user_id
    LEFT JOIN events e ON e.id = ue.event_id
    WHERE u.role IN ('brother', 'officer', 'president')
    GROUP BY u.user_id
  )
  SELECT COUNT(*) + 1 INTO v_overall_rank
  FROM all_points
  WHERE total_points > v_total_points;

  -- 7. Build result
  SELECT json_build_object(
    'total_points', v_total_points,
    'events_this_month', v_events_this_month,
    'events_this_semester', v_events_this_semester,
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'pledge_class_rank', v_pledge_class_rank,
    'overall_rank', v_overall_rank
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_dashboard(UUID) TO authenticated;

COMMENT ON FUNCTION get_account_dashboard(UUID) IS 'Returns account dashboard data for a specific user. Each event attendance or approved appeal awards the event point_value. No registration bonus.';
