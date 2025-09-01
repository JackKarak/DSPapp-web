-- Check users table schema to debug the major/majors column issue
-- Run this in Supabase SQL Editor

-- 1. Check all columns in users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. If the column is named 'major' instead of 'majors', rename it:
-- ALTER TABLE users RENAME COLUMN major TO majors;

-- 3. If the column doesn't exist at all, add it:
-- ALTER TABLE users ADD COLUMN majors TEXT;

-- 4. Check brother table too to see what column name it uses:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'brother' 
AND table_schema = 'public'
AND column_name LIKE '%major%'
ORDER BY ordinal_position;
