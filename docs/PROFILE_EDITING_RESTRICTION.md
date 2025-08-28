# Profile Editing Restriction - Weekly Limit

## Overview
This feature restricts users to editing their profile information only once per week. This helps maintain data integrity and prevents frequent changes that might affect analytics and record-keeping.

## How It Works

### Database Changes
- Added `last_profile_update` column to the `users` table
- Column stores timestamp of the last profile update
- Includes index for performance optimization

### Frontend Implementation

#### State Management
- `lastProfileUpdate`: Tracks when the user last updated their profile
- Loaded from database during account data fetch
- Updated when profile is saved

#### Helper Functions
1. **`canEditProfile()`**: Checks if 7+ days have passed since last update
2. **`getNextEditDate()`**: Calculates when user can edit again

#### User Experience
- **Can Edit**: Normal "Edit Profile" button appears
- **Cannot Edit**: 
  - Button is disabled and grayed out
  - Shows message with next available edit date
  - Save profile function shows alert with remaining days

#### Restriction Logic
```javascript
// Check if user can edit (7 days = 1 week)
const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
return daysSinceUpdate >= 7;
```

### Profile Save Process
1. Check if user can edit (weekly restriction)
2. Show alert if restriction applies
3. If allowed, update profile data + `last_profile_update` timestamp
4. Show success message with "next edit in 7 days" notice

### Database Migration
File: `20250828_add_profile_update_tracking.sql`
- Adds `last_profile_update` column
- Creates performance index
- Safe to run on existing data (nullable column)

## Benefits
- **Data Integrity**: Prevents impulsive frequent changes
- **Analytics Stability**: Ensures consistent data for reporting
- **Reduced Load**: Fewer database updates
- **User Accountability**: Encourages thoughtful profile updates

## Future Enhancements
- Officer override capability for special circumstances
- Different restrictions for different fields (e.g., contact info vs demographics)
- Admin dashboard to view edit history
- Email notifications before restriction expires

## Technical Notes
- Uses ISO timestamp format for cross-timezone compatibility
- Graceful handling of users without previous update timestamp
- UI clearly communicates restriction and next available date
- No server-side validation needed (frontend handles restriction logic)
