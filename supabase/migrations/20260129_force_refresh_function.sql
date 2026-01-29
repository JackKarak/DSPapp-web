-- FORCE REFRESH: Drop and recreate get_account_dashboard function
-- This ensures we have the latest version with CTE pattern
-- Run this if diagnostic shows OLD VERSION

-- Drop ALL versions of the function (including any parameter variations)
DROP FUNCTION IF EXISTS get_account_dashboard() CASCADE;
DROP FUNCTION IF EXISTS get_account_dashboard(UUID) CASCADE;

-- Recreate with the correct CTE pattern
CREATE OR REPLACE FUNCTION get_account_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile JSON;
  v_events JSON;
  v_analytics JSON;
  v_user_appeals JSON;
  v_appealable_events JSON;
  v_total_points INTEGER;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_events_this_month INTEGER;
  v_events_this_semester INTEGER;
  v_attendance_rate NUMERIC;
  v_rank_in_pledge_class INTEGER;
  v_total_in_pledge_class INTEGER;
  v_rank_in_fraternity INTEGER;
  v_total_in_fraternity INTEGER;
  v_unlocked_achievements JSON;
  v_monthly_progress JSON;
  v_user_pledge_class TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- 1. Get user profile with consent fields
  SELECT json_build_object(
    'first_name', first_name,
    'last_name', last_name,
    'phone_number', phone_number,
    'email', email,
    'uid', uid,
    'role', role,
    'majors', majors,
    'minors', minors,
    'house_membership', house_membership,
    'race', race,
    'pronouns', pronouns,
    'living_type', living_type,
    'gender', gender,
    'sexual_orientation', sexual_orientation,
    'expected_graduation', expected_graduation,
    'pledge_class', pledge_class,
    'last_profile_update', last_profile_update,
    'approved', approved,
    'consent_analytics', consent_analytics,
    'consent_demographics', consent_demographics,
    'consent_academic', consent_academic,
    'consent_housing', consent_housing
  ) INTO v_profile
  FROM users
  WHERE user_id = v_user_id;

  -- 2. Get user's events (attended or appealed) - USING CTE TO AVOID GROUP BY ERRORS
  WITH user_events AS (
    SELECT DISTINCT e.id
    FROM events e
    WHERE EXISTS (
      SELECT 1 FROM event_attendance ea 
      WHERE ea.event_id = e.id AND ea.user_id = v_user_id
    )
    OR EXISTS (
      SELECT 1 FROM point_appeal pa
      WHERE pa.user_id = v_user_id
        AND pa.event_id = e.id
        AND pa.status = 'approved'
    )
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
  WHERE e.id IN (SELECT id FROM user_events)
  ORDER BY e.start_time DESC;

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
    ORDER BY attendance_date DESC
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
    CASE 
      WHEN MAX(CASE WHEN streak_end = CURRENT_DATE THEN streak_length ELSE 0 END) > 0 
      THEN MAX(CASE WHEN streak_end = CURRENT_DATE THEN streak_length ELSE 0 END)
      ELSE 0 
    END,
    COALESCE(MAX(streak_length), 0)
  INTO v_current_streak, v_longest_streak
  FROM streak_lengths;

  -- 5. Get events this month and semester
  SELECT 
    COUNT(DISTINCT CASE 
      WHEN e.start_time >= DATE_TRUNC('month', CURRENT_DATE) 
      THEN e.id 
    END),
    COUNT(DISTINCT CASE 
      WHEN e.start_time >= DATE_TRUNC('year', CURRENT_DATE) + 
        CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8 
        THEN INTERVAL '7 months' 
        ELSE INTERVAL '-5 months' 
        END
      THEN e.id 
    END)
  INTO v_events_this_month, v_events_this_semester
  FROM events e
  WHERE EXISTS (
    SELECT 1 FROM event_attendance ea
    WHERE ea.event_id = e.id
      AND ea.user_id = v_user_id
      AND ea.attended_at IS NOT NULL
  );

  -- 6. Calculate attendance rate
  WITH total_events AS (
    SELECT COUNT(*) as total FROM events WHERE start_time <= CURRENT_TIMESTAMP
  ),
  attended_events AS (
    SELECT COUNT(DISTINCT ea.event_id) as attended
    FROM event_attendance ea
    WHERE ea.user_id = v_user_id AND ea.attended_at IS NOT NULL
  )
  SELECT 
    CASE 
      WHEN te.total > 0 THEN (ae.attended::NUMERIC / te.total::NUMERIC * 100)
      ELSE 0 
    END
  INTO v_attendance_rate
  FROM total_events te, attended_events ae;

  -- 7. Get rankings
  -- Get user's pledge class
  SELECT pledge_class INTO v_user_pledge_class FROM users WHERE user_id = v_user_id;
  
  -- Calculate pledge class rank and total
  WITH all_user_points AS (
    SELECT 
      ea.user_id,
      SUM(e.point_value) as points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.attended_at IS NOT NULL
    GROUP BY ea.user_id
  ),
  pledge_users AS (
    SELECT u.user_id
    FROM users u
    WHERE u.pledge_class = v_user_pledge_class AND u.approved = true
  ),
  pledge_with_points AS (
    SELECT 
      pu.user_id,
      COALESCE(aup.points, 0) as points
    FROM pledge_users pu
    LEFT JOIN all_user_points aup ON aup.user_id = pu.user_id
  )
  SELECT 
    COALESCE((SELECT COUNT(*) + 1 FROM pledge_with_points WHERE points > (SELECT points FROM pledge_with_points WHERE user_id = v_user_id)), 1),
    COUNT(*)
  INTO v_rank_in_pledge_class, v_total_in_pledge_class
  FROM pledge_with_points;
  
  -- Calculate fraternity rank and total
  WITH all_user_points AS (
    SELECT 
      ea.user_id,
      SUM(e.point_value) as points
    FROM event_attendance ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.attended_at IS NOT NULL
    GROUP BY ea.user_id
  ),
  all_users AS (
    SELECT u.user_id
    FROM users u
    WHERE u.approved = true
  ),
  users_with_points AS (
    SELECT 
      au.user_id,
      COALESCE(aup.points, 0) as points
    FROM all_users au
    LEFT JOIN all_user_points aup ON aup.user_id = au.user_id
  )
  SELECT 
    COALESCE((SELECT COUNT(*) + 1 FROM users_with_points WHERE points > (SELECT points FROM users_with_points WHERE user_id = v_user_id)), 1),
    COUNT(*)
  INTO v_rank_in_fraternity, v_total_in_fraternity
  FROM users_with_points;

  -- 8. Get achievements
  WITH user_achievement_progress AS (
    SELECT 
      v_user_id as user_id,
      v_total_points as user_points,
      v_current_streak as current_streak,
      v_longest_streak as longest_streak,
      v_events_this_month as events_this_month,
      v_events_this_semester as events_this_semester
  )
  SELECT COALESCE(json_agg(achievement), '[]'::json) INTO v_unlocked_achievements
  FROM (
    SELECT 'first_event' as achievement FROM user_achievement_progress WHERE events_this_semester >= 1
    UNION ALL
    SELECT 'five_events' FROM user_achievement_progress WHERE events_this_semester >= 5
    UNION ALL
    SELECT 'ten_events' FROM user_achievement_progress WHERE events_this_semester >= 10
    UNION ALL
    SELECT 'twenty_events' FROM user_achievement_progress WHERE events_this_semester >= 20
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
    UNION ALL
    SELECT 'early_bird' FROM user_achievement_progress WHERE EXISTS (
      SELECT 1 FROM event_registration er
      WHERE er.user_id = v_user_id
        AND er.created_at < (SELECT start_time FROM events WHERE id = er.event_id) - INTERVAL '7 days'
    )
    UNION ALL
    SELECT 'monthly_hero' FROM user_achievement_progress WHERE events_this_month >= 5
  ) unlocked;

  v_unlocked_achievements := COALESCE(v_unlocked_achievements, '[]'::json);

  -- 9. Get appealable events (events user didn't attend but can appeal)
  SELECT COALESCE(json_agg(json_build_object(
    'id', e.id,
    'title', e.title,
    'start_time', e.start_time,
    'point_type', e.point_type,
    'point_value', e.point_value
  ) ORDER BY e.start_time DESC), '[]'::json) INTO v_appealable_events
  FROM events e
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
    'reason', pa.reason,
    'picture_url', pa.picture_url,
    'status', pa.status,
    'created_at', pa.created_at,
    'reviewed_at', pa.reviewed_at,
    'reviewed_by', pa.reviewed_by,
    'admin_notes', pa.admin_notes,
    'point_value', (SELECT point_value FROM events WHERE id = pa.event_id)
  ) ORDER BY pa.created_at DESC), '[]'::json) INTO v_user_appeals
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
      SUM(point_value) as points,
      COUNT(DISTINCT event_id) as events
    FROM monthly_data
    GROUP BY month_date
  )
  SELECT COALESCE(json_agg(json_build_object(
    'month', TO_CHAR(month_date, 'Mon YYYY'),
    'points', points,
    'events', events
  ) ORDER BY month_date DESC), '[]'::json) INTO v_monthly_progress
  FROM monthly_summary;

  -- Build analytics object
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
    'achievements', v_unlocked_achievements,
    'monthlyProgress', v_monthly_progress
  );

  -- Return combined dashboard
  RETURN json_build_object(
    'profile', v_profile,
    'events', v_events,
    'analytics', v_analytics,
    'user_appeals', v_user_appeals,
    'appealable_events', v_appealable_events
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Dashboard error: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_account_dashboard() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_account_dashboard() IS 'Returns account dashboard data. Each event attendance or approved appeal awards the event point_value. Registration tracked but does not award points.';

-- Verify the function was created with CTE pattern
SELECT 
  CASE 
    WHEN pg_get_functiondef(oid)::text LIKE '%WITH user_events AS%' THEN 'SUCCESS: Function has CTE pattern'
    ELSE 'ERROR: Function missing CTE pattern'
  END as verification
FROM pg_proc
WHERE proname = 'get_account_dashboard';
