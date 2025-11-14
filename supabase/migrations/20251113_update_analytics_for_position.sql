-- Update officer analytics function to use position-based tracking
-- This changes from user-based (created_by) to position-based (created_by_position)

CREATE OR REPLACE FUNCTION get_officer_analytics_dashboard(
  p_officer_position TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_event_ids UUID[];
  v_regular_user_ids UUID[];
  v_regular_user_count INT;
BEGIN
  -- Get all regular users (non-officers, non-admins)
  SELECT ARRAY_AGG(user_id), COUNT(*)
  INTO v_regular_user_ids, v_regular_user_count
  FROM users
  WHERE officer_position IS NULL
    AND role != 'admin';

  -- Get all approved events created by this POSITION (not just current officer)
  SELECT ARRAY_AGG(id)
  INTO v_event_ids
  FROM events
  WHERE status = 'approved'
    AND created_by_position = p_officer_position;

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
          SELECT json_object_agg(event_id, count)
          FROM (
            SELECT 
              event_id, 
              COUNT(DISTINCT user_id)::INT as count
            FROM (
              -- Regular attendance
              SELECT event_id, user_id FROM event_attendance WHERE event_id = ANY(v_event_ids)
              UNION
              -- Approved appeals count as attendance
              SELECT event_id, user_id FROM point_appeal 
              WHERE event_id = ANY(v_event_ids) 
                AND status = 'approved'
            ) combined
            GROUP BY event_id
          ) ea
        ),
        'unique_attendees', (
          SELECT COUNT(DISTINCT user_id)::INT
          FROM (
            SELECT user_id FROM event_attendance WHERE event_id = ANY(v_event_ids)
            UNION
            SELECT user_id FROM point_appeal WHERE event_id = ANY(v_event_ids) AND status = 'approved'
          ) combined
        ),
        'total_attendances', (
          SELECT COUNT(DISTINCT (event_id, user_id))::INT
          FROM (
            SELECT event_id, user_id FROM event_attendance WHERE event_id = ANY(v_event_ids)
            UNION
            SELECT event_id, user_id FROM point_appeal WHERE event_id = ANY(v_event_ids) AND status = 'approved'
          ) combined
        )
      )
    ),
    
    -- User Demographics (breaking down who attended)
    'user_demographics', (
      SELECT json_build_object(
        'total', v_regular_user_count,
        'by_pledge_class', (
          SELECT json_object_agg(pledge_class, count)
          FROM (
            SELECT 
              COALESCE(pledge_class, 'Unknown') as pledge_class,
              COUNT(*)::INT as count
            FROM users
            WHERE user_id = ANY(v_regular_user_ids)
            GROUP BY pledge_class
          ) pc
        ),
        'by_majors', (
          SELECT json_object_agg(majors, count)
          FROM (
            SELECT 
              COALESCE(majors, 'Unknown') as majors,
              COUNT(*)::INT as count
            FROM users
            WHERE user_id = ANY(v_regular_user_ids)
            GROUP BY majors
            ORDER BY count DESC
            LIMIT 10
          ) m
        ),
        'by_expected_graduation', (
          SELECT json_object_agg(graduation_year, count)
          FROM (
            SELECT 
              COALESCE(expected_graduation::TEXT, 'Unknown') as graduation_year,
              COUNT(*)::INT as count
            FROM users
            WHERE user_id = ANY(v_regular_user_ids)
            GROUP BY expected_graduation
            ORDER BY expected_graduation
          ) eg
        )
      )
    ),
    
    -- Feedback Statistics
    'feedback_stats', (
      SELECT json_build_object(
        'avg_rating', COALESCE(AVG(rating), 0)::NUMERIC(3,2),
        'would_attend_again_pct', COALESCE(
          (COUNT(*) FILTER (WHERE would_attend_again = true)::FLOAT / NULLIF(COUNT(*), 0) * 100), 
          0
        )::NUMERIC(5,2),
        'well_organized_pct', COALESCE(
          (COUNT(*) FILTER (WHERE well_organized = true)::FLOAT / NULLIF(COUNT(*), 0) * 100), 
          0
        )::NUMERIC(5,2),
        'recent_comments', (
          SELECT json_agg(
            json_build_object(
              'rating', rating,
              'comments', comments,
              'created_at', created_at,
              'event_id', event_id
            )
            ORDER BY created_at DESC
          )
          FROM (
            SELECT rating, comments, created_at, event_id
            FROM event_feedback
            WHERE event_id = ANY(v_event_ids)
              AND comments IS NOT NULL
              AND TRIM(comments) != ''
            ORDER BY created_at DESC
            LIMIT 10
          ) recent
        )
      )
      FROM event_feedback
      WHERE event_id = ANY(v_event_ids)
    ),
    
    -- Individual Events with Details
    'individual_events', (
      SELECT json_agg(
        json_build_object(
          'id', e.id,
          'title', e.title,
          'start_time', e.start_time,
          'location', e.location,
          'point_value', e.point_value,
          'point_type', e.point_type,
          'creator_name', COALESCE(u.first_name || ' ' || u.last_name, 'Unknown'),
          'attendance_count', COALESCE(attendance.count, 0)
        )
        ORDER BY e.start_time DESC
      )
      FROM events e
      LEFT JOIN users u ON e.created_by = u.user_id
      LEFT JOIN (
        SELECT 
          event_id,
          COUNT(DISTINCT user_id)::INT as count
        FROM (
          SELECT event_id, user_id FROM event_attendance WHERE event_id = ANY(v_event_ids)
          UNION
          SELECT event_id, user_id FROM point_appeal WHERE event_id = ANY(v_event_ids) AND status = 'approved'
        ) combined
        GROUP BY event_id
      ) attendance ON e.id = attendance.event_id
      WHERE e.id = ANY(v_event_ids)
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_officer_analytics_dashboard(TEXT) IS 
'Position-based analytics dashboard showing all events created by officers in the specified position, regardless of who currently holds that position. Enables historical continuity across officer transitions.';
