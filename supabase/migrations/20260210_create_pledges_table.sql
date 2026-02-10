-- ============================================================================
-- Create Pledges Table
-- ============================================================================
-- Migration: 20260210_create_pledges_table
-- Description: Create table for tracking pledges (prospective members)
--              before they are registered as full users.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  uid TEXT,
  dob DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT unique_pledge_email UNIQUE (email)
);

-- Add indexes for performance
CREATE INDEX idx_pledges_email ON pledges(email);
CREATE INDEX idx_pledges_created_by ON pledges(created_by);
CREATE INDEX idx_pledges_created_at ON pledges(created_at DESC);

-- Enable RLS
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;

-- Policy: Officers can view all pledges
CREATE POLICY "officers_view_pledges" ON pledges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('officer', 'admin', 'president')
    )
  );

-- Policy: VP Pledge Ed and admins can insert pledges
CREATE POLICY "vp_pledge_ed_insert_pledges" ON pledges
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND (
        users.role IN ('admin', 'president')
        OR users.officer_position = 'vp_pledge_ed'
      )
    )
  );

-- Policy: VP Pledge Ed and admins can update pledges
CREATE POLICY "vp_pledge_ed_update_pledges" ON pledges
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND (
        users.role IN ('admin', 'president')
        OR users.officer_position = 'vp_pledge_ed'
      )
    )
  );

-- Policy: VP Pledge Ed and admins can delete pledges
CREATE POLICY "vp_pledge_ed_delete_pledges" ON pledges
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()
      AND (
        users.role IN ('admin', 'president')
        OR users.officer_position = 'vp_pledge_ed'
      )
    )
  );

COMMENT ON TABLE pledges IS 'Stores prospective members (pledges) before full registration';
COMMENT ON COLUMN pledges.uid IS 'University ID number';
COMMENT ON COLUMN pledges.dob IS 'Date of birth';
COMMENT ON COLUMN pledges.created_by IS 'Officer who added this pledge';
