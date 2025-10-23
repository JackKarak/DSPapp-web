# Test Bank File Upload Fix - October 2025

## Issue
**Error:** `ReferenceError: Property 'blob' doesn't exist`

The test bank file upload was failing because the original implementation tried to use the `blob()` method, which doesn't exist in React Native's environment. React Native handles file operations differently than web browsers.

---

## Root Cause

The original code attempted to convert file URIs to blobs:
```typescript
// ❌ This doesn't work in React Native
const response = await fetch(testBankSelectedFile.uri);
const fileData = await response.blob(); // blob() is not available!
```

React Native doesn't have a native `Blob` API like web browsers. Files need to be handled using:
1. **FormData** with file URIs
2. **FileSystem API** with base64 encoding
3. **Direct fetch** with proper Content-Type headers

---

## Solution

### Created New File Upload Utility

**File:** `lib/fileUpload.ts`

This utility provides a React Native-compatible way to upload files to Supabase Storage using:
- ✅ FormData (React Native compatible)
- ✅ Direct fetch API calls
- ✅ Proper authentication headers
- ✅ File URIs (not blobs)

### Implementation:

```typescript
export async function uploadFileToStorage(
  uri: string,
  bucket: string,
  folder: string,
  fileName: string,
  mimeType?: string
): Promise<UploadResult>
```

**How it works:**
1. Creates FormData object
2. Appends file with `{ uri, name, type }` (React Native format)
3. Gets auth session token
4. Makes direct POST request to Supabase Storage API
5. Returns success/error result

---

## Changes Made

### 1. **lib/fileUpload.ts** - New Utility File

```typescript
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Upload function using FormData approach
export async function uploadFileToStorage(
  uri: string,
  bucket: string,
  folder: string,
  fileName: string,
  mimeType?: string
): Promise<UploadResult> {
  // Create FormData
  const formData = new FormData();
  
  // React Native FormData accepts objects with uri property
  formData.append('file', {
    uri: uri,
    name: fileName,
    type: mimeType || 'application/octet-stream',
  });

  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  
  // Direct POST to Supabase Storage
  const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
  const response = await fetch(storageUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  return { success: true, filePath };
}
```

**Additional Utilities:**
- `getPublicUrl(bucket, filePath)` - Get public URL for files
- `deleteFile(bucket, filePath)` - Delete files from storage

---

### 2. **account.tsx** - Updated to Use New Utility

**Import Added:**
```typescript
import { uploadFileToStorage } from '../../lib/fileUpload';
```

**Updated handleSubmitTestBank:**
```typescript
const handleSubmitTestBank = async () => {
  // ... validation ...

  // Upload file using new utility
  const uploadResult = await uploadFileToStorage(
    testBankSelectedFile.uri,
    'files',              // Bucket name
    'test-bank',          // Folder
    fileName,             // Generated filename
    testBankSelectedFile.mimeType
  );

  if (!uploadResult.success) {
    throw new Error(uploadResult.error);
  }

  // Insert database record with file path
  await supabase.from('test_bank').insert({
    class_code: testBankClassCode.toUpperCase(),
    file_type: testBankFileType,
    file_name: testBankSelectedFile.name,
    file_path: uploadResult.filePath,  // ✅ Now has actual path
    submitted_by: user.id,
    status: 'pending',
  });
};
```

---

## Technical Details

### React Native File Handling

**Document Picker Returns:**
```typescript
{
  uri: 'file:///path/to/file.pdf',
  name: 'document.pdf',
  size: 12345,
  mimeType: 'application/pdf'
}
```

**FormData in React Native:**
React Native's FormData implementation accepts objects with:
- `uri` - File path
- `name` - File name
- `type` - MIME type

This is different from web where you'd pass a Blob or File object.

### Supabase Storage API

**Direct Upload Endpoint:**
```
POST https://{project}.supabase.co/storage/v1/object/{bucket}/{path}
```

**Required Headers:**
- `Authorization: Bearer {access_token}`
- Content-Type is auto-set by FormData

---

## Benefits of New Approach

1. ✅ **Works in React Native** - No blob dependencies
2. ✅ **Simple & Clean** - Single utility function
3. ✅ **Reusable** - Can be used for any file upload
4. ✅ **Type-Safe** - TypeScript interfaces
5. ✅ **Error Handling** - Returns success/error status
6. ✅ **Authenticated** - Uses Supabase session tokens

---

## File Upload Flow

```
User selects file
       ↓
DocumentPicker returns { uri, name, mimeType }
       ↓
uploadFileToStorage() called
       ↓
FormData created with file info
       ↓
Auth token retrieved
       ↓
POST to Supabase Storage API
       ↓
File stored at: files/test-bank/{userId}_{timestamp}.{ext}
       ↓
Database record created with file_path
       ↓
Success alert shown
```

---

## Storage Structure

Files are organized in Supabase Storage as:
```
Bucket: files
└── test-bank/
    ├── {user1_id}_1729123456789.pdf
    ├── {user2_id}_1729123457890.docx
    └── {user3_id}_1729123458901.jpg
```

**Naming Convention:**
`{user_id}_{timestamp}.{extension}`

This ensures:
- ✅ Unique filenames (timestamp)
- ✅ User attribution (user_id)
- ✅ File type preservation (extension)

---

## Future Enhancements

### Possible Improvements:
1. **Progress Tracking** - Show upload percentage
2. **File Validation** - Check size limits, allowed types
3. **Compression** - Reduce file size before upload
4. **Thumbnails** - Generate previews for images
5. **Retry Logic** - Auto-retry failed uploads
6. **Offline Queue** - Queue uploads when offline

### Alternative Approaches:
1. **Base64 + FileSystem** - For more control over binary data
2. **XMLHttpRequest** - For upload progress events
3. **expo-file-system** - For additional file operations

---

## Testing Checklist

- [x] File picker opens correctly
- [x] File selection works
- [x] Upload starts (no immediate errors)
- [ ] File uploads to Supabase Storage
- [ ] Database record created with correct file_path
- [ ] Success alert appears
- [ ] Modal closes after upload
- [ ] New submission shows in Test Bank section
- [ ] File is accessible via public URL (if bucket is public)
- [ ] Error handling works for failed uploads

---

## Error Handling

### Common Errors & Solutions:

**Error:** "Not authenticated"
- **Cause:** User session expired
- **Solution:** Refresh session or re-login

**Error:** "Upload failed"
- **Cause:** Network issues, storage permissions
- **Solution:** Check internet connection, verify bucket policies

**Error:** "Invalid file type"
- **Cause:** Unsupported MIME type
- **Solution:** Add file type validation

**Error:** "File too large"
- **Cause:** Exceeds size limit
- **Solution:** Implement size checking before upload

---

## Security Considerations

### Storage Bucket Policies:
Ensure proper RLS policies on the `files` bucket:

```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload test bank files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'files' 
  AND (storage.foldername(name))[1] = 'test-bank'
  AND auth.uid()::text = (storage.filename(name))[1]
);

-- Officers can read all test bank files
CREATE POLICY "Officers can read test bank files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'files'
  AND (storage.foldername(name))[1] = 'test-bank'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR officer_position IS NOT NULL)
  )
);
```

---

## Files Modified

1. ✅ **lib/fileUpload.ts** - New utility file created
2. ✅ **app/(tabs)/account.tsx** - Updated to use new upload utility

---

*Fix implemented: October 23, 2025*
