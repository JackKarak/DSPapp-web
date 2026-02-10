-- Complete rewrite of get_account_dashboard function
-- Simple, straightforward approach without complex JOINs

DROP FUNCTION IF EXISTS get_account_dashboard() CASCADE;

CREATE OR REPLACE FUNCTION get_account_dashboard()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();
  
  SELECT json_build_object(
    'profile', (
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
      )
      FROM users WHERE user_id = v_user_id
    ),
    'events', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'title', title,
        'start_time', start_time,
        'end_time', end_time,
        'location', location,
        'description', description,
        'point_type', point_type,
        'point_value', point_value,
        'attended', attended,
        'attended_at', attended_at,
        'registered', registered
      ) ORDER BY start_time DESC), '[]'::json)
      FROM (
        SELECT DISTINCT
          e.id,
          e.title,
          e.start_time,
          e.end_time,
          e.location,
          e.description,
          e.point_type,
          e.point_value,
          EXISTS (SELECT 1 FROM event_attendance WHERE event_id = e.id AND user_id = v_user_id AND attended_at IS NOT NULL) as attended,
          (SELECT attended_at FROM event_attendance WHERE event_id = e.id AND user_id = v_user_id LIMIT 1) as attended_at,
          EXISTS (SELECT 1 FROM event_registration WHERE event_id = e.id AND user_id = v_user_id) as registered
        FROM events e
        WHERE EXISTS (SELECT 1 FROM event_attendance WHERE event_id = e.id AND user_id = v_user_id)
           OR EXISTS (SELECT 1 FROM point_appeal WHERE event_id = e.id AND user_id = v_user_id AND status = 'approved')
      ) user_events
    ),
    'analytics', (
      SELECT json_build_object(
        'totalPoints', (
          SELECT COALESCE(SUM(point_value), 0)
          FROM events
          WHERE id IN (
            SELECT event_id FROM event_attendance WHERE user_id = v_user_id AND attended_at IS NOT NULL
            UNION
            SELECT event_id FROM point_appeal WHERE user_id = v_user_id AND status = 'approved'
          )
        ),
        'currentStreak', 0,
        'longestStreak', 0,
        'eventsThisMonth', (
          SELECT COUNT(DISTINCT e.id)
          FROM events e
          WHERE EXISTS (
            SELECT 1 FROM event_attendance ea
            WHERE ea.event_id = e.id
              AND ea.user_id = v_user_id
              AND ea.attended_at IS NOT NULL
          )
            AND e.start_time >= DATE_TRUNC('month', CURRENT_DATE)
        ),
        'eventsThisSemester', (
          SELECT COUNT(DISTINCT e.id)
          FROM events e
          WHERE EXISTS (
            SELECT 1 FROM event_attendance ea
            WHERE ea.event_id = e.id
              AND ea.user_id = v_user_id
              AND ea.attended_at IS NOT NULL
          )
            AND e.start_time >= (
              CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8 
              THEN DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '7 months'
              ELSE DATE_TRUNC('year', CURRENT_DATE)
              END
            )
        ),
        'attendanceRate', (
          SELECT CASE 
            WHEN (SELECT COUNT(*) FROM events WHERE start_time <= CURRENT_TIMESTAMP) > 0
            THEN (SELECT COUNT(DISTINCT event_id)::NUMERIC FROM event_attendance WHERE user_id = v_user_id AND attended_at IS NOT NULL) / 
                 (SELECT COUNT(*)::NUMERIC FROM events WHERE start_time <= CURRENT_TIMESTAMP) * 100
            ELSE 0
          END
        ),
        'rankInPledgeClass', (
          SELECT COUNT(*) + 1
          FROM users u
          WHERE u.pledge_class = (SELECT pledge_class FROM users WHERE user_id = v_user_id)
            AND u.approved = true
            AND (
              SELECT COALESCE(SUM(e.point_value), 0)
              FROM events e
              WHERE e.id IN (
                SELECT event_id FROM event_attendance WHERE user_id = u.user_id AND attended_at IS NOT NULL
                UNION
                SELECT event_id FROM point_appeal WHERE user_id = u.user_id AND status = 'approved'
              )
            ) > (
              SELECT COALESCE(SUM(point_value), 0)
              FROM events
              WHERE id IN (
                SELECT event_id FROM event_attendance WHERE user_id = v_user_id AND attended_at IS NOT NULL
                UNION
                SELECT event_id FROM point_appeal WHERE user_id = v_user_id AND status = 'approved'
              )
            )
        ),
        'totalInPledgeClass', (
          SELECT COUNT(*)
          FROM users
          WHERE pledge_class = (SELECT pledge_class FROM users WHERE user_id = v_user_id)
            AND approved = true
        ),
        'rankInFraternity', (
          SELECT COUNT(*) + 1
          FROM users u
          WHERE u.approved = true
            AND (
              SELECT COALESCE(SUM(e.point_value), 0)
              FROM events e
              WHERE e.id IN (
                SELECT event_id FROM event_attendance WHERE user_id = u.user_id AND attended_at IS NOT NULL
                UNION
                SELECT event_id FROM point_appeal WHERE user_id = u.user_id AND status = 'approved'
              )
            ) > (
              SELECT COALESCE(SUM(point_value), 0)
              FROM events
              WHERE id IN (
                SELECT event_id FROM event_attendance WHERE user_id = v_user_id AND attended_at IS NOT NULL
                UNION
                SELECT event_id FROM point_appeal WHERE user_id = v_user_id AND status = 'approved'
              )
            )
        ),
        'totalInFraternity', (
          SELECT COUNT(*)
          FROM users
          WHERE approved = true
        ),
        'achievements', '[]'::json,
        'monthlyProgress', '[]'::json
      )
    ),
    'user_appeals', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', pa.id,
        'event_id', pa.event_id,
        'event_title', (SELECT title FROM events WHERE id = pa.event_id),
        'appeal_reason', pa.appeal_reason,
        'picture_url', pa.picture_url,
        'status', pa.status,
        'created_at', pa.created_at,
        'reviewed_at', pa.reviewed_at,
        'reviewed_by', pa.reviewed_by,
        'admin_response', pa.admin_response,
        'point_value', (SELECT point_value FROM events WHERE id = pa.event_id)
      ) ORDER BY pa.created_at DESC), '[]'::json)
      FROM point_appeal pa
      WHERE pa.user_id = v_user_id
    ),
    'appealable_events', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'title', title,
        'start_time', start_time,
        'point_type', point_type,
        'point_value', point_value
      ) ORDER BY start_time DESC), '[]'::json)
      FROM (
        SELECT id, title, start_time, point_type, point_value
        FROM events
        WHERE start_time < CURRENT_TIMESTAMP
          AND id NOT IN (SELECT event_id FROM event_attendance WHERE user_id = v_user_id AND attended_at IS NOT NULL)
          AND id NOT IN (SELECT event_id FROM point_appeal WHERE user_id = v_user_id)
        LIMIT 50
      ) appealable
    )
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Dashboard error: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_dashboard() TO authenticated;

COMMENT ON FUNCTION get_account_dashboard() IS 'Simple account dashboard - returns basic data without complex calculations';
