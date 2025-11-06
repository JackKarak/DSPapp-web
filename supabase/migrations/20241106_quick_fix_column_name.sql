-- QUICK FIX: Update get_account_dashboard to use correct column name
-- 
-- ERROR: Function was selecting 'pa.officer_comments' but table has 'pa.admin_response'
-- This is a quick patch - just re-run the full migration or run this snippet

-- Drop and recreate the function (this is faster than running the full migration)
DROP FUNCTION IF EXISTS get_account_dashboard();

-- Now re-run the full migration file: 20241106_fix_account_dashboard_security.sql
-- Or just copy and paste that entire file into SQL Editor

-- NOTE: The column name mismatch has been fixed in the migration file.
-- The RPC now correctly selects 'admin_response' instead of 'officer_comments'
