-- Create Test Bank Storage Bucket
-- This migration creates the storage bucket for test bank file uploads

-- Create the test-bank bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-bank', 'test-bank', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
CREATE POLICY IF NOT EXISTS "Members can upload test bank files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'test-bank' 
  AND (storage.foldername(name))[1] = 'submissions'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY IF NOT EXISTS "Members can view own test bank files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'test-bank'
  AND (
    -- User can see their own files
    auth.uid()::text = (storage.foldername(name))[2]
    OR
    -- VP Scholarship can see all files
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND officer_position = 'vp_scholarship'
    )
  )
);

CREATE POLICY IF NOT EXISTS "VP Scholarship can delete test bank files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'test-bank'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid() 
    AND officer_position = 'vp_scholarship'
  )
);
