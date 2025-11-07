-- Fix Ranking Calculation in Account Dashboard
-- Issue: Rankings for pledge class and fraternity may be incorrect due to UNION logic
-- This migration fixes the ranking calculation to properly aggregate points

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
    THEN DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '7 months' -- August
    ELSE DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '4 months' -- August of previous year
  END;

  -- 1. Get user profile
  SELECT * INTO v_profile
  FROM users
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- 2. Get all events (attendance + approved appeals) with creator info
  -- Use DISTINCT to ensure each event appears only once
  WITH user_attended_events AS (
    SELECT DISTINCT
      e.id,
      e.title,
      e.start_time AS date,
      e.point_value,
      e.point_type,
      COALESCE(u.first_name || ' ' || u.last_name, 'N/A') AS host_name
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
      COALESCE(u.first_name || ' ' || u.last_name, 'N/A') AS host_name
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    LEFT JOIN users u ON u.user_id = e.created_by
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM event_attendance ea2
        WHERE ea2.event_id = e.id AND ea2.user_id = v_user_id
      )
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'date', date,
      'pointValue', point_value,
      'pointType', point_type,
      'host_name', host_name
    ) ORDER BY date DESC
  )
  INTO v_events
  FROM user_attended_events;

  v_events := COALESCE(v_events, '[]'::json);

  -- 3. Calculate analytics
  -- Total points (with 1.5x multiplier for registered events)
  WITH event_points AS (
    SELECT DISTINCT
      ea.user_id,
      e.id AS event_id,
      CASE 
        WHEN er.event_id IS NOT NULL THEN (e.point_value * 1.5)
        ELSE e.point_value
      END AS points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = ea.user_id
    WHERE ea.user_id = v_user_id
    
    UNION
    
    SELECT DISTINCT
      pa.user_id,
      pa.event_id,
      e.point_value AS points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id
      AND pa.status = 'approved'
  )
  SELECT COALESCE(SUM(points), 0)
  INTO v_total_points
  FROM event_points;

  -- Events this month
  SELECT COUNT(DISTINCT e.id)
  INTO v_events_this_month
  FROM event_attendance ea
  JOIN events e ON e.id = ea.event_id
  WHERE ea.user_id = v_user_id
    AND e.start_time >= v_this_month;

  -- Events this semester
  SELECT COUNT(DISTINCT e.id)
  INTO v_events_this_semester
  FROM event_attendance ea
  JOIN events e ON e.id = ea.event_id
  WHERE ea.user_id = v_user_id
    AND e.start_time >= v_this_semester;

  -- Attendance streaks
  WITH event_dates AS (
    SELECT DISTINCT
      DATE(e.start_time AT TIME ZONE 'America/New_York') AS event_date
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
    ORDER BY event_date
  ),
  streak_groups AS (
    SELECT 
      event_date,
      event_date - (ROW_NUMBER() OVER (ORDER BY event_date) * INTERVAL '14 days') AS streak_group
    FROM event_dates
  ),
  streaks AS (
    SELECT 
      COUNT(*) AS streak_length,
      MAX(event_date) AS last_event
    FROM streak_groups
    GROUP BY streak_group
  )
  SELECT 
    COALESCE(MAX(streak_length) FILTER (WHERE last_event >= CURRENT_DATE - INTERVAL '14 days'), 0),
    COALESCE(MAX(streak_length), 0)
  INTO v_current_streak, v_longest_streak
  FROM streaks;

  -- Attendance rate
  WITH total_events AS (
    SELECT COUNT(*) as total FROM events WHERE status = 'approved' AND start_time < NOW()
  ),
  attended_events AS (
    SELECT COUNT(DISTINCT event_id) as attended
    FROM event_attendance
    WHERE user_id = v_user_id
    
    UNION
    
    SELECT COUNT(DISTINCT event_id) as attended
    FROM point_appeal
    WHERE user_id = v_user_id AND status = 'approved'
  )
  SELECT 
    CASE 
      WHEN te.total > 0 THEN (SUM(ae.attended)::NUMERIC / te.total) * 100
      ELSE 0
    END
  INTO v_attendance_rate
  FROM total_events te, attended_events ae
  GROUP BY te.total;

  -- Rankings - FIXED VERSION
  -- Rank in pledge class
  WITH all_user_points AS (
    -- Get all users in same pledge class
    SELECT DISTINCT
      u.user_id,
      0 as total_points
    FROM users u
    WHERE u.pledge_class = v_profile.pledge_class
      AND u.approved = true
  ),
  user_event_points AS (
    -- Calculate points from attendance
    SELECT 
      ea.user_id,
      SUM(CASE 
        WHEN er.event_id IS NOT NULL THEN (e.point_value * 1.5)
        ELSE e.point_value
      END) as total_points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    JOIN users u ON u.user_id = ea.user_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = ea.user_id
    WHERE u.pledge_class = v_profile.pledge_class
      AND u.approved = true
    GROUP BY ea.user_id
  ),
  user_appeal_points AS (
    -- Calculate points from appeals
    SELECT 
      pa.user_id,
      SUM(e.point_value) as total_points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    JOIN users u ON u.user_id = pa.user_id
    WHERE pa.status = 'approved'
      AND u.pledge_class = v_profile.pledge_class
      AND u.approved = true
    GROUP BY pa.user_id
  ),
  combined_points AS (
    -- Combine all points
    SELECT 
      user_id,
      COALESCE(SUM(total_points), 0) as total
    FROM (
      SELECT user_id, total_points FROM user_event_points
      UNION ALL
      SELECT user_id, total_points FROM user_appeal_points
      UNION ALL
      SELECT user_id, total_points FROM all_user_points
    ) all_points
    GROUP BY user_id
  ),
  rankings AS (
    SELECT 
      user_id,
      total,
      RANK() OVER (ORDER BY total DESC) as rank,
      COUNT(*) OVER () as total_count
    FROM combined_points
  )
  SELECT 
    COALESCE(rank, 0),
    COALESCE(total_count, 0)
  INTO v_rank_in_pledge_class, v_total_in_pledge_class
  FROM rankings
  WHERE user_id = v_user_id;

  -- Rank in fraternity - FIXED VERSION
  WITH all_user_points AS (
    -- Get all approved users
    SELECT DISTINCT
      u.user_id,
      0 as total_points
    FROM users u
    WHERE u.approved = true
  ),
  user_event_points AS (
    -- Calculate points from attendance
    SELECT 
      ea.user_id,
      SUM(CASE 
        WHEN er.event_id IS NOT NULL THEN (e.point_value * 1.5)
        ELSE e.point_value
      END) as total_points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    JOIN users u ON u.user_id = ea.user_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = ea.user_id
    WHERE u.approved = true
    GROUP BY ea.user_id
  ),
  user_appeal_points AS (
    -- Calculate points from appeals
    SELECT 
      pa.user_id,
      SUM(e.point_value) as total_points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    JOIN users u ON u.user_id = pa.user_id
    WHERE pa.status = 'approved'
      AND u.approved = true
    GROUP BY pa.user_id
  ),
  combined_points AS (
    -- Combine all points
    SELECT 
      user_id,
      COALESCE(SUM(total_points), 0) as total
    FROM (
      SELECT user_id, total_points FROM user_event_points
      UNION ALL
      SELECT user_id, total_points FROM user_appeal_points
      UNION ALL
      SELECT user_id, total_points FROM all_user_points
    ) all_points
    GROUP BY user_id
  ),
  rankings AS (
    SELECT 
      user_id,
      total,
      RANK() OVER (ORDER BY total DESC) as rank,
      COUNT(*) OVER () as total_count
    FROM combined_points
  )
  SELECT 
    COALESCE(rank, 0),
    COALESCE(total_count, 0)
  INTO v_rank_in_fraternity, v_total_in_fraternity
  FROM rankings
  WHERE user_id = v_user_id;

  -- 4. Calculate achievements
  v_achievements := ARRAY[]::TEXT[];

  -- Consistency & Streaks
  IF v_current_streak >= 3 THEN v_achievements := array_append(v_achievements, 'streak_starter'); END IF;
  IF v_current_streak >= 10 THEN v_achievements := array_append(v_achievements, 'iron_brother'); END IF;
  IF v_current_streak >= 20 THEN v_achievements := array_append(v_achievements, 'unstoppable'); END IF;
  IF v_current_streak >= 30 THEN v_achievements := array_append(v_achievements, 'legend_streak'); END IF;

  -- Points
  IF v_total_points >= 50 THEN v_achievements := array_append(v_achievements, 'points_50'); END IF;
  IF v_total_points >= 100 THEN v_achievements := array_append(v_achievements, 'points_100'); END IF;
  IF v_total_points >= 250 THEN v_achievements := array_append(v_achievements, 'points_250'); END IF;
  IF v_total_points >= 500 THEN v_achievements := array_append(v_achievements, 'points_500'); END IF;

  -- Events
  IF v_events_this_semester >= 1 THEN v_achievements := array_append(v_achievements, 'first_timer'); END IF;
  IF v_events_this_semester >= 5 THEN v_achievements := array_append(v_achievements, 'monthly_champion'); END IF;
  IF v_events_this_semester >= 10 THEN v_achievements := array_append(v_achievements, 'ten_strong'); END IF;
  IF v_events_this_semester >= 15 THEN v_achievements := array_append(v_achievements, 'dedicated_member'); END IF;
  IF v_events_this_semester >= 25 THEN v_achievements := array_append(v_achievements, 'silver_brother'); END IF;
  IF v_events_this_semester >= 50 THEN v_achievements := array_append(v_achievements, 'gold_brother'); END IF;
  IF v_events_this_semester >= 100 THEN v_achievements := array_append(v_achievements, 'diamond_brother'); END IF;

  -- Attendance
  IF v_attendance_rate >= 75 THEN v_achievements := array_append(v_achievements, 'punctual_pro'); END IF;
  IF v_attendance_rate >= 100 THEN v_achievements := array_append(v_achievements, 'perfect_semester'); END IF;

  -- Rankings
  IF v_rank_in_pledge_class = 1 AND v_total_in_pledge_class > 1 THEN 
    v_achievements := array_append(v_achievements, 'top_3'); 
  END IF;
  IF v_rank_in_fraternity <= 3 AND v_total_in_fraternity > 3 THEN 
    v_achievements := array_append(v_achievements, 'top_3'); 
  END IF;

  -- Special
  IF v_total_points >= 1000 AND v_attendance_rate >= 95 AND v_events_this_semester >= 75 THEN
    v_achievements := array_append(v_achievements, 'fraternity_legend');
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

  -- 6. Get user's appeals (with reviewer info and full event details)
  SELECT json_agg(
    json_build_object(
      'id', pa.id,
      'event_id', pa.event_id,
      'appeal_reason', pa.appeal_reason,
      'picture_url', pa.picture_url,
      'status', pa.status,
      'created_at', pa.created_at,
      'reviewed_at', pa.reviewed_at,
      'reviewed_by', pa.reviewed_by,
      'admin_response', pa.admin_response,
      'event', CASE 
        WHEN e.id IS NOT NULL THEN json_build_object(
          'id', e.id,
          'title', e.title,
          'start_time', e.start_time,
          'point_value', e.point_value,
          'point_type', e.point_type
        )
        ELSE NULL
      END,
      'reviewer', CASE 
        WHEN pa.reviewed_by IS NOT NULL THEN json_build_object(
          'first_name', r.first_name,
          'last_name', r.last_name
        )
        ELSE NULL
      END
    ) ORDER BY pa.created_at DESC
  )
  INTO v_user_appeals
  FROM point_appeal pa
  LEFT JOIN events e ON e.id = pa.event_id
  LEFT JOIN users r ON r.user_id = pa.reviewed_by
  WHERE pa.user_id = v_user_id;

  v_user_appeals := COALESCE(v_user_appeals, '[]'::json);

  -- 7. Get appealable events (events not attended and not appealed)
  SELECT json_agg(
    json_build_object(
      'id', e.id,
      'title', e.title,
      'date', e.start_time,
      'pointValue', e.point_value,
      'pointType', e.point_type,
      'host_name', COALESCE(u.first_name || ' ' || u.last_name, 'N/A')
    ) ORDER BY e.start_time DESC
  )
  INTO v_appealable_events
  FROM events e
  LEFT JOIN users u ON u.user_id = e.created_by
  WHERE e.status = 'approved'
    AND e.start_time < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM event_attendance ea 
      WHERE ea.event_id = e.id AND ea.user_id = v_user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM point_appeal pa 
      WHERE pa.event_id = e.id AND pa.user_id = v_user_id
    );

  v_appealable_events := COALESCE(v_appealable_events, '[]'::json);

  -- 8. Build final result
  v_result := json_build_object(
    'profile', json_build_object(
      'user_id', v_profile.user_id,
      'email', v_profile.email,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'majors', v_profile.majors,
      'minors', v_profile.minors,
      'house_membership', v_profile.house_membership,
      'race', v_profile.race,
      'pronouns', v_profile.pronouns,
      'living_type', v_profile.living_type,
      'gender', v_profile.gender,
      'sexual_orientation', v_profile.sexual_orientation,
      'expected_graduation', v_profile.expected_graduation,
      'pledge_class', v_profile.pledge_class,
      'role', v_profile.role,
      'approved', v_profile.approved,
      'last_profile_update', v_profile.last_profile_update
    ),
    'events', v_events,
    'analytics', v_analytics,
    'user_appeals', v_user_appeals,
    'appealable_events', v_appealable_events
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_account_dashboard() TO authenticated;
