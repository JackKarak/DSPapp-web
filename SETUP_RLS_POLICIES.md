# RLS Policies Setup Guide

## Problem
Brothers cannot insert records into `event_attendance` table due to missing Row Level Security (RLS) policies.

## Solution
Apply the following RLS policies to your Supabase database:

### 1. Go to your Supabase Dashboard
- Open https://app.supabase.com/project/brjmujpjbmzhjepxamek
- Navigate to "SQL Editor" in the left sidebar

### 2. Run the following SQL script:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_bank ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Approved users can view other approved users" ON users;
DROP POLICY IF EXISTS "Everyone can view approved events" ON events;
DROP POLICY IF EXISTS "Officers can manage events" ON events;
DROP POLICY IF EXISTS "Users can view their own attendance" ON event_attendance;
DROP POLICY IF EXISTS "Users can record their own attendance" ON event_attendance;
DROP POLICY IF EXISTS "Officers can view all attendance" ON event_attendance;
DROP POLICY IF EXISTS "Officers can record attendance for others" ON event_attendance;
DROP POLICY IF EXISTS "Users can submit their own feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON admin_feedback;
DROP POLICY IF EXISTS "Users can submit to test bank" ON test_bank;
DROP POLICY IF EXISTS "Users can view their own test bank submissions" ON test_bank;
DROP POLICY IF EXISTS "Officers can view test bank submissions" ON test_bank;
DROP POLICY IF EXISTS "Officers can update test bank status" ON test_bank;

-- USERS TABLE POLICIES
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = user_id::uuid);

CREATE POLICY "Approved users can view other approved users" ON users
    FOR SELECT USING (
        approved = true AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id::uuid = auth.uid() AND approved = true
        )
    );

-- EVENTS TABLE POLICIES
CREATE POLICY "Everyone can view approved events" ON events
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Officers can manage events" ON events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id::uuid = auth.uid() 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- EVENT_ATTENDANCE TABLE POLICIES (CRITICAL FOR ATTENDANCE FUNCTIONALITY)
CREATE POLICY "Users can view their own attendance" ON event_attendance
    FOR SELECT USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can record their own attendance" ON event_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Officers can view all attendance" ON event_attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id::uuid = auth.uid() 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

CREATE POLICY "Officers can record attendance for others" ON event_attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id::uuid = auth.uid() 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- ADMIN_FEEDBACK TABLE POLICIES
CREATE POLICY "Users can submit their own feedback" ON admin_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can view their own feedback" ON admin_feedback
    FOR SELECT USING (auth.uid() = user_id::uuid);

CREATE POLICY "Officers can view all feedback" ON admin_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id::uuid = auth.uid() 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

-- TEST_BANK TABLE POLICIES
CREATE POLICY "Users can submit to test bank" ON test_bank
    FOR INSERT WITH CHECK (auth.uid() = submitted_by::uuid);

CREATE POLICY "Users can view their own test bank submissions" ON test_bank
    FOR SELECT USING (auth.uid() = submitted_by::uuid);

CREATE POLICY "Officers can view test bank submissions" ON test_bank
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id::uuid = auth.uid() 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );

CREATE POLICY "Officers can update test bank status" ON test_bank
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id::uuid = auth.uid() 
            AND approved = true 
            AND officer_position IS NOT NULL
        )
    );
```

### 3. Test the Fix
After applying these policies:
1. Try using the attendance code feature in the app
2. Brothers should now be able to successfully record attendance
3. The enhanced error messages will show detailed information if there are still issues

### 4. Create a Test Event (Optional)
You can create a test event with code 'TEST123' to verify functionality:

```sql
INSERT INTO events (
    id,
    title,
    description,
    start_time,
    end_time,
    location,
    code,
    point_value,
    point_type,
    status,
    created_by,
    created_at
) VALUES (
    gen_random_uuid(),
    'Test Event for Attendance',
    'Testing attendance functionality',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '2 hours',
    'Test Location',
    'TEST123',
    5,
    'general',
    'approved',
    (SELECT user_id FROM users WHERE approved = true AND officer_position IS NOT NULL LIMIT 1),
    NOW()
);
```

## What This Fixes
- ✅ Brothers can now record their own attendance
- ✅ Brothers can view their own attendance history  
- ✅ Officers can manage events and view all attendance
- ✅ Feedback submission works properly
- ✅ Test bank submissions work
- ✅ Enhanced error messages for debugging

## Key Policy
The most important policy for your issue is:
```sql
CREATE POLICY "Users can record their own attendance" ON event_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
```

This allows authenticated users to insert records into `event_attendance` where the `user_id` matches their authentication ID. The `::uuid` cast ensures proper type matching between the UUID returned by `auth.uid()` and the stored `user_id` field.
