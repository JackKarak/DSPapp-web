-- Simple RLS fix for admin_feedback table
-- Alternative approach: Just make the insert policy more permissive

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can submit their own feedback" ON public.admin_feedback;

-- Create a simple policy that allows any authenticated user to insert
CREATE POLICY "Authenticated users can submit feedback" ON public.admin_feedback
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Keep the select policy as is for viewing own feedback
-- (This policy should already exist and work fine)
