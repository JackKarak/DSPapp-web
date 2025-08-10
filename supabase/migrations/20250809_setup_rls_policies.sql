-- RLS policies for brother and users tables
-- This migration sets up the necessary permissions for the signup flow

-- First, drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous verification of brothers" ON brother;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Officers can view all profiles" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow deletion during signup transfer" ON brother;
DROP POLICY IF EXISTS "Allow email lookup for login" ON users;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON users;

-- Enable RLS on brother table if not already enabled
ALTER TABLE brother ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- BROTHER TABLE POLICIES
-- Allow anonymous users to verify brother information by phone_number and uid
-- This is required for the signup verification process
CREATE POLICY "Allow anonymous verification of brothers" ON brother
    FOR SELECT USING (true);

-- Allow deletion of brother records during signup transfer
-- Only allow deletion if the user is authenticated
CREATE POLICY "Allow deletion during signup transfer" ON brother
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- USERS TABLE POLICIES
-- Allow users to insert their own profile during signup
-- The user_id must match auth.uid() for security
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow anyone to read users table (simplified for now to avoid conflicts)
-- This allows login email lookup and other necessary operations
CREATE POLICY "Allow read access to users" ON users
    FOR SELECT USING (true);
