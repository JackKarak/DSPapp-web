-- CRITICAL SECURITY FIX: Account Dashboard RPC
-- 
-- VULNERABILITY: Previous version accepted p_user_id parameter from client,
-- allowing any user to view any other user's account data by manipulating the parameter.
--
-- FIX: Remove parameter and use auth.uid() to get authenticated user's ID directly from JWT.
-- This ensures users can ONLY access their own account data.

CREATE OR REPLACE FUNCTION get_account_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_profile RECORD;
  v_events JSON;
  v_analytics JSON;
  v_achievements TEXT[];
  v_user_appeals JSON;
  v_appealable_events JSON;
  v_total_points NUMERIC;
  v_events_this_month INT;
  v_events_this_semester INT;
  v_current_streak INT;
  v_longest_streak INT;
  v_attendance_rate NUMERIC;
  v_rank_in_pledge_class INT;
  v_total_in_pledge_class INT;
  v_rank_in_fraternity INT;
  v_total_in_fraternity INT;
  v_this_month TIMESTAMP;
  v_this_semester TIMESTAMP;
  v_user_id UUID;
BEGIN
  -- SECURITY: Get user ID from JWT token, not from client parameter
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate date thresholds
  v_this_month := DATE_TRUNC('month', CURRENT_DATE AT TIME ZONE 'America/New_York');
  v_this_semester := CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8 
    THEN DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '7 months' -- August 1
    ELSE DATE_TRUNC('year', CURRENT_DATE) -- January 1
  END;

  -- 1. Get user profile
  SELECT * INTO v_profile
  FROM users
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- 2. Get all events (attendance + approved appeals) with creator info
  WITH user_attended_events AS (
    SELECT DISTINCT
      e.id,
      e.title,
      e.start_time AS date,
      e.point_value,
      e.point_type,
      COALESCE(u.first_name || ' ' || u.last_name, 'N/A') AS host_name,
      e.created_at AS attendance_time
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    LEFT JOIN users u ON u.user_id = e.created_by
    WHERE ea.user_id = v_user_id
    
    UNION
    
    SELECT DISTINCT
      e.id,
      e.title,
      e.start_time AS date,
      e.point_value,
      e.point_type,
      COALESCE(u.first_name || ' ' || u.last_name, 'N/A') AS host_name,
      e.created_at AS attendance_time
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    LEFT JOIN users u ON u.user_id = e.created_by
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'date', date,
      'point_value', point_value,
      'point_type', point_type,
      'host_name', host_name
    ) ORDER BY date DESC
  ) INTO v_events
  FROM user_attended_events;

  v_events := COALESCE(v_events, '[]'::json);

  -- 3. Calculate analytics
  -- Total points (use actual point_value + 50% bonus if registered)
  WITH event_points AS (
    SELECT DISTINCT
      e.id,
      e.start_time,
      CASE 
        WHEN er.user_id IS NOT NULL THEN e.point_value * 1.5
        ELSE e.point_value
      END as points_earned
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = v_user_id
    WHERE ea.user_id = v_user_id
    
    UNION
    
    SELECT DISTINCT
      e.id,
      e.start_time,
      CASE 
        WHEN er.user_id IS NOT NULL THEN e.point_value * 1.5
        ELSE e.point_value
      END as points_earned
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = v_user_id
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
  )
  SELECT COALESCE(SUM(points_earned), 0) INTO v_total_points
  FROM event_points;

  -- Events this month
  WITH user_events AS (
    SELECT DISTINCT e.id
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
      AND e.start_time >= v_this_month
    
    UNION
    
    SELECT DISTINCT e.id
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
      AND e.start_time >= v_this_month
  )
  SELECT COUNT(*) INTO v_events_this_month FROM user_events;

  -- Events this semester
  WITH user_events_semester AS (
    SELECT DISTINCT e.id
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
      AND e.start_time >= v_this_semester
    
    UNION
    
    SELECT DISTINCT e.id
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
      AND e.start_time >= v_this_semester
  )
  SELECT COUNT(*) INTO v_events_this_semester FROM user_events_semester;

  -- Calculate streaks
  WITH daily_attendance AS (
    SELECT DISTINCT DATE(e.start_time AT TIME ZONE 'America/New_York') as attendance_date
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
    
    UNION
    
    SELECT DISTINCT DATE(e.start_time AT TIME ZONE 'America/New_York') as attendance_date
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
  ),
  ordered_dates AS (
    SELECT 
      attendance_date,
      ROW_NUMBER() OVER (ORDER BY attendance_date DESC) as rn,
      attendance_date - (ROW_NUMBER() OVER (ORDER BY attendance_date DESC) * INTERVAL '1 day') as grp
    FROM daily_attendance
  ),
  streaks AS (
    SELECT 
      COUNT(*) as streak_length,
      MIN(attendance_date) as streak_start,
      MAX(attendance_date) as streak_end
    FROM ordered_dates
    GROUP BY grp
  )
  SELECT 
    COALESCE(MAX(CASE WHEN streak_end = CURRENT_DATE THEN streak_length ELSE 0 END), 0),
    COALESCE(MAX(streak_length), 0)
  INTO v_current_streak, v_longest_streak
  FROM streaks;

  -- Attendance rate
  WITH total_events AS (
    SELECT COUNT(*) as total
    FROM events
    WHERE start_time <= CURRENT_TIMESTAMP
  ),
  attended_events AS (
    SELECT COUNT(DISTINCT e.id) as attended
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
    
    UNION ALL
    
    SELECT COUNT(DISTINCT e.id) as attended
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
  )
  SELECT 
    CASE 
      WHEN te.total > 0 THEN (SUM(ae.attended)::NUMERIC / te.total) * 100
      ELSE 0
    END
  INTO v_attendance_rate
  FROM total_events te, attended_events ae
  GROUP BY te.total;

  -- Rankings
  -- Rank in pledge class
  WITH pledge_class_points AS (
    SELECT 
      u.user_id,
      COALESCE(SUM(
        CASE 
          WHEN er.user_id IS NOT NULL THEN e.point_value * 1.5
          ELSE e.point_value
        END
      ), 0) as total_points
    FROM users u
    LEFT JOIN event_attendance ea ON ea.user_id = u.user_id
    LEFT JOIN events e ON e.id = ea.event_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = u.user_id
    WHERE u.pledge_class = v_profile.pledge_class
      AND u.approved = true
    GROUP BY u.user_id
    
    UNION
    
    SELECT 
      u.user_id,
      COALESCE(SUM(
        CASE 
          WHEN er.user_id IS NOT NULL THEN e.point_value * 1.5
          ELSE e.point_value
        END
      ), 0) as total_points
    FROM users u
    LEFT JOIN point_appeal pa ON pa.user_id = u.user_id AND pa.status = 'approved'
    LEFT JOIN events e ON e.id = pa.event_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = u.user_id
    WHERE u.pledge_class = v_profile.pledge_class
      AND u.approved = true
    GROUP BY u.user_id
  ),
  pledge_class_rankings AS (
    SELECT 
      user_id,
      SUM(total_points) as total,
      RANK() OVER (ORDER BY SUM(total_points) DESC) as rank
    FROM pledge_class_points
    GROUP BY user_id
  )
  SELECT 
    COALESCE(rank, 0),
    COUNT(*) OVER ()
  INTO v_rank_in_pledge_class, v_total_in_pledge_class
  FROM pledge_class_rankings
  WHERE user_id = v_user_id;

  -- Rank in fraternity
  WITH fraternity_points AS (
    SELECT 
      u.user_id,
      COALESCE(SUM(
        CASE 
          WHEN er.user_id IS NOT NULL THEN e.point_value * 1.5
          ELSE e.point_value
        END
      ), 0) as total_points
    FROM users u
    LEFT JOIN event_attendance ea ON ea.user_id = u.user_id
    LEFT JOIN events e ON e.id = ea.event_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = u.user_id
    WHERE u.approved = true
    GROUP BY u.user_id
    
    UNION
    
    SELECT 
      u.user_id,
      COALESCE(SUM(
        CASE 
          WHEN er.user_id IS NOT NULL THEN e.point_value * 1.5
          ELSE e.point_value
        END
      ), 0) as total_points
    FROM users u
    LEFT JOIN point_appeal pa ON pa.user_id = u.user_id AND pa.status = 'approved'
    LEFT JOIN events e ON e.id = pa.event_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = u.user_id
    WHERE u.approved = true
    GROUP BY u.user_id
  ),
  fraternity_rankings AS (
    SELECT 
      user_id,
      SUM(total_points) as total,
      RANK() OVER (ORDER BY SUM(total_points) DESC) as rank
    FROM fraternity_points
    GROUP BY user_id
  )
  SELECT 
    COALESCE(rank, 0),
    COUNT(*) OVER ()
  INTO v_rank_in_fraternity, v_total_in_fraternity
  FROM fraternity_rankings
  WHERE user_id = v_user_id;

  -- 4. Calculate achievements
  v_achievements := ARRAY[]::TEXT[];

  -- Consistency & Streaks
  IF v_current_streak >= 3 THEN v_achievements := array_append(v_achievements, 'streak_starter'); END IF;
  IF v_current_streak >= 10 THEN v_achievements := array_append(v_achievements, 'iron_brother'); END IF;
  IF v_current_streak >= 20 THEN v_achievements := array_append(v_achievements, 'unstoppable'); END IF;
  IF v_current_streak >= 30 THEN v_achievements := array_append(v_achievements, 'legend_streak'); END IF;

  -- Milestones
  IF v_events_this_semester >= 1 THEN v_achievements := array_append(v_achievements, 'first_timer'); END IF;
  IF v_events_this_semester >= 10 THEN v_achievements := array_append(v_achievements, 'ten_strong'); END IF;
  IF v_events_this_semester >= 25 THEN v_achievements := array_append(v_achievements, 'silver_brother'); END IF;
  IF v_events_this_semester >= 50 THEN v_achievements := array_append(v_achievements, 'gold_brother'); END IF;
  IF v_events_this_semester >= 100 THEN v_achievements := array_append(v_achievements, 'diamond_brother'); END IF;

  -- Points
  IF v_total_points >= 50 THEN v_achievements := array_append(v_achievements, 'points_50'); END IF;
  IF v_total_points >= 100 THEN v_achievements := array_append(v_achievements, 'points_100'); END IF;
  IF v_total_points >= 250 THEN v_achievements := array_append(v_achievements, 'points_250'); END IF;
  IF v_total_points >= 500 THEN v_achievements := array_append(v_achievements, 'points_500'); END IF;

  -- Attendance rate
  IF v_attendance_rate >= 75 THEN v_achievements := array_append(v_achievements, 'attendance_master'); END IF;
  IF v_attendance_rate >= 90 THEN v_achievements := array_append(v_achievements, 'perfect_attendance'); END IF;

  -- Rankings
  IF v_rank_in_pledge_class = 1 AND v_total_in_pledge_class > 1 THEN 
    v_achievements := array_append(v_achievements, 'class_leader'); 
  END IF;
  IF v_rank_in_fraternity <= 3 AND v_total_in_fraternity > 3 THEN 
    v_achievements := array_append(v_achievements, 'top_performer'); 
  END IF;

  -- 5. Build analytics object
  v_analytics := json_build_object(
    'totalPoints', v_total_points,
    'currentStreak', v_current_streak,
    'longestStreak', v_longest_streak,
    'eventsThisMonth', v_events_this_month,
    'eventsThisSemester', v_events_this_semester,
    'attendanceRate', v_attendance_rate,
    'rankInPledgeClass', v_rank_in_pledge_class,
    'totalInPledgeClass', v_total_in_pledge_class,
    'rankInFraternity', v_rank_in_fraternity,
    'totalInFraternity', v_total_in_fraternity,
    'achievements', v_achievements,
    'monthlyProgress', '[]'::json
  );

  -- 6. Get user's appeals (with reviewer info)
  SELECT json_agg(
    json_build_object(
      'id', pa.id,
      'event_id', pa.event_id,
      'event_name', e.title,
      'appeal_reason', pa.appeal_reason,
      'picture_url', pa.picture_url,
      'status', pa.status,
      'created_at', pa.created_at,
      'reviewed_at', pa.reviewed_at,
      'reviewed_by', pa.reviewed_by,
      'admin_response', pa.admin_response,
      'reviewer_info', CASE 
        WHEN pa.reviewed_by IS NOT NULL THEN json_build_object(
          'first_name', r.first_name,
          'last_name', r.last_name
        )
        ELSE NULL
      END
    ) ORDER BY pa.created_at DESC
  ) INTO v_user_appeals
  FROM point_appeal pa
  JOIN events e ON e.id = pa.event_id
  LEFT JOIN users r ON r.user_id = pa.reviewed_by
  WHERE pa.user_id = v_user_id;

  v_user_appeals := COALESCE(v_user_appeals, '[]'::json);

  -- 7. Get appealable events (past 30 days, not attended, not appealed, approved only)
  SELECT json_agg(
    json_build_object(
      'id', e.id,
      'title', e.title,
      'date', e.start_time,
      'point_value', e.point_value,
      'point_type', e.point_type,
      'host_name', COALESCE(u.first_name || ' ' || u.last_name, 'N/A')
    ) ORDER BY e.start_time DESC
  ) INTO v_appealable_events
  FROM events e
  LEFT JOIN users u ON u.user_id = e.created_by
  WHERE e.status = 'approved'
    AND e.start_time >= CURRENT_DATE - INTERVAL '30 days'
    AND e.end_time < CURRENT_TIMESTAMP
    AND e.point_type != 'No Point'
    AND e.id NOT IN (
      SELECT event_id FROM event_attendance WHERE user_id = v_user_id
    )
    AND e.id NOT IN (
      SELECT event_id FROM point_appeal WHERE user_id = v_user_id
    );

  v_appealable_events := COALESCE(v_appealable_events, '[]'::json);

  -- Build final result
  v_result := json_build_object(
    'profile', row_to_json(v_profile),
    'events', v_events,
    'analytics', v_analytics,
    'user_appeals', v_user_appeals,
    'appealable_events', v_appealable_events
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_account_dashboard() TO authenticated;

-- Add comment explaining the security fix
COMMENT ON FUNCTION get_account_dashboard() IS 
'Secure account dashboard data fetcher. Uses auth.uid() from JWT to ensure users can only access their own data. 
SECURITY: Never accepts user_id as parameter to prevent unauthorized data access.';
