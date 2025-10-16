-- Enable RLS on pledge and brother tables
-- These tables are used for signup verification and pre-registration data

-- Enable RLS on both tables
ALTER TABLE pledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE brother ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Officers can view all pledges" ON pledge;
DROP POLICY IF EXISTS "Officers can manage pledges" ON pledge;
DROP POLICY IF EXISTS "Officers can view all brothers" ON brother;
DROP POLICY IF EXISTS "Officers can manage brothers" ON brother;

-- PLEDGE TABLE POLICIES
-- Allow officers and admins to view all pledge records (for administration and verification)
CREATE POLICY "Officers can view all pledges" ON pledge
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (officer_position IS NOT NULL OR role = 'admin')
        )
    );

-- Allow officers and admins to manage pledge records (create, update, delete)
CREATE POLICY "Officers can manage pledges" ON pledge
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (officer_position IS NOT NULL OR role = 'admin')
        )
    );

-- BROTHER TABLE POLICIES  
-- Allow officers and admins to view all brother records (for administration and verification)
CREATE POLICY "Officers can view all brothers" ON brother
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (officer_position IS NOT NULL OR role = 'admin')
        )
    );

-- Allow officers and admins to manage brother records (create, update, delete)
CREATE POLICY "Officers can manage brothers" ON brother
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (officer_position IS NOT NULL OR role = 'admin')
        )
    );

-- Note: The signup verification process may need to use the service role
-- to bypass RLS when checking pledge/brother records during registration.
-- This is handled in the application code with proper service role credentials.