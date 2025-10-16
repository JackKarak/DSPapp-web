-- Fix the calculate_user_points function to use the same point calculation as client-side
-- Fixed point system: 1 point for attendance/appeal + 0.5 points for registration

CREATE OR REPLACE FUNCTION calculate_user_points(user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  total_points numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH user_events AS (
    -- Get all attended events (attendance + approved appeals combined, deduplicated)
    SELECT DISTINCT
      ea.user_id,
      ea.event_id
    FROM event_attendance ea
    WHERE ea.user_id = ANY(user_ids)
    
    UNION
    
    SELECT DISTINCT
      pa.user_id,
      pa.event_id
    FROM point_appeal pa
    WHERE pa.user_id = ANY(user_ids)
      AND pa.status = 'approved'
  ),
  user_registrations AS (
    -- Get all registrations
    SELECT 
      er.user_id,
      er.event_id
    FROM event_registration er
    WHERE er.user_id = ANY(user_ids)
  ),
  user_points AS (
    -- Calculate points: 1.5 if registered, 1 if not
    SELECT 
      ue.user_id,
      SUM(
        CASE 
          WHEN ur.event_id IS NOT NULL THEN 1.5  -- Registered: 1 + 0.5 bonus
          ELSE 1                                   -- Not registered: 1
        END
      ) as total_points
    FROM user_events ue
    LEFT JOIN user_registrations ur 
      ON ue.user_id = ur.user_id 
      AND ue.event_id = ur.event_id
    GROUP BY ue.user_id
  ),
  all_users AS (
    SELECT unnest(user_ids) as user_id
  )
  SELECT 
    au.user_id,
    COALESCE(up.total_points, 0) as total_points
  FROM all_users au
  LEFT JOIN user_points up ON au.user_id = up.user_id
  ORDER BY total_points DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_user_points(uuid[]) TO authenticated;

COMMENT ON FUNCTION calculate_user_points IS 'Calculates total points for given users using fixed point system: 1 point for attendance/appeal + 0.5 bonus for registration';
