-- Create storage bucket for test bank files
-- Run this in your Supabase SQL editor to enable file uploads

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-bank', 'test-bank', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
CREATE POLICY "Users can upload test bank files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'test-bank' 
  AND (storage.foldername(name))[1] = 'submissions'
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own test bank files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'test-bank'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Officers can view all test bank files
CREATE POLICY "Officers can view all test bank files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'test-bank'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('officer', 'president', 'admin')
  )
);

-- Policy: Officers can delete test bank files
CREATE POLICY "Officers can delete test bank files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'test-bank'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('officer', 'president', 'admin')
  )
);
