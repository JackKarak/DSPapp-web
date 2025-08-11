-- Insert test feedback data for analytics
-- Replace the UUIDs below with your actual event IDs and user IDs

-- Test feedback data - replace these UUIDs with actual ones from your database
INSERT INTO public.event_feedback (user_id, event_id, rating, would_attend_again, well_organized, comments) VALUES
('b9868588-2b46-47f2-a80a-2c3339919772', '78b1ccd4-e4c2-4b33-b356-0dee2489a569', 5, true, true, 'Great event! Really enjoyed the content and organization.'),
('b9868588-2b46-47f2-a80a-2c3339919772', 'f8eae4e7-3d95-47b0-bd43-d93946e936a4', 4, true, false, 'Good event but could be better organized next time.'),
('80bfcf31-9839-41c3-97ea-a59cf615b3fe', '78b1ccd4-e4c2-4b33-b356-0dee2489a569', 3, false, true, 'It was okay, but not really my thing.'),
('80bfcf31-9839-41c3-97ea-a59cf615b3fe', 'f8eae4e7-3d95-47b0-bd43-d93946e936a4', 5, true, true, 'Excellent event! Would definitely attend again.');

-- Verify the data was inserted
SELECT * FROM public.event_feedback;
