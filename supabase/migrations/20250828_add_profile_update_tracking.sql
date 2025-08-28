-- Add last_profile_update column to users table for weekly edit restriction
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_last_profile_update ON public.users(last_profile_update);

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.users.last_profile_update IS 'Timestamp of the last profile update. Used to enforce weekly edit restriction.';
