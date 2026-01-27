# VP Operations - Operations Tab

## Overview
The Operations tab is an exclusive feature for VP Operations that provides two key administrative functions:

1. **Point Threshold Management** - Adjust required points for all categories
2. **Officer Position Management** - Assign and manage officer roles

## Features

### 1. Point Threshold Management

#### What it does:
- Allows VP Operations to adjust the required points for each category
- Changes automatically apply to all brothers and pledges
- Provides real-time feedback on unsaved changes

#### Available Categories:
- **Brotherhood** (default: 20 points)
- **Professional** (default: 4 points)
- **Service** (default: 4 points)
- **Scholarship** (default: 4 points)
- **Health** (default: 3 points)
- **Fundraising** (default: 3 points)
- **DEI** (default: 3 points)

#### How to use:
1. Navigate to the Operations tab (visible only to VP Operations)
2. Scroll to the "Point Thresholds" section
3. Adjust the numeric values for any category
4. Click "Save Changes" to apply
5. Click "Reset" to revert to last saved values

#### Database Storage:
- Stored in `point_thresholds` table
- Single row with ID = 1
- Updates tracked with `updated_at` timestamp
- RLS policies ensure only VP Operations can modify

### 2. Officer Position Management

#### What it does:
- View all current officers and their positions
- Assign officer positions to brothers
- Remove officer positions (demote to brother)
- Available for all members except pledges

#### Available Officer Positions:
- President
- VP Operations
- VP Scholarship
- VP Finance
- VP Recruitment
- VP Member Development
- Historian
- Secretary
- Sergeant at Arms

#### How to use:
1. Navigate to the Operations tab
2. Scroll to the "Officer Positions" section
3. View current officers at the top
4. See available members (brothers without positions) below
5. Tap any member to open position selector
6. Choose a position or "None (Brother)" to remove position
7. Click "Update Position" to save changes

#### Automatic Role Management:
- Assigning a position automatically sets role to 'officer'
- Removing a position automatically sets role back to 'brother'
- Changes take effect immediately
- Member list refreshes after each update

## Access Control

### Who can access:
- **Only VP Operations** can view and use this tab
- Tab is hidden from all other officer positions
- Access check performed on screen load

### Security:
- Database RLS policies enforce access control
- Frontend checks user role and position
- Alert shown if unauthorized access attempted

## Database Schema

### point_thresholds table:
```sql
CREATE TABLE point_thresholds (
  id INTEGER PRIMARY KEY DEFAULT 1,
  brotherhood DECIMAL(10, 2) NOT NULL DEFAULT 20,
  professional DECIMAL(10, 2) NOT NULL DEFAULT 4,
  service DECIMAL(10, 2) NOT NULL DEFAULT 4,
  scholarship DECIMAL(10, 2) NOT NULL DEFAULT 4,
  health DECIMAL(10, 2) NOT NULL DEFAULT 3,
  fundraising DECIMAL(10, 2) NOT NULL DEFAULT 3,
  dei DECIMAL(10, 2) NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies:
- **Read**: All authenticated users can view thresholds
- **Update**: Only VP Operations can modify thresholds

## Integration Points

### With Points System:
- Future enhancement: Hook `usePointThresholds` can be integrated into points display
- Categories component can fetch dynamic thresholds
- Database becomes single source of truth

### With Officer Management:
- Changes to officer positions affect:
  - Officer dashboard visibility
  - Tab access permissions
  - Role-based features

## Files Created

### Screen:
- `app/officer/operations.tsx` - Main operations screen

### Database:
- `supabase/migrations/20260119_create_point_thresholds.sql` - Database migration

### Hooks:
- `hooks/points/usePointThresholds.ts` - Hook for fetching dynamic thresholds

### Layout:
- `app/officer/_layout.tsx` - Updated to include operations tab

## Future Enhancements

### Possible additions:
1. **Point Threshold History** - Track changes over time
2. **Batch Officer Updates** - Assign multiple positions at once
3. **Threshold Templates** - Save/load preset configurations
4. **Member Search** - Filter members when assigning positions
5. **Audit Log** - Track who made what changes and when
6. **Dynamic Point Requirements Integration** - Connect to points display screens

## Testing Checklist

- [ ] VP Operations can access operations tab
- [ ] Other officers cannot see operations tab
- [ ] Point thresholds load correctly
- [ ] Point threshold updates save successfully
- [ ] Reset button restores last saved values
- [ ] Officer list displays correctly
- [ ] Position assignment works
- [ ] Position removal works
- [ ] Access denied for non-VP Operations
- [ ] Database RLS policies enforced
- [ ] Refresh functionality works
