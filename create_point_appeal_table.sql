-- Create point_appeal table for brothers to appeal missing event points
-- This is PostgreSQL/Supabase syntax

CREATE TABLE point_appeal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    appeal_reason TEXT NOT NULL,
    picture_url TEXT, -- Optional picture submission
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    admin_response TEXT, -- Optional response from admin
    reviewed_by UUID REFERENCES auth.users(id), -- Admin who reviewed the appeal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    
    -- Ensure one appeal per user per event
    UNIQUE(user_id, event_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_point_appeal_user_id ON point_appeal(user_id);
CREATE INDEX idx_point_appeal_event_id ON point_appeal(event_id);
CREATE INDEX idx_point_appeal_status ON point_appeal(status);
CREATE INDEX idx_point_appeal_created_at ON point_appeal(created_at);

-- Add Row Level Security (RLS)
ALTER TABLE point_appeal ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own appeals
CREATE POLICY "Users can view their own appeals" ON point_appeal
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own appeals
CREATE POLICY "Users can create their own appeals" ON point_appeal
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pending appeals
CREATE POLICY "Users can update their own pending appeals" ON point_appeal
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Policy: Admins can view all appeals
CREATE POLICY "Admins can view all appeals" ON point_appeal
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'president')
            AND approved = true
        )
    );

-- Policy: Admins can update all appeals
CREATE POLICY "Admins can update appeals" ON point_appeal
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'president')
            AND approved = true
        )
    );

-- Grant permissions
GRANT ALL ON point_appeal TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE point_appeal IS 'Table for storing point appeals submitted by brothers for missing event attendance';
COMMENT ON COLUMN point_appeal.id IS 'Unique identifier for the appeal';
COMMENT ON COLUMN point_appeal.user_id IS 'ID of the user submitting the appeal';
COMMENT ON COLUMN point_appeal.event_id IS 'ID of the event being appealed for';
COMMENT ON COLUMN point_appeal.appeal_reason IS 'Reason why the user believes they should receive points';
COMMENT ON COLUMN point_appeal.picture_url IS 'Optional URL to uploaded picture as evidence';
COMMENT ON COLUMN point_appeal.status IS 'Current status of the appeal (pending, approved, denied)';
COMMENT ON COLUMN point_appeal.admin_response IS 'Optional response from admin explaining decision';
COMMENT ON COLUMN point_appeal.reviewed_by IS 'ID of admin who reviewed the appeal';
COMMENT ON COLUMN point_appeal.created_at IS 'When the appeal was submitted';
COMMENT ON COLUMN point_appeal.reviewed_at IS 'When the appeal was reviewed by admin';
