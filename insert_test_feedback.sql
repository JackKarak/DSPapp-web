-- Insert test feedback data to verify the admin dashboard works
-- Run this in your Supabase SQL Editor

-- First, let's check if you have any users in the users table
SELECT user_id, first_name, last_name, officer_position, president 
FROM public.users 
LIMIT 5;

-- Insert some test feedback data
-- Replace 'your-user-id-here' with an actual user_id from the query above
INSERT INTO public.admin_feedback (user_id, subject, message, status, submitted_at) VALUES
('ad5cdb0b-c3ba-494a-8831-dc31388c9558', 'Test Feedback 1', 'This is a test feedback message to verify the dashboard works.', 'pending', NOW()),
('ad5cdb0b-c3ba-494a-8831-dc31388c9558', 'App Suggestion', 'It would be great to have push notifications for events.', 'pending', NOW() - INTERVAL '1 day'),
('ad5cdb0b-c3ba-494a-8831-dc31388c9558', 'Bug Report', 'Found an issue with the calendar view on mobile.', 'pending', NOW() - INTERVAL '2 days'),
('ad5cdb0b-c3ba-494a-8831-dc31388c9558', 'Event Feedback', 'Last week event was amazing! Great organization.', 'resolved', NOW() - INTERVAL '3 days');

-- Verify the data was inserted
SELECT id, subject, message, status, submitted_at 
FROM public.admin_feedback 
ORDER BY submitted_at DESC;
