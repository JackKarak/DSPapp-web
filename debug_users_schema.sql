-- Debug script to check users table schema
-- Run this in Supabase SQL Editor to see the actual column names

-- Check the actual columns in the users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check what data types we have
\d users;
