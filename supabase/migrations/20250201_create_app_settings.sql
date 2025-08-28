-- Create app_settings table for dynamic app configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read app settings
CREATE POLICY "Allow authenticated users to read app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Only allow officers and admins to modify app settings
CREATE POLICY "Allow officers to modify app settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.event_attendance ea
        JOIN public.events e ON ea.event_id = e.id
        WHERE ea.user_id = auth.uid()
        AND e.event_type ILIKE '%officer%'
    )
    OR
    -- Allow users who created marketing campaigns (marketing officers)
    EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.created_by = auth.uid()
        AND e.event_type ILIKE '%marketing%'
    )
);

-- Insert default newsletter URL if it doesn't exist
INSERT INTO public.app_settings (key, value, description)
VALUES ('newsletter_url', 'https://mailchi.mp/f868da07ca2d/dspatch-feb-21558798?e=bbc0848b47', 'Default newsletter URL for the newsletter tab')
ON CONFLICT (key) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_created_by ON public.app_settings(created_by);
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_by ON public.app_settings(updated_by);
