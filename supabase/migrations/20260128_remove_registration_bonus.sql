-- ============================================================================
-- Remove 1.5x Registration Bonus from Points Calculation
-- ============================================================================
-- Migration: 20260128_remove_registration_bonus
-- Description: Updates get_points_dashboard and get_account_dashboard functions
--              to remove the 1.5x multiplier for registered events.
--              All events now award their base point_value regardless of registration.
-- ============================================================================

-- ============================================================================
-- 1. Update get_points_dashboard function
-- ============================================================================

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
  -- Attended event = point_value (no registration bonus)
  -- Approved appeal = point_value
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
    WHERE point_type IS NOT NULL
    GROUP BY point_type
  ),
  user_total AS (
    SELECT COALESCE(SUM(points), 0) AS total
    FROM user_events
  )
  SELECT 
    (SELECT json_object_agg(point_type, COALESCE(total_points, 0)) FROM category_totals),
    (SELECT total FROM user_total)
  INTO v_category_points, v_user_total_points;

  v_category_points := COALESCE(v_category_points, '{}'::json);

  -- 2. Generate leaderboard (top 5) AND calculate user rank
  WITH all_user_points AS (
    SELECT 
      u.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS name,
      COALESCE(SUM(ep.points), 0) AS total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT
        ea.user_id,
        e.id AS event_id,
        e.point_value::NUMERIC AS points
      FROM event_attendance ea
      JOIN events e ON e.id = ea.event_id
      
      UNION
      
      SELECT DISTINCT
        pa.user_id,
        pa.event_id,
        e.point_value::NUMERIC AS points
      FROM point_appeal pa
      JOIN events e ON e.id = pa.event_id
      WHERE pa.status = 'approved'
    ) ep ON ep.user_id = u.user_id
    GROUP BY u.user_id, u.first_name, u.last_name
    ORDER BY total_points DESC
  ),
  ranked_users AS (
    SELECT 
      user_id,
      name,
      total_points,
      ROW_NUMBER() OVER (ORDER BY total_points DESC) AS rank
    FROM all_user_points
  ),
  top_5 AS (
    SELECT json_agg(json_build_object(
      'user_id', user_id,
      'name', name,
      'total_points', total_points,
      'rank', rank
    ))
    FROM (SELECT * FROM ranked_users LIMIT 5) t
  )
  SELECT 
    COALESCE((SELECT * FROM top_5), '[]'::json),
    (SELECT rank FROM ranked_users WHERE user_id = v_user_id)
  INTO v_leaderboard, v_user_rank;

  -- Build final result
  v_result := json_build_object(
    'user_points', json_build_object(
      'total_points', v_user_total_points,
      'category_points', v_category_points,
      'rank', v_user_rank
    ),
    'leaderboard', v_leaderboard
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_points_dashboard() IS 'Returns points dashboard data. Each event attendance or approved appeal awards the event point_value. No registration bonus.';

-- ============================================================================
-- 2. Update get_account_dashboard function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_events JSON;
  v_total_points NUMERIC;
  v_events_this_month INT;
  v_events_this_semester INT;
  v_next_achievement JSON;
  v_unlocked_achievements JSON;
  v_appealable_events JSON;
  v_appeals JSON;
  v_test_bank_submissions JSON;
  v_user_id UUID;
  v_this_month TIMESTAMP;
  v_this_semester TIMESTAMP;
BEGIN
  -- Get user ID from JWT token
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate time boundaries
  v_this_month := date_trunc('month', CURRENT_TIMESTAMP);
  v_this_semester := 
    CASE 
      WHEN EXTRACT(MONTH FROM CURRENT_TIMESTAMP) >= 8 THEN 
        date_trunc('year', CURRENT_TIMESTAMP) + INTERVAL '7 months'
      ELSE 
        date_trunc('year', CURRENT_TIMESTAMP)
    END;

  -- 1. Get recent events with attendance info
  WITH recent_events AS (
    SELECT
      e.id,
      e.title,
      e.start_time,
      e.point_type,
      e.point_value,
      e.location,
      e.description,
      CASE WHEN ea.attended_at IS NOT NULL THEN true ELSE false END as attended
    FROM events e
    LEFT JOIN event_attendance ea ON ea.event_id = e.id AND ea.user_id = v_user_id
    WHERE e.start_time >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    ORDER BY e.start_time DESC
    LIMIT 10
  )
  SELECT json_agg(json_build_object(
    'id', id,
    'title', title,
    'start_time', start_time,
    'point_type', point_type,
    'point_value', point_value,
    'location', location,
    'description', description,
    'attended', attended
  ))
  INTO v_events
  FROM recent_events;

  v_events := COALESCE(v_events, '[]'::json);

  -- 2. Calculate total points (no registration bonus)
  WITH event_points AS (
    SELECT DISTINCT
      ea.user_id,
      ea.event_id,
      e.point_value::NUMERIC AS points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
      AND ea.attended_at IS NOT NULL
    
    UNION
    
    SELECT DISTINCT
      pa.user_id,
      pa.event_id,
      e.point_value::NUMERIC AS points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
  )
  SELECT COALESCE(SUM(points), 0)
  INTO v_total_points
  FROM event_points;

  -- 3. Events this month
  SELECT COUNT(DISTINCT e.id)
  INTO v_events_this_month
  FROM event_attendance ea
  JOIN events e ON e.id = ea.event_id
  WHERE ea.user_id = v_user_id
    AND e.start_time >= v_this_month;

  -- 4. Events this semester
  SELECT COUNT(DISTINCT e.id)
  INTO v_events_this_semester
  FROM event_attendance ea
  JOIN events e ON e.id = ea.event_id
  WHERE ea.user_id = v_user_id
    AND e.start_time >= v_this_semester;

  -- 5. Get next achievement
  WITH user_achievement_progress AS (
    SELECT 
      v_total_points as user_points,
      v_events_this_month as events_this_month,
      v_events_this_semester as events_this_semester
  )
  SELECT json_build_object(
    'key', achievement_key,
    'points_needed', points_needed
  )
  INTO v_next_achievement
  FROM (
    SELECT 
      CASE 
        WHEN user_points < 50 THEN 'points_50'
        WHEN user_points < 100 THEN 'points_100'
        WHEN user_points < 250 THEN 'points_250'
        WHEN user_points < 500 THEN 'points_500'
        ELSE NULL
      END as achievement_key,
      CASE 
        WHEN user_points < 50 THEN 50 - user_points
        WHEN user_points < 100 THEN 100 - user_points
        WHEN user_points < 250 THEN 250 - user_points
        WHEN user_points < 500 THEN 500 - user_points
        ELSE 0
      END as points_needed
    FROM user_achievement_progress
  ) next_ach
  WHERE achievement_key IS NOT NULL
  LIMIT 1;

  v_next_achievement := COALESCE(v_next_achievement, 'null'::json);

  -- 6. Get unlocked achievements
  WITH user_achievement_progress AS (
    SELECT 
      v_total_points as user_points,
      v_events_this_month as events_this_month,
      v_events_this_semester as events_this_semester
  )
  SELECT json_agg(achievement_key)
  INTO v_unlocked_achievements
  FROM (
    SELECT DISTINCT achievement_key
    FROM (
      SELECT 'first_timer' as achievement_key FROM user_achievement_progress WHERE events_this_semester >= 1
      UNION ALL
      SELECT 'ten_strong' FROM user_achievement_progress WHERE events_this_semester >= 10
      UNION ALL
      SELECT 'two_dozen' FROM user_achievement_progress WHERE events_this_semester >= 24
      UNION ALL
      SELECT 'half_century' FROM user_achievement_progress WHERE events_this_semester >= 50
      UNION ALL
      SELECT 'points_50' FROM user_achievement_progress WHERE user_points >= 50
      UNION ALL
      SELECT 'points_100' FROM user_achievement_progress WHERE user_points >= 100
      UNION ALL
      SELECT 'points_250' FROM user_achievement_progress WHERE user_points >= 250
      UNION ALL
      SELECT 'points_500' FROM user_achievement_progress WHERE user_points >= 500
      -- early_bird achievement removed - event_registration table does not exist
      UNION ALL
      SELECT 'monthly_hero' FROM user_achievement_progress WHERE events_this_month >= 5
    ) achievements
  ) unlocked;

  v_unlocked_achievements := COALESCE(v_unlocked_achievements, '[]'::json);

  -- 7. Get appealable events (events attended but not in appeals)
  WITH appealable AS (
    SELECT DISTINCT
      e.id,
      e.title,
      e.start_time,
      e.point_type,
      e.point_value,
      u.first_name || ' ' || u.last_name AS host_name
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    LEFT JOIN users u ON u.id = e.user_id
    WHERE ea.user_id = v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM point_appeal pa
        WHERE pa.event_id = e.id AND pa.user_id = v_user_id
      )
    ORDER BY e.start_time DESC
    LIMIT 20
  )
  SELECT json_agg(json_build_object(
    'id', id,
    'title', title,
    'start_time', start_time,
    'point_type', point_type,
    'point_value', point_value,
    'host_name', host_name
  ))
  INTO v_appealable_events
  FROM appealable;

  v_appealable_events := COALESCE(v_appealable_events, '[]'::json);

  -- 8. Get user's appeals with full event details
  WITH user_appeals AS (
    SELECT 
      pa.id,
      pa.status,
      pa.reason,
      pa.admin_response,
      pa.created_at,
      json_build_object(
        'id', e.id,
        'title', e.title,
        'start_time', e.start_time,
        'point_type', e.point_type,
        'point_value', e.point_value
      ) as event
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id
    ORDER BY pa.created_at DESC
  )
  SELECT json_agg(json_build_object(
    'id', id,
    'status', status,
    'reason', reason,
    'admin_response', admin_response,
    'created_at', created_at,
    'event', event
  ))
  INTO v_appeals
  FROM user_appeals;

  v_appeals := COALESCE(v_appeals, '[]'::json);

  -- 9. Get test bank submissions
  WITH user_submissions AS (
    SELECT
      tb.id,
      tb.original_file_name,
      tb.stored_file_name,
      tb.created_at,
      tb.status
    FROM test_bank tb
    WHERE tb.submitted_by = v_user_id
    ORDER BY tb.created_at DESC
  )
  SELECT json_agg(json_build_object(
    'id', id,
    'original_file_name', original_file_name,
    'stored_file_name', stored_file_name,
    'uploaded_at', created_at,
    'status', status
  ))
  INTO v_test_bank_submissions
  FROM user_submissions;

  v_test_bank_submissions := COALESCE(v_test_bank_submissions, '[]'::json);

  -- Build final result
  v_result := json_build_object(
    'events', v_events,
    'total_points', v_total_points,
    'events_this_month', v_events_this_month,
    'events_this_semester', v_events_this_semester,
    'next_achievement', v_next_achievement,
    'unlocked_achievements', v_unlocked_achievements,
    'appealable_events', v_appealable_events,
    'appeals', v_appeals,
    'test_bank_submissions', v_test_bank_submissions
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_account_dashboard() IS 'Returns account dashboard data. Each event attendance or approved appeal awards the event point_value. No registration bonus.';
