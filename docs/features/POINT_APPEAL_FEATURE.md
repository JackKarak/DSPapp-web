# Point Appeal Feature Implementation - October 2025

## Overview
Implemented a complete point appeal system allowing users to submit appeals for events they attended but didn't receive points for, with evidence (picture URL) and admin review functionality.

---

## Database Schema

### Table: `point_appeal`

```sql
CREATE TABLE public.point_appeal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_id UUID NOT NULL REFERENCES public.events(id),
    appeal_reason TEXT NOT NULL,
    picture_url TEXT,  -- Optional evidence URL
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    admin_response TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, event_id, status)
);
```

### Columns:
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to user submitting appeal |
| `event_id` | UUID | Reference to event being appealed |
| `appeal_reason` | TEXT | User's explanation for why they should receive points |
| `picture_url` | TEXT | Optional URL to evidence photo (Google Drive, Imgur, etc.) |
| `status` | VARCHAR(20) | Appeal status: 'pending', 'approved', or 'denied' |
| `admin_response` | TEXT | Officer's response/notes (optional) |
| `reviewed_by` | UUID | Officer who reviewed the appeal |
| `created_at` | TIMESTAMP | When appeal was submitted |
| `reviewed_at` | TIMESTAMP | When appeal was reviewed |

### Constraints:
- `UNIQUE(user_id, event_id, status)` - Prevents duplicate pending appeals for same event
- `CHECK (status IN ('pending', 'approved', 'denied'))` - Validates status values

---

## Implementation

### 1. **account.tsx** - Added Appeal Modal Integration

#### Imports Added:
```typescript
import { PointAppealModal } from '../../components/AccountModals/PointAppealModal';
```

#### State Added:
```typescript
// Point Appeal Modal state
const [appealModalVisible, setAppealModalVisible] = useState(false);
const [selectedAppealEvent, setSelectedAppealEvent] = useState<any>(null);
const [appealReason, setAppealReason] = useState('');
const [appealPictureUrl, setAppealPictureUrl] = useState('');
const [submittingAppeal, setSubmittingAppeal] = useState(false);
```

#### Handlers Implemented:

##### `handleAppealPress(event)`
- Opens the appeal modal
- Sets the selected event
- Called when user clicks "Appeal" button on an event

##### `handleCloseAppealModal()`
- Closes the modal
- Resets all form fields
- Clears selected event

