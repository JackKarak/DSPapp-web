# Point Appeal System Setup Instructions

## Overview
The point appeal system allows brothers to submit appeals for events they attended but didn't receive points for. Admins can review these appeals and either approve them (awarding points) or deny them.

## Database Setup

1. Run the SQL script to create the point appeal table:
   ```bash
   # Execute the create_point_appeal_table.sql file in your Supabase dashboard
   ```

2. The table includes:
   - Row Level Security (RLS) policies
   - Proper foreign key relationships
   - Indexes for performance
   - Unique constraint to prevent duplicate appeals

## Features

### For Brothers:
- **Submit Appeals**: Appeal for events they attended but didn't receive points for
- **View Appeal Status**: See the status of their submitted appeals (pending, approved, denied)
- **Add Evidence**: Optional picture URL submission as evidence
- **Appeal History**: View past appeals and admin responses

### For Admins/Presidents:
- **Review Appeals**: View all submitted appeals with filtering options
- **Approve/Deny**: Make decisions on appeals with optional admin responses
- **Auto Award Points**: When approved, automatically adds user to event_attendance
- **Filter Views**: Filter by status (all, pending, approved, denied)

## File Structure

### Database
- `create_point_appeal_table.sql` - Database table creation script

### Types
- `types/account.ts` - Updated with PointAppeal and PointAppealSubmission types

### Frontend (Brothers)
- `app/(tabs)/account.tsx` - Updated with point appeal submission UI
  - Appeals status section
  - Submit new appeal section
  - Appeal submission modal

### Admin Interface
- `app/president/point-appeals.tsx` - Admin interface for reviewing appeals
  - Filter appeals by status
  - Approve/deny appeals with optional responses
  - Automatic point awarding on approval

## Usage

### For Brothers:
1. Go to Account tab
2. Scroll to "Point Appeals" section
3. View any existing appeals in "Your Appeals Status"
4. Submit new appeals from "Submit New Appeal" table
5. Fill out appeal reason and optional picture evidence
6. Submit and wait for admin review

### For Admins:
1. Navigate to `/president/point-appeals`
2. View all appeals filtered by status
3. Review appeal details including:
   - User information
   - Event details
   - Appeal reason
   - Picture evidence (if provided)
4. Add optional admin response
5. Approve (awards points automatically) or deny appeals

## Database Policies

The system includes proper RLS policies:
- Users can only view/edit their own appeals
- Only admins/presidents can view all appeals
- Only admins/presidents can approve/deny appeals

## Integration Points

The system integrates with existing:
- User authentication system
- Event management system
- Event attendance tracking
- Admin role management

## Security Features

- Row Level Security on all operations
- Role-based access control
- Unique constraints prevent duplicate appeals
- Audit trail with timestamps and reviewer tracking
