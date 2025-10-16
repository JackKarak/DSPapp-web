-- Create function to calculate user points using database aggregation
-- This dramatically improves performance by moving calculations to the database

CREATE OR REPLACE FUNCTION calculate_user_points(user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  total_points numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH attendance_points AS (
    SELECT 
      ea.user_id,
      COALESCE(SUM(e.point_value), 0) as points
    FROM event_attendance ea
    JOIN events e ON ea.event_id = e.id
    WHERE ea.user_id = ANY(user_ids)
    GROUP BY ea.user_id
  ),
  appeal_points AS (
    SELECT 
      pa.user_id,
      COALESCE(SUM(e.point_value), 0) as points
    FROM point_appeal pa
    JOIN events e ON pa.event_id = e.id
    WHERE pa.user_id = ANY(user_ids)
      AND pa.status = 'approved'
    GROUP BY pa.user_id
  ),
  all_users AS (
    SELECT unnest(user_ids) as user_id
  )
  SELECT 
    au.user_id,
    COALESCE(ap_attendance.points, 0) + COALESCE(ap_appeal.points, 0) as total_points
  FROM all_users au
  LEFT JOIN attendance_points ap_attendance ON au.user_id = ap_attendance.user_id
  LEFT JOIN appeal_points ap_appeal ON au.user_id = ap_appeal.user_id
  ORDER BY total_points DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_user_points(uuid[]) TO authenticated;

COMMENT ON FUNCTION calculate_user_points IS 'Calculates total points for given users from attendance and approved appeals using database aggregation for better performance';