##### `handleSubmitAppeal()`
- Validates user is authenticated
- Checks for existing pending appeals for the same event
- Inserts appeal record into database with:
  - `user_id` (current user)
  - `event_id` (selected event)
  - `appeal_reason` (user's explanation)
  - `picture_url` (evidence link)
  - `status` ('pending')
  - `created_at` (current timestamp)
- Shows success alert
- Refreshes account data to display new appeal
- Prevents duplicate pending appeals

---

### 2. **PointAppealModal.tsx** - Modal UI Component

#### Features:
- **Event Details Display:**
  - Event title
  - Event date and host
  - Point value

- **Form Fields:**
  - Appeal Reason (multiline text input)
  - Picture URL (URL input with validation)

- **Validation:**
  - Reason required
  - Picture URL required
  - URL format validation (must be valid http/https URL)

- **UI Elements:**
  - Info box explaining review process
  - Cancel button
  - Submit button with loading spinner
  - Disabled state while submitting

---

## User Flow

### Submitting an Appeal:

1. **Navigate to Account Tab**
   - View "Events" or "Appeals" section
   - See events eligible for appeal

2. **Click Appeal Button**
   - Modal opens showing event details
   - Form appears with two fields

3. **Fill Out Form:**
   - **Reason:** Explain why you attended but didn't check in
     - Example: "I was there but forgot to check in with the code"
   - **Picture URL:** Provide link to evidence
     - Upload photo to Google Drive, Imgur, etc.
     - Copy shareable link
     - Paste into field

4. **Submit Appeal**
   - Click "Submit Appeal" button
   - Validation checks run:
     - ✓ Reason is not empty
     - ✓ Picture URL is provided
     - ✓ URL is valid format
     - ✓ No existing pending appeal for this event
   - Appeal is created with 'pending' status

5. **Confirmation**
   - Success alert appears
   - Modal closes
   - Appeal appears in Appeals section with "Pending" badge

### Viewing Appeals:

- **Pending Appeals:** Yellow badge with ⏳ icon
- **Approved Appeals:** Green badge with ✅ icon
- **Denied Appeals:** Red badge with ❌ icon

Each appeal card shows:
- Event title
- Event date
- Appeal reason
- Picture URL (clickable link)
- Status badge
- Submission date
- Admin response (if reviewed)

---

## Officer Review Flow

Officers can review appeals in a dedicated interface (to be implemented in `/officer/appeals`):

1. View all pending appeals
2. See event details, user info, reason, and evidence photo
3. Decide to approve or deny
4. Optionally add admin response message
5. Update appeal status
6. If approved, award points to user

---

## API/Database Operations

### Insert Appeal:
```typescript
const { error } = await supabase
  .from('point_appeal')
  .insert({
    user_id: user.id,
    event_id: selectedEvent.id,
    appeal_reason: reason.trim(),
    picture_url: pictureUrl.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
  });
```

### Check for Existing Appeals:
```typescript
const { data: existingAppeals } = await supabase
  .from('point_appeal')
  .select('id, status')
  .eq('user_id', user.id)
  .eq('event_id', event.id);

const hasPendingAppeal = existingAppeals?.some(
  appeal => appeal.status === 'pending'
);
```

### Fetch User's Appeals (in account dashboard):
```typescript
const { data: appeals } = await supabase
  .from('point_appeal')
  .select(`
    *,
    events(title, start_time, point_value),
    reviewed_by_user:reviewed_by(first_name, last_name)
  `)
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

---

## Security (Row Level Security)

### Policies Created:

1. **Users can view their own appeals**
   ```sql
   CREATE POLICY "Users can view own appeals" ON point_appeals
       FOR SELECT
       USING (auth.uid() = user_id);
   ```

2. **Users can create their own appeals**
   ```sql
   CREATE POLICY "Users can create own appeals" ON point_appeals
       FOR INSERT
       WITH CHECK (auth.uid() = user_id);
   ```

3. **Officers can view all appeals**
   ```sql
   CREATE POLICY "Officers can view all appeals" ON point_appeals
       FOR SELECT
       USING (
           EXISTS (
               SELECT 1 FROM users
               WHERE user_id = auth.uid()
               AND (role = 'admin' OR officer_position IS NOT NULL)
           )
       );
   ```

4. **Officers can update appeals**
   ```sql
   CREATE POLICY "Officers can update appeals" ON point_appeals
       FOR UPDATE
       USING (
           EXISTS (
               SELECT 1 FROM users
               WHERE user_id = auth.uid()
               AND (role = 'admin' OR officer_position IS NOT NULL)
           )
       );
   ```

---

## Validation Rules

### Client-Side:
- ✓ Appeal reason must not be empty
- ✓ Picture URL must not be empty
- ✓ Picture URL must be valid HTTP/HTTPS URL
- ✓ User must be authenticated
- ✓ Event must be selected

### Server-Side (Database):
- ✓ `user_id` must reference valid user
- ✓ `event_id` must reference valid event
- ✓ `appeal_reason` cannot be NULL
- ✓ `status` must be 'pending', 'approved', or 'denied'
- ✓ Only one pending appeal per user per event (UNIQUE constraint)

---

## Error Handling

### Handled Scenarios:
1. **User not authenticated** → Alert: "You must be logged in"
2. **No event selected** → Alert: "No event selected"
3. **Duplicate pending appeal** → Alert: "You already have a pending appeal for this event"
4. **Empty reason** → Alert: "Please provide a reason for your appeal"
5. **Empty picture URL** → Alert: "Please provide a picture URL as evidence"
6. **Invalid URL format** → Alert: "Please provide a valid picture URL (must start with http:// or https://)"
7. **Database error** → Alert: "Failed to submit appeal. Please try again."

---

## Testing Checklist

- [ ] Modal opens when clicking "Appeal" button
- [ ] Event details display correctly in modal
- [ ] Reason text input works
- [ ] Picture URL input works
- [ ] URL validation works (rejects invalid URLs)
- [ ] Empty field validation works
- [ ] Duplicate appeal prevention works
- [ ] Appeal submits successfully
- [ ] Database record created with correct data
- [ ] Success alert displays
- [ ] Modal closes after submission
- [ ] New appeal appears in Appeals section
- [ ] Appeal shows "Pending" status
- [ ] Account data refreshes automatically
- [ ] Cancel button closes modal and resets form

---

## Future Enhancements

### Possible Improvements:
1. **Image Upload** - Instead of URL, allow direct image upload to Supabase Storage
2. **Push Notifications** - Notify users when their appeal is reviewed
3. **Appeal History** - Show timeline of all appeals (approved, denied, pending)
4. **Officer Dashboard** - Dedicated page for reviewing appeals with batch actions
5. **Analytics** - Track appeal approval rates, common reasons, etc.
6. **Templates** - Pre-filled reason templates for common scenarios
7. **Automatic Evidence** - Integration with event photos (if app has photo feature)

---

## Files Modified

1. **`app/(tabs)/account.tsx`**
   - Added PointAppealModal import and state
   - Implemented appeal submission handlers
   - Added modal component to render tree

2. **`components/AccountModals/PointAppealModal.tsx`**
   - Existing modal component (already created)
   - Handles UI and validation

3. **`supabase/migrations/20251023_create_point_appeals_table.sql`**
   - Created table schema
   - Added indexes for performance
   - Implemented RLS policies

---

## Usage Example

```typescript
// User clicks appeal button
<TouchableOpacity onPress={() => handleAppealPress(event)}>
  <Text>Submit Appeal</Text>
</TouchableOpacity>

// Modal appears with form
<PointAppealModal
  visible={appealModalVisible}
  event={selectedAppealEvent}
  onClose={handleCloseAppealModal}
  onSubmit={handleSubmitAppeal}
  appealReason={appealReason}
  appealPictureUrl={appealPictureUrl}
  onUpdateReason={setAppealReason}
  onUpdatePictureUrl={setAppealPictureUrl}
  submitting={submittingAppeal}
/>

// User fills form and submits
// Appeal is created in database
// Success alert shown
// Modal closes
```

---

*Implementation completed: October 23, 2025*
