# Test Bank Upload Feature Fix - October 2025

## Issue
The test bank button in the Account tab wasn't working. It was routing to `/officer/scholarship` instead of opening a modal where users could input:
- `class_code` (e.g., CMSC131, MATH140)
- `file_type` ("Test", "Notes", "Assignment")
- File selection

## Solution
Implemented a complete test bank upload flow using the existing `TestBankModal` component with proper state management and file upload functionality.

---

## Changes Made

### 1. **account.tsx** - Added Modal Integration

#### Imports Added:
```typescript
import { TestBankModal } from '../../components/AccountModals/TestBankModal';
import * as DocumentPicker from 'expo-document-picker';
```

#### State Added:
```typescript
// Test Bank Modal state
const [testBankModalVisible, setTestBankModalVisible] = useState(false);
const [testBankClassCode, setTestBankClassCode] = useState('');
const [testBankFileType, setTestBankFileType] = useState<'test' | 'notes' | 'materials'>('test');
const [testBankSelectedFile, setTestBankSelectedFile] = useState<any>(null);
const [uploadingTestBank, setUploadingTestBank] = useState(false);
```

#### Handlers Added:
1. **`handleOpenTestBankModal()`** - Opens the modal
2. **`handleCloseTestBankModal()`** - Closes modal and resets form
3. **`handlePickTestBankFile()`** - Opens document picker
4. **`handleSubmitTestBank()`** - Uploads file and creates database record

#### Upload Flow:
1. User picks a file using `expo-document-picker`
2. File is uploaded to Supabase Storage at `test-bank/{userId}_{timestamp}.{ext}`
3. Record is inserted into `test_bank` table with:
   - `class_code` (uppercase)
   - `file_type` ('test', 'notes', or 'materials')
   - `file_name`
   - `file_path`
   - `submitted_by` (user ID)
   - `status` ('pending' by default)
4. Success alert shown
5. Account data refreshed to display new submission

#### Modal Component Added:
```tsx
<TestBankModal
  visible={testBankModalVisible}
  onClose={handleCloseTestBankModal}
  onSubmit={handleSubmitTestBank}
  classCode={testBankClassCode}
  fileType={testBankFileType}
  selectedFile={testBankSelectedFile}
  onUpdateClassCode={setTestBankClassCode}
  onUpdateFileType={setTestBankFileType}
  onPickFile={handlePickTestBankFile}
/>
```

---

### 2. **TestBankSection.tsx** - Props Update

#### Changed:
- Removed `useRouter` import (no longer needed)
- Added `onUploadPress` prop to interface
- Changed upload button from `router.push('/officer/scholarship')` to `onUploadPress()`
- Updated display label from "Materials" to "Assignment" for better UX

#### Before:
```tsx
<Pressable onPress={() => router.push('/officer/scholarship' as any)}>
```

#### After:
```tsx
<Pressable onPress={onUploadPress}>
```

#### Label Update:
```typescript
case 'materials':
  return {
    emoji: '📚',
    label: 'Assignment',  // Was "Materials"
    color: '#10b981',
  };
```

---

### 3. **TestBankModal.tsx** - User-Friendly Labels

#### Updated File Type Options:
Changed from simple capitalization to custom labels while maintaining database compatibility:

```typescript
// Before:
{(['test', 'notes', 'materials'] as const).map((type) => (
  // ... displayed as "Test", "Notes", "Materials"
))}

// After:
{[
  { value: 'test', label: 'Test' },
  { value: 'notes', label: 'Notes' },
  { value: 'materials', label: 'Assignment' },  // User-friendly name
].map((type) => (
  // ...
))}
```

This allows the UI to show "Assignment" while the database stores "materials" (maintaining compatibility with existing schema constraints).

---

## File Type Mapping

| Database Value | User Sees | Description |
|---------------|-----------|-------------|
| `test` | Test | Exam materials |
| `notes` | Notes | Class notes |
| `materials` | Assignment | Homework/assignments |

---

## Database Schema (Reference)

```sql
CREATE TABLE public.test_bank (
    id UUID PRIMARY KEY,
    class_code VARCHAR(20) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('test', 'notes', 'materials')),
    file_name TEXT NOT NULL,
    file_path TEXT,
    submitted_by UUID REFERENCES auth.users(id) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    -- ...
);
```

---

## User Flow

### Upload Process:
1. User opens Account tab
2. Expands "Test Bank" section
3. Clicks "Upload New Material" button (purple gradient)
4. Modal opens with form:
   - **Class Code input** (e.g., CMSC131, MATH140)
   - **File Type selector** (Test / Notes / Assignment buttons)
   - **File picker** (Select File button)
5. User fills in class code
6. User selects file type
7. User picks file from device
8. User clicks "Submit"
9. File uploads to Supabase Storage
10. Record created in database with "pending" status
11. Success alert shown
12. Modal closes
13. Submission appears in Test Bank section

### Review Process:
- Submissions show in user's account with status badge (Pending/Approved/Rejected)
- Scholarship chairs review via `/officer/scholarship` page
- Approved submissions earn scholarship points
- Users get notified of approval/rejection

---

## Key Features

✅ **Form Validation:**
- Class code required
- File selection required
- Alerts for missing fields

✅ **File Handling:**
- Works with any file type
- Displays file name and size
- Handles both data URIs and file URIs

✅ **Status Tracking:**
- Pending (yellow badge with ⏳)
- Approved (green badge with ✅)
- Rejected (red badge with ❌)

✅ **User Experience:**
- Clean modal interface
- Clear labels and placeholders
- Info box explaining review process
- Success/error alerts
- Auto-refresh after submission

---

## Testing Checklist

- [ ] Modal opens when clicking "Upload New Material"
- [ ] Class code input works correctly
- [ ] File type buttons are selectable (Test, Notes, Assignment)
- [ ] File picker opens and selects files
- [ ] Submit validation works (prevents empty submissions)
- [ ] File uploads to Supabase Storage
- [ ] Database record created with correct data
- [ ] Success alert displays
- [ ] Modal closes after successful upload
- [ ] New submission appears in Test Bank section
- [ ] Status badges display correctly
- [ ] File info shows (class code, file name, upload date)

---

## Notes

- The database constraint requires 'materials' as the value, so we map "Assignment" → 'materials' in the backend
- Files are stored in Supabase Storage bucket `files` under path `test-bank/`
- Filenames are prefixed with user ID and timestamp for uniqueness
- All submissions default to 'pending' status and require scholarship chair approval
- The upload button uses the purple gradient theme matching the Test Bank section header

---

## Dependencies

- `expo-document-picker` - For file selection (already installed)
- Supabase Storage - For file uploads
- `test_bank` table - For submission records

---

*Fix completed: October 23, 2025*
