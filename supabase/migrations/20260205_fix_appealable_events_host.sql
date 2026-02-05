-- Fix appealable_events to include host_name from created_by user_id
-- This fixes "Unknown Host" and ensures proper data structure

CREATE OR REPLACE FUNCTION get_account_dashboard()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile json;
  v_events json;
  v_total_points NUMERIC DEFAULT 0;
  v_current_streak INTEGER DEFAULT 0;
  v_longest_streak INTEGER DEFAULT 0;
  v_events_this_month INTEGER DEFAULT 0;
  v_events_this_semester INTEGER DEFAULT 0;
  v_attendance_rate NUMERIC DEFAULT 0;
  v_rank_in_pledge_class INTEGER DEFAULT 0;
  v_total_in_pledge_class INTEGER DEFAULT 0;
  v_rank_in_fraternity INTEGER DEFAULT 0;
  v_total_in_fraternity INTEGER DEFAULT 0;
  v_unlocked_achievements json;
  v_monthly_progress json;
  v_appealable_events json;
  v_user_appeals json;
BEGIN
  -- Get the current user's ID from auth context
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Get user profile
  SELECT json_build_object(
    'user_id', u.user_id,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'email', u.email,
    'phone_number', u.phone_number,
    'uid', u.uid,
    'role', u.role,
    'officer_position', u.officer_position,
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
    'consent_analytics', u.consent_analytics,
    'consent_demographics', u.consent_demographics,
    'consent_academic', u.consent_academic,
    'consent_housing', u.consent_housing
  ) INTO v_profile
  FROM users u
  WHERE u.user_id = v_user_id;

  -- 2. Get user events (events they attended or registered for)
  WITH user_events AS (
    SELECT DISTINCT e.id
    FROM events e
    LEFT JOIN event_attendance ea ON ea.event_id = e.id AND ea.user_id = v_user_id
    LEFT JOIN event_registration er ON er.event_id = e.id AND er.user_id = v_user_id
    WHERE (ea.attended_at IS NOT NULL OR er.event_id IS NOT NULL)
      AND e.start_time < CURRENT_TIMESTAMP
  )
  SELECT COALESCE(json_agg(json_build_object(
    'id', e.id,
    'title', e.title,
    'start_time', e.start_time,
    'end_time', e.end_time,
    'location', e.location,
    'description', e.description,
    'point_type', e.point_type,
    'point_value', e.point_value,
    'attended', EXISTS (
      SELECT 1 FROM event_attendance ea 
      WHERE ea.event_id = e.id 
        AND ea.user_id = v_user_id 
        AND ea.attended_at IS NOT NULL
    ),
    'attended_at', (
      SELECT ea.attended_at 
      FROM event_attendance ea 
      WHERE ea.event_id = e.id AND ea.user_id = v_user_id
      LIMIT 1
    ),
    'registered', EXISTS (
      SELECT 1 FROM event_registration er 
      WHERE er.event_id = e.id AND er.user_id = v_user_id
    )
  )), '[]'::json) INTO v_events
  FROM events e
  WHERE e.id IN (SELECT id FROM user_events);

  -- 3. Calculate total points
  SELECT COALESCE(SUM(e.point_value), 0) INTO v_total_points
  FROM events e
  WHERE EXISTS (
    SELECT 1 FROM event_attendance ea
    WHERE ea.event_id = e.id
      AND ea.user_id = v_user_id
      AND ea.attended_at IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM point_appeal pa
    WHERE pa.event_id = e.id
      AND pa.user_id = v_user_id
      AND pa.status = 'approved'
  );

  -- 4. Calculate streaks
  WITH attendance_dates AS (
    SELECT DISTINCT DATE(ea.attended_at) as attendance_date
    FROM event_attendance ea
    WHERE ea.user_id = v_user_id
      AND ea.attended_at IS NOT NULL
  ),
  streak_groups AS (
    SELECT 
      attendance_date,
      attendance_date - (ROW_NUMBER() OVER (ORDER BY attendance_date))::INTEGER * INTERVAL '1 day' as streak_group
    FROM attendance_dates
  ),
  streak_lengths AS (
    SELECT 
      streak_group,
      COUNT(*) as streak_length,
      MAX(attendance_date) as streak_end
    FROM streak_groups
    GROUP BY streak_group
  )
  SELECT 
    COALESCE(MAX(CASE WHEN streak_end = CURRENT_DATE THEN streak_length ELSE 0 END), 0),
    COALESCE(MAX(streak_length), 0)
  INTO v_current_streak, v_longest_streak
  FROM streak_lengths;

  -- 5. Calculate events this month and semester
  SELECT 
    COUNT(DISTINCT CASE WHEN DATE_TRUNC('month', ea.attended_at) = DATE_TRUNC('month', CURRENT_DATE) THEN ea.event_id END),
    COUNT(DISTINCT CASE WHEN ea.attended_at >= DATE_TRUNC('semester', CURRENT_DATE) THEN ea.event_id END)
  INTO v_events_this_month, v_events_this_semester
  FROM event_attendance ea
  WHERE ea.user_id = v_user_id
    AND ea.attended_at IS NOT NULL;

  -- 6. Calculate attendance rate
  WITH total_events AS (
    SELECT COUNT(*) as total
    FROM events
    WHERE start_time < CURRENT_TIMESTAMP
  ),
  attended_events AS (
    SELECT COUNT(DISTINCT event_id) as attended
    FROM event_attendance
    WHERE user_id = v_user_id
      AND attended_at IS NOT NULL
  )
  SELECT CASE WHEN te.total > 0 THEN (ae.attended::NUMERIC / te.total::NUMERIC * 100) ELSE 0 END
  INTO v_attendance_rate
  FROM total_events te, attended_events ae;

  -- 7. Calculate rankings
  WITH user_pledge_class AS (
    SELECT pledge_class FROM users WHERE user_id = v_user_id
  ),
  pledge_class_points AS (
    SELECT 
      u.user_id,
      COALESCE(SUM(e.point_value), 0) as total_points
    FROM users u
    LEFT JOIN event_attendance ea ON ea.user_id = u.user_id AND ea.attended_at IS NOT NULL
    LEFT JOIN events e ON e.id = ea.event_id
    WHERE u.pledge_class = (SELECT pledge_class FROM user_pledge_class)
    GROUP BY u.user_id
  ),
  all_points AS (
    SELECT 
      u.user_id,
      COALESCE(SUM(e.point_value), 0) as total_points
    FROM users u
    LEFT JOIN event_attendance ea ON ea.user_id = u.user_id AND ea.attended_at IS NOT NULL
    LEFT JOIN events e ON e.id = ea.event_id
    GROUP BY u.user_id
  )
  SELECT 
    (SELECT COUNT(*) + 1 FROM pledge_class_points WHERE total_points > v_total_points),
    (SELECT COUNT(*) FROM pledge_class_points),
    (SELECT COUNT(*) + 1 FROM all_points WHERE total_points > v_total_points),
    (SELECT COUNT(*) FROM all_points)
  INTO v_rank_in_pledge_class, v_total_in_pledge_class, v_rank_in_fraternity, v_total_in_fraternity;

  -- 8. Get achievements
  WITH user_achievement_progress AS (
    SELECT 
      v_total_points as user_points,
      v_events_this_semester as events_this_semester,
      v_events_this_month as events_this_month,
      v_longest_streak as longest_streak
  )
  SELECT json_agg(achievement) INTO v_unlocked_achievements
  FROM (
    SELECT 'first_event' as achievement FROM user_achievement_progress WHERE events_this_semester >= 1
    UNION ALL
    SELECT 'five_events' as achievement FROM user_achievement_progress WHERE events_this_semester >= 5
    UNION ALL
    SELECT 'ten_events' as achievement FROM user_achievement_progress WHERE events_this_semester >= 10
    UNION ALL
    SELECT 'two_dozen' as achievement FROM user_achievement_progress WHERE events_this_semester >= 24
    UNION ALL
    SELECT 'half_century' as achievement FROM user_achievement_progress WHERE events_this_semester >= 50
    UNION ALL
    SELECT 'points_50' as achievement FROM user_achievement_progress WHERE user_points >= 50
    UNION ALL
    SELECT 'points_100' as achievement FROM user_achievement_progress WHERE user_points >= 100
    UNION ALL
    SELECT 'points_250' as achievement FROM user_achievement_progress WHERE user_points >= 250
    UNION ALL
    SELECT 'points_500' as achievement FROM user_achievement_progress WHERE user_points >= 500
    UNION ALL
    SELECT 'monthly_hero' as achievement FROM user_achievement_progress WHERE events_this_month >= 5
  ) unlocked;

  v_unlocked_achievements := COALESCE(v_unlocked_achievements, '[]'::json);

  -- 9. Get appealable events (events user didn't attend but can appeal) - WITH HOST NAME
  SELECT COALESCE(json_agg(json_build_object(
    'id', e.id,
    'title', e.title,
    'start_time', e.start_time,
    'point_type', e.point_type,
    'point_value', e.point_value,
    'is_non_event', e.is_non_event,
    'host_name', COALESCE(u.first_name || ' ' || u.last_name, 'Unknown Host')
  )), '[]'::json) INTO v_appealable_events
  FROM events e
  LEFT JOIN users u ON u.user_id = e.created_by
  WHERE e.start_time < CURRENT_TIMESTAMP
    AND NOT EXISTS (
      SELECT 1 FROM event_attendance ea
      WHERE ea.event_id = e.id 
        AND ea.user_id = v_user_id 
        AND ea.attended_at IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM point_appeal pa
      WHERE pa.event_id = e.id
        AND pa.user_id = v_user_id
    )
  LIMIT 50;

  -- 10. Get user's point appeals
  SELECT COALESCE(json_agg(json_build_object(
    'id', pa.id,
    'event_id', pa.event_id,
    'event_title', (SELECT title FROM events WHERE id = pa.event_id),
    'reason', pa.appeal_reason,
    'picture_url', pa.picture_url,
    'status', pa.status,
    'created_at', pa.created_at,
    'reviewed_at', pa.reviewed_at,
    'reviewed_by', pa.reviewed_by,
    'point_value', (SELECT point_value FROM events WHERE id = pa.event_id)
  )), '[]'::json) INTO v_user_appeals
  FROM point_appeal pa
  WHERE pa.user_id = v_user_id;

  -- 11. Get monthly progress (last 6 months)
  WITH monthly_data AS (
    SELECT 
      DATE_TRUNC('month', e.start_time) as month_date,
      e.point_value,
      e.id as event_id
    FROM events e
    WHERE e.start_time >= CURRENT_DATE - INTERVAL '6 months'
      AND e.start_time < CURRENT_TIMESTAMP
      AND EXISTS (
        SELECT 1 FROM event_attendance ea
        WHERE ea.event_id = e.id
          AND ea.user_id = v_user_id
          AND ea.attended_at IS NOT NULL
      )
  ),
  monthly_summary AS (
    SELECT 
      month_date,
      TO_CHAR(month_date, 'Mon') as month,
      COALESCE(SUM(point_value), 0) as points,
      COUNT(DISTINCT event_id) as events
    FROM monthly_data
    GROUP BY month_date
  )
  SELECT COALESCE(json_agg(json_build_object(
    'month', month,
    'points', points,
    'events', events
  )), '[]'::json) INTO v_monthly_progress
  FROM monthly_summary;

  -- Return combined result
  RETURN json_build_object(
    'profile', v_profile,
    'events', v_events,
    'analytics', json_build_object(
      'totalPoints', v_total_points,
      'currentStreak', v_current_streak,
      'longestStreak', v_longest_streak,
      'eventsThisMonth', v_events_this_month,
      'eventsThisSemester', v_events_this_semester,
      'attendanceRate', ROUND(v_attendance_rate, 1),
      'rankInPledgeClass', v_rank_in_pledge_class,
      'totalInPledgeClass', v_total_in_pledge_class,
      'rankInFraternity', v_rank_in_fraternity,
      'totalInFraternity', v_total_in_fraternity,
      'achievements', v_unlocked_achievements,
      'monthlyProgress', v_monthly_progress
    ),
    'appealable_events', v_appealable_events,
    'user_appeals', v_user_appeals
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_dashboard() TO authenticated;

COMMENT ON FUNCTION get_account_dashboard() IS 'Returns account dashboard data with host_name in appealable_events. Each event attendance or approved appeal awards the event point_value.';
