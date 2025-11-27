-- Add Privacy Consent Fields to Users Table
-- Created: 2025-11-26
-- Purpose: Store user privacy preferences for GDPR compliance

-- Add columns for privacy consent if they don't exist
DO $$
BEGIN
  -- Analytics consent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'consent_analytics'
  ) THEN
    ALTER TABLE public.users ADD COLUMN consent_analytics BOOLEAN DEFAULT false;
  END IF;

  -- Demographics consent (gender, pronouns, race, sexual orientation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'consent_demographics'
  ) THEN
    ALTER TABLE public.users ADD COLUMN consent_demographics BOOLEAN DEFAULT false;
  END IF;

  -- Academic details consent (majors, minors, graduation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'consent_academic'
  ) THEN
    ALTER TABLE public.users ADD COLUMN consent_academic BOOLEAN DEFAULT false;
  END IF;

  -- Housing consent (living type, house membership)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'consent_housing'
  ) THEN
    ALTER TABLE public.users ADD COLUMN consent_housing BOOLEAN DEFAULT false;
  END IF;

  -- Timestamp when consent was last updated
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'consent_updated_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN consent_updated_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Privacy policy version user consented to
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'privacy_policy_version'
  ) THEN
    ALTER TABLE public.users ADD COLUMN privacy_policy_version VARCHAR(10) DEFAULT '1.0.0';
  END IF;
END $$;

-- Add indexes for privacy queries
CREATE INDEX IF NOT EXISTS idx_users_consent_analytics ON public.users(consent_analytics)
  WHERE consent_analytics = true;

CREATE INDEX IF NOT EXISTS idx_users_consent_updated_at ON public.users(consent_updated_at);

-- Add comments for documentation
COMMENT ON COLUMN public.users.consent_analytics IS 'User consent for aggregated analytics and data analysis';
COMMENT ON COLUMN public.users.consent_demographics IS 'User consent to store demographics (gender, pronouns, race, sexual orientation)';
COMMENT ON COLUMN public.users.consent_academic IS 'User consent to store detailed academic information (majors, minors, graduation)';
COMMENT ON COLUMN public.users.consent_housing IS 'User consent to store housing information (living type, house membership)';
COMMENT ON COLUMN public.users.consent_updated_at IS 'Timestamp when user last updated their privacy preferences';
COMMENT ON COLUMN public.users.privacy_policy_version IS 'Version of privacy policy user consented to';

-- Update existing users to have default consent (false) if null
UPDATE public.users 
SET consent_analytics = COALESCE(consent_analytics, false),
    consent_demographics = COALESCE(consent_demographics, false),
    consent_academic = COALESCE(consent_academic, false),
    consent_housing = COALESCE(consent_housing, false)
WHERE consent_analytics IS NULL 
   OR consent_demographics IS NULL 
   OR consent_academic IS NULL 
   OR consent_housing IS NULL;

-- Add RLS policy for users to update their own consent preferences
-- This is already covered by "Users can update own profile" policy,
-- but we'll explicitly document that consent fields are updateable
COMMENT ON POLICY "Users can update own profile" ON users IS 
  'Users can update their own profile including privacy consent preferences';
