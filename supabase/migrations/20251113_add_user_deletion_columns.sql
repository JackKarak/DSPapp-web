-- Add columns needed for account deletion tracking
-- These columns support GDPR compliance and soft deletion

-- Add deleted_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
      CHECK (status IN ('active', 'inactive', 'deleted', 'suspended'));
  END IF;
END $$;

-- Create index for deleted users for performance
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Create index for user status
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Update existing users to have active status if null
UPDATE public.users SET status = 'active' WHERE status IS NULL;
