-- Account Analytics Dashboard RPC
-- Single function call to return ALL account data
-- Eliminates 7 sequential queries → 1 parallel database operation
-- Returns: profile, events (attendance + approved appeals), analytics, achievements, user appeals, appealable events

CREATE OR REPLACE FUNCTION get_account_dashboard(p_user_id UUID)
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
BEGIN
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
  WHERE user_id = p_user_id;

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
    WHERE ea.user_id = p_user_id
    
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
    WHERE pa.user_id = p_user_id
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
        WHEN er.event_id IS NOT NULL THEN (e.point_value * 1.5)  -- Registered + attended = point_value × 1.5
        ELSE e.point_value  -- Just attended = point_value
      END AS points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = p_user_id
    WHERE ea.user_id = p_user_id
    
    UNION
    
    SELECT DISTINCT
      e.id,
      e.start_time,
      e.point_value AS points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = p_user_id
      AND pa.status = 'approved'
  )
  SELECT 
    COALESCE(SUM(points), 0),
    COALESCE(COUNT(DISTINCT id) FILTER (WHERE start_time >= v_this_month), 0),
    COALESCE(COUNT(DISTINCT id) FILTER (WHERE start_time >= v_this_semester), 0)
  INTO v_total_points, v_events_this_month, v_events_this_semester
  FROM event_points;

  -- Attendance rate
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (v_events_this_semester::NUMERIC / COUNT(*)::NUMERIC) * 100
      ELSE 0
    END
  INTO v_attendance_rate
  FROM events
  WHERE status = 'approved'
    AND start_time >= v_this_semester;

  -- Calculate streaks (events within 14 days = consecutive)
  WITH event_dates AS (
    SELECT DISTINCT 
      DATE(e.start_time AT TIME ZONE 'America/New_York') AS event_date
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = p_user_id
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

  -- Rankings in pledge class
  SELECT COUNT(*)
  INTO v_total_in_pledge_class
  FROM users
  WHERE pledge_class = v_profile.pledge_class
    AND approved = true;

  WITH pledge_class_points AS (
    SELECT 
      u.user_id,
      COALESCE(SUM(ep.points), 0) AS total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT
        ea.user_id,
        e.id AS event_id,
        CASE 
          WHEN er.event_id IS NOT NULL THEN (e.point_value * 1.5)
          ELSE e.point_value
        END AS points
      FROM event_attendance ea
      JOIN events e ON e.id = ea.event_id
      LEFT JOIN event_registration er ON er.event_id = ea.event_id AND er.user_id = ea.user_id
      
      UNION
      
      SELECT DISTINCT
        pa.user_id,
        pa.event_id,
        e.point_value AS points
      FROM point_appeal pa
      JOIN events e ON e.id = pa.event_id
      WHERE pa.status = 'approved'
    ) ep ON ep.user_id = u.user_id
    WHERE u.pledge_class = v_profile.pledge_class
      AND u.approved = true
    GROUP BY u.user_id
  )
  SELECT COUNT(*) + 1
  INTO v_rank_in_pledge_class
  FROM pledge_class_points
  WHERE total_points > (
    SELECT total_points 
    FROM pledge_class_points 
    WHERE user_id = p_user_id
  );

  -- Rankings in fraternity
  SELECT COUNT(*)
  INTO v_total_in_fraternity
  FROM users
  WHERE approved = true;

  WITH fraternity_points AS (
    SELECT 
      u.user_id,
      COALESCE(SUM(ep.points), 0) AS total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT
        ea.user_id,
        e.id AS event_id,
        CASE 
          WHEN er.event_id IS NOT NULL THEN (e.point_value * 1.5)
          ELSE e.point_value
        END AS points
      FROM event_attendance ea
      JOIN events e ON e.id = ea.event_id
      LEFT JOIN event_registration er ON er.event_id = ea.event_id AND er.user_id = ea.user_id
      
      UNION
      
      SELECT DISTINCT
        pa.user_id,
        pa.event_id,
        e.point_value AS points
      FROM point_appeal pa
      JOIN events e ON e.id = pa.event_id
      WHERE pa.status = 'approved'
    ) ep ON ep.user_id = u.user_id
    WHERE u.approved = true
    GROUP BY u.user_id
  )
  SELECT COUNT(*) + 1
  INTO v_rank_in_fraternity
  FROM fraternity_points
  WHERE total_points > (
    SELECT total_points 
    FROM fraternity_points 
    WHERE user_id = p_user_id
  );

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

  -- Performance
  IF v_attendance_rate >= 75 THEN v_achievements := array_append(v_achievements, 'punctual_pro'); END IF;
  IF v_attendance_rate >= 100 THEN v_achievements := array_append(v_achievements, 'perfect_semester'); END IF;
  IF v_events_this_month >= 5 THEN v_achievements := array_append(v_achievements, 'monthly_champion'); END IF;

  -- Leadership
  IF v_rank_in_pledge_class <= 3 AND v_total_in_pledge_class > 3 THEN 
    v_achievements := array_append(v_achievements, 'top_3'); 
  END IF;
  
  -- Check event type diversity
  IF (
    SELECT COUNT(DISTINCT e.point_type)
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = p_user_id
  ) >= 3 THEN
    v_achievements := array_append(v_achievements, 'community_leader');
  END IF;

  IF v_events_this_semester >= 15 THEN v_achievements := array_append(v_achievements, 'dedicated_member'); END IF;

  -- Rose Gold achievements
  IF v_total_points >= 1000 AND v_attendance_rate >= 95 AND v_events_this_semester >= 75 THEN
    v_achievements := array_append(v_achievements, 'fraternity_legend');
  END IF;

  IF v_events_this_semester >= 50 AND v_rank_in_pledge_class <= 2 THEN
    v_achievements := array_append(v_achievements, 'mentor_master');
  END IF;

  -- Build analytics JSON
  v_analytics := json_build_object(
    'totalPoints', v_total_points,
    'currentStreak', v_current_streak,
    'longestStreak', v_longest_streak,
    'eventsThisMonth', v_events_this_month,
    'eventsThisSemester', v_events_this_semester,
    'attendanceRate', ROUND(v_attendance_rate, 2),
    'rankInPledgeClass', v_rank_in_pledge_class,
    'totalInPledgeClass', v_total_in_pledge_class,
    'rankInFraternity', v_rank_in_fraternity,
    'totalInFraternity', v_total_in_fraternity,
    'achievements', v_achievements
  );

  -- 5. Get user appeals (only if not pledge)
  IF v_profile.role != 'pledge' THEN
    SELECT json_agg(
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
        'reviewed_by', pa.reviewed_by,
        'reviewer', CASE 
          WHEN r.user_id IS NOT NULL THEN
            json_build_object(
              'user_id', r.user_id,
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
    WHERE pa.user_id = p_user_id;

    v_user_appeals := COALESCE(v_user_appeals, '[]'::json);

    -- 6. Get appealable events (past 30 days, not attended, not appealed, not "No Point")
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
        SELECT event_id FROM event_attendance WHERE user_id = p_user_id
      )
      AND e.id NOT IN (
        SELECT event_id FROM point_appeal WHERE user_id = p_user_id
      );

    v_appealable_events := COALESCE(v_appealable_events, '[]'::json);
  ELSE
    v_user_appeals := '[]'::json;
    v_appealable_events := '[]'::json;
  END IF;

  -- 7. Build final result
  v_result := json_build_object(
    'profile', json_build_object(
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'phone_number', v_profile.phone_number,
      'email', v_profile.email,
      'uid', v_profile.uid,
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
GRANT EXECUTE ON FUNCTION get_account_dashboard(UUID) TO authenticated;
