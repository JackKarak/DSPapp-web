-- Point Categories Table
-- Allows VP Operations to dynamically manage point categories

CREATE TABLE IF NOT EXISTS point_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  threshold DECIMAL(10, 2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#330066',
  icon TEXT DEFAULT '⭐',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO point_categories (name, display_name, threshold, color, icon, sort_order) VALUES
  ('brotherhood', 'Brotherhood', 20, '#8B4513', '🤝', 1),
  ('professional', 'Professional', 4, '#1E90FF', '💼', 2),
  ('service', 'Service', 4, '#32CD32', '🤲', 3),
  ('scholarship', 'Scholarship', 4, '#FFD700', '📚', 4),
  ('health', 'Health & Wellness', 3, '#FF69B4', '💪', 5),
  ('fundraising', 'Fundraising', 3, '#9370DB', '💰', 6),
  ('dei', 'DEI', 3, '#20B2AA', '🌈', 7)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE point_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "Anyone can read active categories"
  ON point_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- VP Operations can read all categories (including inactive)
CREATE POLICY "VP Operations can read all categories"
  ON point_categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
        AND role = 'officer'
        AND officer_position = 'vp_operations'
    )
  );

-- Grant permissions
GRANT SELECT ON point_categories TO authenticated;

-- Function to get all active categories
CREATE OR REPLACE FUNCTION get_point_categories()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', id,
        'name', name,
        'display_name', display_name,
        'threshold', threshold,
        'color', color,
        'icon', icon,
        'sort_order', sort_order
      )
      ORDER BY sort_order
    )
    FROM point_categories
    WHERE is_active = true
  );
END;
$$;

-- Function to add a new category
CREATE OR REPLACE FUNCTION add_point_category(
  p_name TEXT,
  p_display_name TEXT,
  p_threshold DECIMAL(10, 2),
  p_color TEXT,
  p_icon TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_user_position TEXT;
  v_new_category JSON;
  v_max_sort_order INTEGER;
BEGIN
  -- Check if user is VP Operations
  SELECT role, officer_position
  INTO v_user_role, v_user_position
  FROM users
  WHERE user_id = auth.uid();

  IF v_user_role != 'officer' OR v_user_position != 'vp_operations' THEN
    RAISE EXCEPTION 'Only VP Operations can add point categories';
  END IF;

  -- Get max sort order
  SELECT COALESCE(MAX(sort_order), 0) + 1
  INTO v_max_sort_order
  FROM point_categories;

  -- Insert new category
  INSERT INTO point_categories (name, display_name, threshold, color, icon, sort_order)
  VALUES (lower(p_name), p_display_name, p_threshold, p_color, p_icon, v_max_sort_order)
  RETURNING json_build_object(
    'id', id,
    'name', name,
    'display_name', display_name,
    'threshold', threshold,
    'color', color,
    'icon', icon,
    'sort_order', sort_order
  )
  INTO v_new_category;

  RETURN v_new_category;
END;
$$;

-- Function to update a category
CREATE OR REPLACE FUNCTION update_point_category(
  p_id UUID,
  p_display_name TEXT,
  p_threshold DECIMAL(10, 2),
  p_color TEXT,
  p_icon TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_user_position TEXT;
  v_updated_category JSON;
BEGIN
  -- Check if user is VP Operations
  SELECT role, officer_position
  INTO v_user_role, v_user_position
  FROM users
  WHERE user_id = auth.uid();

  IF v_user_role != 'officer' OR v_user_position != 'vp_operations' THEN
    RAISE EXCEPTION 'Only VP Operations can update point categories';
  END IF;

  -- Update category
  UPDATE point_categories
  SET 
    display_name = p_display_name,
    threshold = p_threshold,
    color = p_color,
    icon = p_icon,
    updated_at = NOW()
  WHERE id = p_id
  RETURNING json_build_object(
    'id', id,
    'name', name,
    'display_name', display_name,
    'threshold', threshold,
    'color', color,
    'icon', icon,
    'sort_order', sort_order
  )
  INTO v_updated_category;

  IF v_updated_category IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  RETURN v_updated_category;
END;
$$;

-- Function to delete (deactivate) a category
CREATE OR REPLACE FUNCTION delete_point_category(p_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_user_position TEXT;
  v_category_name TEXT;
BEGIN
  -- Check if user is VP Operations
  SELECT role, officer_position
  INTO v_user_role, v_user_position
  FROM users
  WHERE user_id = auth.uid();

  IF v_user_role != 'officer' OR v_user_position != 'vp_operations' THEN
    RAISE EXCEPTION 'Only VP Operations can delete point categories';
  END IF;

  -- Soft delete (deactivate) the category
  UPDATE point_categories
  SET is_active = false, updated_at = NOW()
  WHERE id = p_id
  RETURNING name INTO v_category_name;

  IF v_category_name IS NULL THEN
    RAISE EXCEPTION 'Category not found';
  END IF;

  RETURN json_build_object('success', true, 'category_name', v_category_name);
END;
$$;

-- Function to reorder categories
CREATE OR REPLACE FUNCTION reorder_point_categories(p_category_ids UUID[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_user_position TEXT;
  v_id UUID;
  v_index INTEGER := 1;
BEGIN
  -- Check if user is VP Operations
  SELECT role, officer_position
  INTO v_user_role, v_user_position
  FROM users
  WHERE user_id = auth.uid();

  IF v_user_role != 'officer' OR v_user_position != 'vp_operations' THEN
    RAISE EXCEPTION 'Only VP Operations can reorder point categories';
  END IF;

  -- Update sort order for each category
  FOREACH v_id IN ARRAY p_category_ids
  LOOP
    UPDATE point_categories
    SET sort_order = v_index, updated_at = NOW()
    WHERE id = v_id;
    
    v_index := v_index + 1;
  END LOOP;

  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_point_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION add_point_category(TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_point_category(UUID, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_point_category(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_point_categories(UUID[]) TO authenticated;

COMMENT ON TABLE point_categories IS 'Dynamic point categories that VP Operations can manage';
COMMENT ON FUNCTION get_point_categories() IS 'Returns all active point categories';
COMMENT ON FUNCTION add_point_category IS 'Adds a new point category (VP Operations only)';
COMMENT ON FUNCTION update_point_category IS 'Updates an existing category (VP Operations only)';
COMMENT ON FUNCTION delete_point_category IS 'Deactivates a category (VP Operations only)';
COMMENT ON FUNCTION reorder_point_categories IS 'Updates sort order of categories (VP Operations only)';
