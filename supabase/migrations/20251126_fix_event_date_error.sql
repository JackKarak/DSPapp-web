-- Fix the event_date column error in get_account_dashboard function
-- This recreates the function with the corrected streak calculation
-- Run this in your Supabase SQL Editor

DROP FUNCTION IF EXISTS get_account_dashboard() CASCADE;

CREATE FUNCTION get_account_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile JSON;
  v_analytics JSON;
  v_user_appeals JSON;
  v_events JSON;
  v_appealable_events JSON;
  v_pledge_class_id TEXT;
  v_total_points NUMERIC := 0;
  v_current_streak INT := 0;
  v_longest_streak INT := 0;
  v_events_this_month INT := 0;
  v_events_this_semester INT := 0;
  v_attendance_rate NUMERIC := 0;
  v_rank_in_pledge_class INT := 0;
  v_total_in_pledge_class INT := 0;
  v_rank_in_fraternity INT := 0;
  v_total_in_fraternity INT := 0;
  v_achievements TEXT[];
  v_current_semester_start DATE;
  v_current_semester_end DATE;
BEGIN
  -- SECURITY: Get user ID from JWT, not from parameter
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Get user profile INCLUDING privacy consent fields
  SELECT json_build_object(
    'user_id', u.user_id,
    'uid', u.uid,
    'email', u.email,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'phone_number', u.phone_number,
    'role', u.role,
    'pledge_class', u.pledge_class,
    'majors', u.majors,
    'minors', u.minors,
    'house_membership', u.house_membership,
    'race', u.race,
    'pronouns', u.pronouns,
    'living_type', u.living_type,
    'gender', u.gender,
    'sexual_orientation', u.sexual_orientation,
    'expected_graduation', u.expected_graduation,
    'last_profile_update', u.last_profile_update,
    'approved', u.approved,
    'consent_analytics', COALESCE(u.consent_analytics, false),
    'consent_demographics', COALESCE(u.consent_demographics, false),
    'consent_academic', COALESCE(u.consent_academic, false),
    'consent_housing', COALESCE(u.consent_housing, false),
    'consent_updated_at', u.consent_updated_at,
    'privacy_policy_version', COALESCE(u.privacy_policy_version, '1.0.0')
  )
  INTO v_profile
  FROM users u
  WHERE u.user_id = v_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get pledge class for later use
  SELECT pledge_class INTO v_pledge_class_id FROM users WHERE user_id = v_user_id;

  -- Get current semester dates
  SELECT 
    CASE 
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8 THEN 
        MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 8, 1)
      ELSE 
        MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 1, 1)
    END,
    CASE 
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8 THEN 
        MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 12, 31)
      ELSE 
        MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 7, 31)
    END
  INTO v_current_semester_start, v_current_semester_end;

  -- 2. Calculate total points (1 point for attendance, 0.5 bonus for registration, 1 point for approved appeals)
  WITH user_points AS (
    SELECT DISTINCT
      ea.user_id,
      e.id AS event_id,
      CASE 
        WHEN er.event_id IS NOT NULL THEN 1.5  -- Attended + Registered = 1.5 points
        ELSE 1.0                                -- Just Attended = 1 point
      END AS points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    LEFT JOIN event_registration er ON er.event_id = ea.event_id AND er.user_id = ea.user_id
    WHERE ea.user_id = v_user_id
    
    UNION
    
    SELECT DISTINCT
      pa.user_id,
      pa.event_id,
      1.0 AS points  -- Approved appeal = 1 point
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = v_user_id AND pa.status = 'approved'
  )
  SELECT COALESCE(SUM(points), 0) INTO v_total_points FROM user_points;

  -- 3. Calculate events this month and semester
  SELECT 
    COUNT(*) FILTER (WHERE e.start_time >= DATE_TRUNC('month', CURRENT_DATE)),
    COUNT(*) FILTER (WHERE e.start_time >= v_current_semester_start AND e.start_time <= v_current_semester_end)
  INTO v_events_this_month, v_events_this_semester
  FROM event_attendance ea
  JOIN events e ON e.id = ea.event_id
  WHERE ea.user_id = v_user_id;

  -- 4. Calculate attendance rate
  WITH total_events AS (
    SELECT COUNT(*) as cnt
    FROM events
    WHERE start_time >= v_current_semester_start 
      AND start_time <= v_current_semester_end
      AND status = 'approved'
  ),
  attended_events AS (
    SELECT COUNT(DISTINCT ea.event_id) as cnt
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
      AND e.start_time >= v_current_semester_start
      AND e.start_time <= v_current_semester_end
  )
  SELECT 
    CASE 
      WHEN te.cnt > 0 THEN ROUND((ae.cnt::NUMERIC / te.cnt::NUMERIC) * 100, 1)
      ELSE 0
    END
  INTO v_attendance_rate
  FROM total_events te, attended_events ae;

  -- 5. Calculate streaks (FIXED: use max_date instead of event_date in CASE)
  WITH attendance_dates AS (
    SELECT DISTINCT DATE(e.start_time) as event_date
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = v_user_id
    ORDER BY event_date DESC
  ),
  streaks AS (
    SELECT 
      event_date,
      event_date - (ROW_NUMBER() OVER (ORDER BY event_date))::INT AS streak_group
    FROM attendance_dates
  )
  SELECT 
    COALESCE(MAX(CASE WHEN max_date <= CURRENT_DATE THEN cnt END), 0),
    COALESCE(MAX(cnt), 0)
  INTO v_current_streak, v_longest_streak
  FROM (
    SELECT streak_group, COUNT(*) as cnt, MAX(event_date) as max_date
    FROM streaks
    GROUP BY streak_group
  ) s;

  -- 6. Calculate fraternity ranking using RANK() for proper tie handling
  WITH fraternity_points AS (
    SELECT 
      u.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as name,
      COALESCE(SUM(
        CASE 
          WHEN er.event_id IS NOT NULL THEN 1.5
          ELSE 1.0
        END
      ), 0) + COALESCE((
        SELECT COUNT(*) 
        FROM point_appeal pa2 
        WHERE pa2.user_id = u.user_id AND pa2.status = 'approved'
      ), 0) AS total_points
    FROM users u
    LEFT JOIN event_attendance ea ON ea.user_id = u.user_id
    LEFT JOIN events e ON e.id = ea.event_id
    LEFT JOIN event_registration er ON er.event_id = ea.event_id AND er.user_id = u.user_id
    WHERE u.approved = true
    GROUP BY u.user_id, u.first_name, u.last_name
  ),
  ranked_users AS (
    SELECT
      user_id,
      total_points,
      RANK() OVER (ORDER BY total_points DESC, name ASC) AS rank
    FROM fraternity_points
  )
  SELECT 
    COALESCE(rank, (SELECT COUNT(*) FROM users WHERE approved = true)),
    (SELECT COUNT(*) FROM users WHERE approved = true)
  INTO v_rank_in_fraternity, v_total_in_fraternity
  FROM ranked_users
  WHERE user_id = v_user_id;

  -- 7. Calculate pledge class ranking
  IF v_pledge_class_id IS NOT NULL THEN
    WITH pledge_class_points AS (
      SELECT 
        u.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as name,
        COALESCE(SUM(
          CASE 
            WHEN er.event_id IS NOT NULL THEN 1.5
            ELSE 1.0
          END
        ), 0) + COALESCE((
          SELECT COUNT(*) 
          FROM point_appeal pa2 
          WHERE pa2.user_id = u.user_id AND pa2.status = 'approved'
        ), 0) AS total_points
      FROM users u
      LEFT JOIN event_attendance ea ON ea.user_id = u.user_id
      LEFT JOIN events e ON e.id = ea.event_id
      LEFT JOIN event_registration er ON er.event_id = ea.event_id AND er.user_id = u.user_id
      WHERE u.pledge_class = v_pledge_class_id
      GROUP BY u.user_id, u.first_name, u.last_name
    ),
    ranked_pledge_users AS (
      SELECT
        user_id,
        total_points,
        RANK() OVER (ORDER BY total_points DESC, name ASC) AS rank
      FROM pledge_class_points
    )
    SELECT 
      COALESCE(rank, (SELECT COUNT(*) FROM users WHERE pledge_class = v_pledge_class_id)),
      (SELECT COUNT(*) FROM users WHERE pledge_class = v_pledge_class_id)
    INTO v_rank_in_pledge_class, v_total_in_pledge_class
    FROM ranked_pledge_users
    WHERE user_id = v_user_id;
  END IF;

  -- 8. Calculate achievements
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
  IF v_events_this_semester >= 100 THEN v_achievements := array_append(v_achievements, 'century_club'); END IF;

  -- Rankings
  IF v_rank_in_fraternity <= 5 THEN v_achievements := array_append(v_achievements, 'top_five'); END IF;
  IF v_rank_in_fraternity = 1 THEN v_achievements := array_append(v_achievements, 'mvp'); END IF;
  IF v_rank_in_pledge_class = 1 AND v_total_in_pledge_class > 1 THEN 
    v_achievements := array_append(v_achievements, 'class_leader'); 
  END IF;

  -- Attendance
  IF v_attendance_rate >= 90 THEN v_achievements := array_append(v_achievements, 'perfect_attendance'); END IF;
  IF v_attendance_rate >= 75 THEN v_achievements := array_append(v_achievements, 'dedicated'); END IF;

  -- Build analytics JSON
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
    'achievements', v_achievements
  );

  -- 9. Get user's attended events (from attendance and approved appeals)
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
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'date', date,
      'point_value', point_value,
      'point_type', point_type,
      'host_name', host_name
    ) ORDER BY date DESC
  ), '[]'::json)
  INTO v_events
  FROM user_attended_events;

  -- 10. Get appealable events (past 30 days, not attended, not appealed, not "No Point")
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', e.id,
      'title', e.title,
      'date', e.start_time,
      'point_value', e.point_value,
      'point_type', e.point_type,
      'host_name', COALESCE(u.first_name || ' ' || u.last_name, 'N/A')
    ) ORDER BY e.start_time DESC
  ), '[]'::json)
  INTO v_appealable_events
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

  -- 11. Get user appeals with event details
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', pa.id,
      'event_id', pa.event_id,
      'event', json_build_object(
        'id', e.id,
        'title', e.title,
        'start_time', e.start_time,
        'point_value', e.point_value,
        'point_type', e.point_type
      ),
      'appeal_reason', pa.appeal_reason,
      'picture_url', pa.picture_url,
      'status', pa.status,
      'admin_response', pa.admin_response,
      'created_at', pa.created_at,
      'reviewed_at', pa.reviewed_at
    ) ORDER BY pa.created_at DESC
  ), '[]'::json)
  INTO v_user_appeals
  FROM point_appeal pa
  JOIN events e ON e.id = pa.event_id
  WHERE pa.user_id = v_user_id;

  -- 12. Return complete dashboard
  RETURN json_build_object(
    'profile', v_profile,
    'analytics', v_analytics,
    'user_appeals', v_user_appeals,
    'events', v_events,
    'appealable_events', v_appealable_events
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_account_dashboard() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_account_dashboard() IS 
  'Returns complete account dashboard including profile with privacy consent fields. Uses auth.uid() for security - no parameters needed.';
