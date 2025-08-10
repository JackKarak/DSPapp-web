-- Enable RLS on tables
ALTER TABLE brothers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public read access to brothers table for signup verification
CREATE POLICY "Allow public read access to brothers" ON brothers
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert into users table
CREATE POLICY "Allow authenticated insert to users" ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to read their own data
CREATE POLICY "Allow users to read own data" ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Allow users to update own data" ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id);
