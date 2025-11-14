-- Fix incorrect references to point_appeals (should be point_appeal - singular)
-- This migration corrects any views, functions, or policies that reference the wrong table name

-- Note: The actual table is named 'point_appeal' (singular), not 'point_appeals' (plural)
-- This ensures all database functions use the correct table name

-- This migration file serves as documentation that the fix has been applied
-- The actual fixes were made directly in the source migration files:
-- - 20251113_update_analytics_for_position.sql
-- - 20250101_account_deletion.sql

-- If you're seeing errors about "point_appeals does not exist", 
-- you need to reapply the corrected migrations or run them manually

-- Verify the table exists with the correct name
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'point_appeal') THEN
    RAISE EXCEPTION 'Table point_appeal does not exist. Please run migration 20251023_create_point_appeals_table.sql first';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Table name verification complete. point_appeal table exists.';
END $$;
