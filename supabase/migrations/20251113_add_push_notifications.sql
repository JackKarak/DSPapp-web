-- Migration: Add push notification support to users table
-- Created: 2025-11-13

-- Add push notification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false;

-- Add index for efficient push token lookups
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token) 
WHERE push_token IS NOT NULL;

-- Add index for querying users with notifications enabled
CREATE INDEX IF NOT EXISTS idx_users_push_enabled ON users(push_enabled) 
WHERE push_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN users.push_token IS 'Expo push notification token for the user device';
COMMENT ON COLUMN users.push_enabled IS 'Whether user has enabled push notifications';
