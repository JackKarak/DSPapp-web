-- Temporary fix: Disable RLS on admin_feedback table
-- Use this if the other approaches don't work
-- WARNING: This removes all access restrictions, use only for testing

ALTER TABLE public.admin_feedback DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later (once we fix the policies):
-- ALTER TABLE public.admin_feedback ENABLE ROW LEVEL SECURITY;
