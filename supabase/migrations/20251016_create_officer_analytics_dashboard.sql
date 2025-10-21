-- Create comprehensive officer analytics dashboard function
-- This returns ALL analytics data in a single query with proper database aggregations

CREATE OR REPLACE FUNCTION get_officer_analytics_dashboard(
  p_officer_position TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_officer_ids UUID[];
  v_event_ids UUID[];
  v_regular_user_ids UUID[];
  v_regular_user_count INT;
BEGIN
  -- Get all officers with the specified position
  SELECT ARRAY_AGG(user_id)
  INTO v_officer_ids
  FROM users
  WHERE officer_position = p_officer_position;

  -- Get all regular users (non-officers, non-admins)
  SELECT ARRAY_AGG(user_id), COUNT(*)
  INTO v_regular_user_ids, v_regular_user_count
  FROM users
  WHERE officer_position IS NULL
    AND role != 'admin';

  -- Get all approved events created by officers with this position
  SELECT ARRAY_AGG(id)
  INTO v_event_ids
  FROM events
  WHERE status = 'approved'
    AND created_by = ANY(v_officer_ids);

  -- Build comprehensive analytics result
  SELECT json_build_object(
    'officer_position', p_officer_position,
    'total_regular_users', v_regular_user_count,
    
    -- Event Statistics
    'event_stats', (
      SELECT json_build_object(
        'total', COUNT(*)::INT,
        'upcoming', COUNT(*) FILTER (WHERE start_time > NOW())::INT,
        'by_point_type', (
          SELECT json_object_agg(point_type, count)
          FROM (
            SELECT point_type, COUNT(*)::INT as count
            FROM events
            WHERE id = ANY(v_event_ids)
            GROUP BY point_type
          ) pt
        ),
        'by_month', (
          SELECT json_object_agg(month, count)
          FROM (
            SELECT 
              TO_CHAR(start_time AT TIME ZONE 'America/New_York', 'Mon YYYY') as month,
              COUNT(*)::INT as count
            FROM events
            WHERE id = ANY(v_event_ids)
            GROUP BY TO_CHAR(start_time AT TIME ZONE 'America/New_York', 'Mon YYYY')
            ORDER BY MIN(start_time) DESC
          ) m
        ),
        'attendance_trend', (
          SELECT json_agg(json_build_object('month', month, 'count', count) ORDER BY month_date)
          FROM (
            SELECT 
              TO_CHAR(month_date, 'Mon') as month,
              month_date,
              COALESCE(event_count, 0)::INT as count
            FROM (
              SELECT generate_series(
                DATE_TRUNC('month', NOW() - INTERVAL '5 months'),
                DATE_TRUNC('month', NOW()),
                '1 month'::INTERVAL
              ) as month_date
            ) months
            LEFT JOIN (
              SELECT 
                DATE_TRUNC('month', start_time AT TIME ZONE 'America/New_York') as event_month,
                COUNT(*)::INT as event_count
              FROM events
              WHERE id = ANY(v_event_ids)
              GROUP BY DATE_TRUNC('month', start_time AT TIME ZONE 'America/New_York')
            ) events ON months.month_date = events.event_month
            ORDER BY month_date
          ) trend
        )
      )
      FROM events
      WHERE id = ANY(v_event_ids)
    ),
    
    -- Attendance Statistics (combining event_attendance and approved appeals)
    'attendance_stats', (
      SELECT json_build_object(
        'by_event', (
          SELECT json_object_agg(event_id, attendance_count)
          FROM (
            SELECT 
              event_id,
              COUNT(DISTINCT user_id)::INT as attendance_count
            FROM (
              SELECT event_id, user_id
              FROM event_attendance
              WHERE event_id = ANY(v_event_ids)
                AND user_id = ANY(v_regular_user_ids)
              UNION
              SELECT event_id, user_id
              FROM point_appeal
              WHERE event_id = ANY(v_event_ids)
                AND status = 'approved'
                AND user_id = ANY(v_regular_user_ids)
            ) combined
            GROUP BY event_id
          ) attendance
        ),
        'unique_attendees', (
          SELECT COUNT(DISTINCT user_id)::INT
          FROM (
            SELECT user_id
            FROM event_attendance
            WHERE event_id = ANY(v_event_ids)
              AND user_id = ANY(v_regular_user_ids)
            UNION
            SELECT user_id
            FROM point_appeal
            WHERE event_id = ANY(v_event_ids)
              AND status = 'approved'
              AND user_id = ANY(v_regular_user_ids)
          ) unique_users
        ),
        'total_attendances', (
          SELECT COUNT(*)::INT
          FROM (
            SELECT DISTINCT event_id, user_id
            FROM (
              SELECT event_id, user_id
              FROM event_attendance
              WHERE event_id = ANY(v_event_ids)
                AND user_id = ANY(v_regular_user_ids)
              UNION
              SELECT event_id, user_id
              FROM point_appeal
              WHERE event_id = ANY(v_event_ids)
                AND status = 'approved'
                AND user_id = ANY(v_regular_user_ids)
            ) combined
          ) unique_attendance
        )
      )
    ),
    
    -- User Demographics (attendees only)
    'user_demographics', (
      SELECT json_build_object(
        'total', COUNT(DISTINCT u.user_id)::INT,
        'by_pledge_class', (
          SELECT json_object_agg(pledge_class, count)
          FROM (
            SELECT pledge_class, COUNT(*)::INT as count
            FROM users u
            WHERE u.user_id IN (
              SELECT DISTINCT user_id
              FROM (
                SELECT user_id FROM event_attendance WHERE event_id = ANY(v_event_ids)
                UNION
                SELECT user_id FROM point_appeal WHERE event_id = ANY(v_event_ids) AND status = 'approved'
              ) att
              WHERE user_id = ANY(v_regular_user_ids)
            )
            AND pledge_class IS NOT NULL
            GROUP BY pledge_class
          ) pc
        ),
        'by_majors', (
          SELECT json_object_agg(majors, count)
          FROM (
            SELECT majors, COUNT(*)::INT as count
            FROM users u
            WHERE u.user_id IN (
              SELECT DISTINCT user_id
              FROM (
                SELECT user_id FROM event_attendance WHERE event_id = ANY(v_event_ids)
                UNION
                SELECT user_id FROM point_appeal WHERE event_id = ANY(v_event_ids) AND status = 'approved'
              ) att
              WHERE user_id = ANY(v_regular_user_ids)
            )
            AND majors IS NOT NULL
            GROUP BY majors
          ) m
        ),
        'by_expected_graduation', (
          SELECT json_object_agg(expected_graduation, count)
          FROM (
            SELECT expected_graduation, COUNT(*)::INT as count
            FROM users u
            WHERE u.user_id IN (
              SELECT DISTINCT user_id
              FROM (
                SELECT user_id FROM event_attendance WHERE event_id = ANY(v_event_ids)
                UNION
                SELECT user_id FROM point_appeal WHERE event_id = ANY(v_event_ids) AND status = 'approved'
              ) att
              WHERE user_id = ANY(v_regular_user_ids)
            )
            AND expected_graduation IS NOT NULL
            GROUP BY expected_graduation
          ) eg
        )
      )
      FROM users u
      WHERE u.user_id IN (
        SELECT DISTINCT user_id
        FROM (
          SELECT user_id FROM event_attendance WHERE event_id = ANY(v_event_ids)
          UNION
          SELECT user_id FROM point_appeal WHERE event_id = ANY(v_event_ids) AND status = 'approved'
        ) att
        WHERE user_id = ANY(v_regular_user_ids)
      )
    ),
    
    -- Feedback Statistics
    'feedback_stats', (
      SELECT json_build_object(
        'avg_rating', COALESCE(AVG(rating) FILTER (WHERE rating > 0), 0),
        'would_attend_again_pct', 
          CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE would_attend_again = true)::FLOAT / COUNT(*)) * 100
            ELSE 0
          END,
        'well_organized_pct',
          CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE well_organized = true)::FLOAT / COUNT(*)) * 100
            ELSE 0
          END,
        'recent_comments', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'rating', rating,
              'comments', comments,
              'created_at', created_at,
              'event_id', event_id
            ) ORDER BY created_at DESC
          ), '[]'::json)
          FROM (
            SELECT rating, comments, created_at, event_id
            FROM event_feedback
            WHERE event_id = ANY(v_event_ids)
              AND user_id = ANY(v_regular_user_ids)
              AND comments IS NOT NULL
              AND comments != ''
            ORDER BY created_at DESC
            LIMIT 10
          ) recent
        )
      )
      FROM event_feedback
      WHERE event_id = ANY(v_event_ids)
        AND user_id = ANY(v_regular_user_ids)
    ),
    
    -- Individual Events with Attendance
    'individual_events', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', e.id,
          'title', e.title,
          'start_time', e.start_time,
          'location', COALESCE(e.location, 'TBD'),
          'point_value', e.point_value,
          'point_type', e.point_type,
          'creator_name', COALESCE(u.first_name || ' ' || u.last_name, 'Unknown Officer'),
          'attendance_count', COALESCE(att.count, 0)::INT
        ) ORDER BY e.start_time DESC
      ), '[]'::json)
      FROM events e
      LEFT JOIN users u ON e.created_by = u.user_id
      LEFT JOIN (
        SELECT 
          event_id,
          COUNT(DISTINCT user_id)::INT as count
        FROM (
          SELECT event_id, user_id
          FROM event_attendance
          WHERE event_id = ANY(v_event_ids)
            AND user_id = ANY(v_regular_user_ids)
          UNION
          SELECT event_id, user_id
          FROM point_appeal
          WHERE event_id = ANY(v_event_ids)
            AND status = 'approved'
            AND user_id = ANY(v_regular_user_ids)
        ) combined
        GROUP BY event_id
      ) att ON e.id = att.event_id
      WHERE e.id = ANY(v_event_ids)
    )
    
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_officer_analytics_dashboard(TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_officer_analytics_dashboard IS 
  'Returns comprehensive analytics dashboard data for officers in a single query. 
   Includes event stats, attendance, demographics, feedback, and individual event details.';
