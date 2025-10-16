-- Additional database aggregation functions for analytics and performance optimization
-- These functions move calculations from client-side JavaScript to PostgreSQL for better performance

-- Function to get event attendance statistics
CREATE OR REPLACE FUNCTION get_event_attendance_stats(event_ids uuid[])
RETURNS TABLE (
  event_id uuid,
  attendance_count bigint,
  registration_count bigint,
  average_feedback_rating numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    COUNT(DISTINCT ea.user_id) as attendance_count,
    COUNT(DISTINCT er.user_id) as registration_count,
    ROUND(AVG(ef.rating), 2) as average_feedback_rating
  FROM events e
  LEFT JOIN event_attendance ea ON e.id = ea.event_id
  LEFT JOIN event_registration er ON e.id = er.event_id
  LEFT JOIN event_feedback ef ON e.id = ef.event_id
  WHERE e.id = ANY(event_ids)
  GROUP BY e.id;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_event_attendance_stats(uuid[]) TO authenticated;

-- Function to get user engagement metrics
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(target_user_id uuid)
RETURNS TABLE (
  total_events_attended bigint,
  total_points numeric,
  attendance_rate numeric,
  current_streak integer,
  longest_streak integer,
  events_this_month bigint,
  events_this_semester bigint
) AS $$
DECLARE
  semester_start date;
  month_start date;
BEGIN
  -- Calculate semester start (August 1st of current or previous year)
  semester_start := CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8 
    THEN DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '7 months'
    ELSE DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '5 months'
  END;
  
  month_start := DATE_TRUNC('month', CURRENT_DATE);

  RETURN QUERY
  WITH user_events AS (
    SELECT DISTINCT e.id, e.start_time, e.point_value
    FROM events e
    LEFT JOIN event_attendance ea ON e.id = ea.event_id AND ea.user_id = target_user_id
    LEFT JOIN point_appeal pa ON e.id = pa.event_id AND pa.user_id = target_user_id AND pa.status = 'approved'
    WHERE (ea.user_id IS NOT NULL OR pa.user_id IS NOT NULL)
    ORDER BY e.start_time
  ),
  total_approved_events AS (
    SELECT COUNT(*) as total_count
    FROM events
    WHERE status = 'approved' AND start_time >= semester_start
  )
  SELECT 
    COUNT(ue.id)::bigint as total_events_attended,
    COALESCE(SUM(ue.point_value), 0) as total_points,
    CASE 
      WHEN tae.total_count > 0 
      THEN ROUND((COUNT(CASE WHEN ue.start_time >= semester_start THEN 1 END)::numeric / tae.total_count::numeric) * 100, 2)
      ELSE 0 
    END as attendance_rate,
    0 as current_streak,  -- TODO: Implement streak calculation in SQL
    0 as longest_streak,  -- TODO: Implement streak calculation in SQL
    COUNT(CASE WHEN ue.start_time >= month_start THEN 1 END)::bigint as events_this_month,
    COUNT(CASE WHEN ue.start_time >= semester_start THEN 1 END)::bigint as events_this_semester
  FROM user_events ue
  CROSS JOIN total_approved_events tae
  GROUP BY tae.total_count;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_user_engagement_metrics(uuid) TO authenticated;

-- Function to get officer performance statistics
CREATE OR REPLACE FUNCTION get_officer_performance_stats(officer_user_id uuid)
RETURNS TABLE (
  events_created bigint,
  total_attendees bigint,
  average_attendance numeric,
  average_rating numeric,
  engagement_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH officer_events AS (
    SELECT 
      e.id,
      e.created_by,
      COUNT(DISTINCT ea.user_id) as attendee_count,
      AVG(ef.rating) as avg_rating
    FROM events e
    LEFT JOIN event_attendance ea ON e.id = ea.event_id
    LEFT JOIN event_feedback ef ON e.id = ef.event_id
    WHERE e.created_by = officer_user_id 
      AND e.status = 'approved'
    GROUP BY e.id, e.created_by
  ),
  total_members AS (
    SELECT COUNT(*) as member_count
    FROM users
    WHERE approved = true 
      AND officer_position IS NULL 
      AND role != 'admin'
  )
  SELECT 
    COUNT(oe.id)::bigint as events_created,
    COALESCE(SUM(oe.attendee_count), 0)::bigint as total_attendees,
    ROUND(AVG(oe.attendee_count), 2) as average_attendance,
    ROUND(AVG(oe.avg_rating), 2) as average_rating,
    CASE 
      WHEN tm.member_count > 0 
      THEN ROUND((AVG(oe.attendee_count) / tm.member_count::numeric) * 100, 2)
      ELSE 0 
    END as engagement_rate
  FROM officer_events oe
  CROSS JOIN total_members tm
  GROUP BY tm.member_count;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_officer_performance_stats(uuid) TO authenticated;

-- Function to get leaderboard with rankings
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  total_points numeric,
  rank bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH user_points AS (
    SELECT 
      u.user_id,
      u.first_name,
      u.last_name,
      COALESCE(
        (SELECT SUM(e.point_value) 
         FROM event_attendance ea 
         JOIN events e ON ea.event_id = e.id 
         WHERE ea.user_id = u.user_id), 0
      ) + 
      COALESCE(
        (SELECT SUM(e.point_value) 
         FROM point_appeal pa 
         JOIN events e ON pa.event_id = e.id 
         WHERE pa.user_id = u.user_id AND pa.status = 'approved'), 0
      ) as total_points
    FROM users u
    WHERE u.approved = true
  )
  SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.total_points,
    ROW_NUMBER() OVER (ORDER BY up.total_points DESC) as rank
  FROM user_points up
  ORDER BY up.total_points DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_leaderboard(integer) TO authenticated;

COMMENT ON FUNCTION get_event_attendance_stats IS 'Get attendance and feedback statistics for events using database aggregation';
COMMENT ON FUNCTION get_user_engagement_metrics IS 'Get comprehensive engagement metrics for a user using database calculations';
COMMENT ON FUNCTION get_officer_performance_stats IS 'Get performance statistics for officer events';
COMMENT ON FUNCTION get_leaderboard IS 'Get ranked leaderboard of users by total points';
