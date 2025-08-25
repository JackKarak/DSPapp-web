# Admin Feedback RLS Error Fix

## 🚨 Issue
You're getting this error when submitting feedback:
```
{"code": "42501", "details": null, "hint": null, "message": "new row violates row-level security policy for table \"admin_feedback\""}
```

## 🔍 Root Cause
The Row-Level Security (RLS) policy requires that `auth.uid()::text = user_id`, but there might be:
1. Authentication context issues
2. User ID mismatch
3. Missing user profile in the `users` table
4. RLS policy configuration problems

## 🔧 Solutions (Try these in order)

### Solution 1: Run SQL Commands in Supabase Dashboard

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Check if admin_feedback table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'admin_feedback'
);

-- If it doesn't exist, create it:
CREATE TABLE IF NOT EXISTS public.admin_feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    has_attachment BOOLEAN DEFAULT FALSE,
    attachment_info JSONB,
    status TEXT DEFAULT 'pending',
    admin_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_feedback ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can submit their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.admin_feedback;
DROP POLICY IF EXISTS "Officers can view all feedback" ON public.admin_feedback;

-- Create permissive policies
CREATE POLICY "Users can submit their own feedback" ON public.admin_feedback
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (auth.uid()::text = user_id);

CREATE POLICY "Officers can view all feedback" ON public.admin_feedback
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::text 
            AND approved = true 
            AND (officer_position IS NOT NULL OR president = true)
        )
    );
```

### Solution 2: Create Bypass Function

```sql
-- Create a function that bypasses RLS
CREATE OR REPLACE FUNCTION public.submit_admin_feedback(
    subject TEXT,
    message TEXT,
    file_name TEXT DEFAULT NULL,
    file_size BIGINT DEFAULT NULL,
    file_type TEXT DEFAULT NULL,
    has_attachment BOOLEAN DEFAULT FALSE,
    attachment_info JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id TEXT;
    feedback_id BIGINT;
BEGIN
    current_user_id := auth.uid()::text;
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    INSERT INTO public.admin_feedback (
        user_id, subject, message, submitted_at,
        file_name, file_size, file_type, has_attachment, attachment_info
    ) VALUES (
        current_user_id, subject, message, NOW(),
        file_name, file_size, file_type, COALESCE(has_attachment, false), attachment_info
    )
    RETURNING id INTO feedback_id;
    
    RETURN json_build_object(
        'success', true,
        'feedback_id', feedback_id,
        'message', 'Feedback submitted successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_admin_feedback TO authenticated;
```

### Solution 3: Temporary RLS Disable (Quick Fix)

**⚠️ Only for testing - not recommended for production**

```sql
-- Temporarily disable RLS for testing
ALTER TABLE public.admin_feedback DISABLE ROW LEVEL SECURITY;
```

**Remember to re-enable it after testing:**
```sql
ALTER TABLE public.admin_feedback ENABLE ROW LEVEL SECURITY;
```

## 🧪 Testing Steps

1. **Check your authentication status** - The app now logs detailed info to console
2. **Try submitting feedback** - Look for console logs starting with 🔄, 👤, 📝, etc.
3. **Check if your user exists in the users table**
4. **Verify the user_id matches between auth.uid() and your users table**

## 📱 App Changes Made

I've updated your `account.tsx` with:
- ✅ Better error handling with specific error codes
- ✅ Detailed console logging for debugging  
- ✅ Fallback to stored procedure approach
- ✅ More specific error messages for users

## 🎯 Quick Test

After running the SQL commands above, try submitting feedback again. The console will show detailed logs like:
```
🔄 Starting feedback submission...
👤 Current user: authenticated
🆔 User ID: [your-user-id]
📝 Calling stored procedure with data: ...
✅ Function call successful: ...
```

## 🚨 If Nothing Works

Try this emergency bypass (temporarily):

1. Go to Supabase Dashboard → Authentication → Users
2. Note your user ID
3. Go to SQL Editor and run:
```sql
-- Check if you exist in users table
SELECT * FROM users WHERE user_id = '[your-user-id-here]';

-- If not found, you might need to create a user record:
INSERT INTO users (user_id, approved) VALUES ('[your-user-id-here]', true);
```

The updated code should now provide much more detailed error information to help pinpoint the exact issue!
