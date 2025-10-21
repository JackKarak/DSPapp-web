-- Points Dashboard RPC
-- Single function call returning user points, category breakdown, leaderboard
-- Eliminates downloading ALL users' data to client

CREATE OR REPLACE FUNCTION get_points_dashboard(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_user_points JSON;
  v_category_points JSON;
  v_leaderboard JSON;
  v_user_rank INT;
  v_user_total_points NUMERIC;
BEGIN
  -- 1. Calculate current user's points by category
  WITH user_events AS (
    SELECT DISTINCT
      e.id,
      e.point_type,
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
      e.point_type,
      e.point_value AS points
    FROM point_appeal pa
    JOIN events e ON e.id = pa.event_id
    WHERE pa.user_id = p_user_id
      AND pa.status = 'approved'
  ),
  category_totals AS (
    SELECT 
      point_type,
      SUM(points) AS total_points
    FROM user_events
    WHERE point_type IS NOT NULL
    GROUP BY point_type
  ),
  user_total AS (
    SELECT COALESCE(SUM(points), 0) AS total
    FROM user_events
  )
  SELECT 
    (SELECT json_object_agg(point_type, COALESCE(total_points, 0)) FROM category_totals),
    (SELECT total FROM user_total)
  INTO v_category_points, v_user_total_points;

  v_category_points := COALESCE(v_category_points, '{}'::json);

  -- 2. Generate leaderboard (top 5) AND calculate user rank (CONSOLIDATED query)
  WITH all_user_points AS (
    SELECT 
      u.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') AS name,
      COALESCE(SUM(ep.points), 0) AS total_points
    FROM users u
    LEFT JOIN (
      SELECT DISTINCT
        ea.user_id,
        e.id AS event_id,
        CASE 
          WHEN er.event_id IS NOT NULL THEN (e.point_value * 1.5)  -- Registered + attended = point_value × 1.5
          ELSE e.point_value  -- Just attended = point_value
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
    GROUP BY u.user_id, u.first_name, u.last_name
  ),
  ranked_users AS (
    SELECT 
      user_id,
      name,
      total_points,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, name ASC) AS rank
    FROM all_user_points
  )
  SELECT 
    (SELECT json_agg(
      json_build_object(
        'name', name,
        'totalPoints', total_points,
        'rank', rank
      ) ORDER BY rank
    ) FROM ranked_users WHERE rank <= 5),
    (SELECT COUNT(*) + 1 FROM all_user_points WHERE total_points > v_user_total_points)
  INTO v_leaderboard, v_user_rank;

  v_leaderboard := COALESCE(v_leaderboard, '[]'::json);

  -- 3. Build user rank object
  SELECT json_build_object(
    'name', COALESCE(u.first_name || ' ' || u.last_name, 'Unknown'),
    'totalPoints', v_user_total_points,
    'rank', v_user_rank
  ) INTO v_user_points
  FROM users u
  WHERE u.user_id = p_user_id;

  -- 4. Build final result
  v_result := json_build_object(
    'categoryPoints', v_category_points,
    'userRank', v_user_points,
    'leaderboard', v_leaderboard
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_points_dashboard(UUID) TO authenticated;
