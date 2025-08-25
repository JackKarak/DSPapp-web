-- Test script to check admin_feedback table existence
-- Run this in your Supabase SQL editor

-- Check if admin_feedback table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'admin_feedback'
);

-- If table exists, show its structure
\d public.admin_feedback;

-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'admin_feedback';
