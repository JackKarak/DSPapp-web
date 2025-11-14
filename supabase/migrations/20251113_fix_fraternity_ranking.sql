-- Fix fraternity ranking calculation to handle ties and edge cases properly
-- Created: 2025-11-13

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS get_account_dashboard CASCADE;

CREATE FUNCTION get_account_dashboard(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile JSON;
  v_analytics JSON;
  v_user_appeals JSON;
  v_pledge_class_id UUID;
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
  -- Security check
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  -- 1. Get user profile
  SELECT json_build_object(
    'userId', u.user_id,
    'email', u.email,
    'name', u.name,
    'role', u.role,
    'pledgeClassId', u.pledge_class_id,
    'profilePicture', u.profile_picture,
    'major', u.major,
    'graduationYear', u.graduation_year,
    'approved', u.approved,
    'createdAt', u.created_at,
    'pledgeClassName', pc.name,
    'pledgeClassYear', pc.year,
    'pledgeClassSemester', pc.semester
  )
  INTO v_profile
  FROM users u
  LEFT JOIN pledge_classes pc ON pc.id = u.pledge_class_id
  WHERE u.user_id = p_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get pledge class ID for later use
  SELECT pledge_class_id INTO v_pledge_class_id FROM users WHERE user_id = p_user_id;

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

  -- 2. Calculate total points (attendance + approved appeals)
  WITH user_points AS (
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
    WHERE ea.user_id = p_user_id
    
    UNION
    
    SELECT DISTINCT
      pa.user_id,
      pa.event_id,
      e.point_value AS points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = p_user_id AND pa.status = 'approved'
  )
  SELECT COALESCE(SUM(points), 0)
  INTO v_total_points
  FROM user_points;

  -- 3. Calculate current streak and longest streak
  WITH attendance_dates AS (
    SELECT DISTINCT DATE(e.start_time) as event_date
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = p_user_id
    ORDER BY DATE(e.start_time) DESC
  ),
  streak_data AS (
    SELECT 
      event_date,
      event_date - (ROW_NUMBER() OVER (ORDER BY event_date))::INT AS streak_group
    FROM attendance_dates
  ),
  streaks AS (
    SELECT COUNT(*) as streak_length
    FROM streak_data
    GROUP BY streak_group
  )
  SELECT 
    COALESCE(MAX(CASE 
      WHEN ad.event_date >= CURRENT_DATE - INTERVAL '7 days' 
      THEN (SELECT COUNT(*) FROM streak_data WHERE streak_group = (
        SELECT streak_group FROM streak_data WHERE event_date = ad.event_date
      ))
    END), 0),
    COALESCE(MAX(streak_length), 0)
  INTO v_current_streak, v_longest_streak
  FROM attendance_dates ad, streaks;

  -- 4. Events this month
  SELECT COUNT(DISTINCT ea.event_id)
  INTO v_events_this_month
  FROM event_attendance ea
  JOIN events e ON e.id = ea.event_id
  WHERE ea.user_id = p_user_id
    AND DATE_TRUNC('month', e.start_time) = DATE_TRUNC('month', CURRENT_DATE);

  -- 5. Events this semester
  SELECT COUNT(DISTINCT ea.event_id)
  INTO v_events_this_semester
  FROM event_attendance ea
  JOIN events e ON e.id = ea.event_id
  WHERE ea.user_id = p_user_id
    AND e.start_time BETWEEN v_current_semester_start AND v_current_semester_end;

  -- 6. Calculate attendance rate
  WITH total_events AS (
    SELECT COUNT(*) as count
    FROM events
    WHERE start_time < CURRENT_TIMESTAMP
      AND start_time BETWEEN v_current_semester_start AND v_current_semester_end
  ),
  attended_events AS (
    SELECT COUNT(DISTINCT ea.event_id) as count
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.user_id = p_user_id
      AND e.start_time < CURRENT_TIMESTAMP
      AND e.start_time BETWEEN v_current_semester_start AND v_current_semester_end
  )
  SELECT 
    CASE 
      WHEN te.count > 0 THEN (ae.count::NUMERIC / te.count::NUMERIC) * 100
      ELSE 0
    END
  INTO v_attendance_rate
  FROM total_events te, attended_events ae;

  -- Rankings in pledge class
  SELECT COUNT(*)
  INTO v_total_in_pledge_class
  FROM users
  WHERE pledge_class_id = v_pledge_class_id AND approved = true;

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
    WHERE u.pledge_class_id = v_pledge_class_id AND u.approved = true
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

  -- Rankings in fraternity - FIXED VERSION
  SELECT COUNT(*)
  INTO v_total_in_fraternity
  FROM users
  WHERE approved = true;

  WITH fraternity_points AS (
    SELECT 
      u.user_id,
      u.name,
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
    GROUP BY u.user_id, u.name
  ),
  ranked_users AS (
    SELECT 
      user_id,
      total_points,
      RANK() OVER (ORDER BY total_points DESC, name ASC) AS rank
    FROM fraternity_points
  )
  SELECT COALESCE(rank, v_total_in_fraternity)
  INTO v_rank_in_fraternity
  FROM ranked_users
  WHERE user_id = p_user_id;

  -- If user somehow not in ranked_users, set rank to last place
  IF v_rank_in_fraternity IS NULL THEN
    v_rank_in_fraternity := v_total_in_fraternity;
  END IF;

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
  IF (v_profile->>'role')::TEXT != 'pledge' THEN
    SELECT json_agg(
      json_build_object(
        'id', pa.id,
        'eventId', pa.event_id,
        'eventName', e.name,
        'eventDate', e.start_time,
        'reason', pa.reason,
        'status', pa.status,
        'createdAt', pa.created_at,
        'reviewedBy', u.name,
        'reviewedAt', pa.reviewed_at,
        'adminNotes', pa.admin_notes
      )
    )
    INTO v_user_appeals
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    LEFT JOIN users u ON u.user_id = pa.reviewed_by
    WHERE pa.user_id = p_user_id
    ORDER BY pa.created_at DESC;
  END IF;

  -- 6. Return complete dashboard
  RETURN json_build_object(
    'profile', v_profile,
    'analytics', v_analytics,
    'appeals', COALESCE(v_user_appeals, '[]'::json)
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_account_dashboard(UUID) TO authenticated;

COMMENT ON FUNCTION get_account_dashboard IS 'Fixed fraternity ranking to use RANK() function for proper tie handling and edge case management';
