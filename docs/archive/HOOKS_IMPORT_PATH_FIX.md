# 🔧 Hooks Import Path Fix

## Issue
After reorganizing hooks into feature-based folders, all import paths were incorrect.

**Error:**
```
Unable to resolve "../lib/supabase" from "hooks\shared\useOfficerRole.ts"
```

## Root Cause
Hooks were moved from:
```
hooks/
  useOfficerRole.ts        // Old location (1 level deep)
```

To:
```
hooks/
  shared/
    useOfficerRole.ts      // New location (2 levels deep)
```

But import paths still used `../lib/` (go up 1 level) instead of `../../lib/` (go up 2 levels).

## Files Fixed (6 total)

### 1. ✅ `hooks/shared/useOfficerRole.ts`
```diff
- import { supabase } from '../lib/supabase';
+ import { supabase } from '../../lib/supabase';
```

### 2. ✅ `hooks/account/useAccountData.ts`
```diff
- import { supabase } from '../lib/supabase';
- import { checkAuthentication, handleAuthenticationRedirect } from '../lib/auth';
+ import { supabase } from '../../lib/supabase';
+ import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
```

### 3. ✅ `hooks/account/useProfileEdit.ts`
```diff
- import { supabase } from '../lib/supabase';
- import { checkAuthentication, handleAuthenticationRedirect } from '../lib/auth';
- import { formatDateInEST } from '../lib/dateUtils';
+ import { supabase } from '../../lib/supabase';
+ import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
+ import { formatDateInEST } from '../../lib/dateUtils';
```

### 4. ✅ `hooks/appeals/usePointAppeals.ts`
```diff
- import { supabase } from '../lib/supabase';
- import { checkAuthentication, handleAuthenticationRedirect } from '../lib/auth';
+ import { supabase } from '../../lib/supabase';
+ import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
```

### 5. ✅ `hooks/events/useEventForm.ts`
```diff
- import { supabase } from '../lib/supabase';
- import { combineDateAndTime, getESTISOString, roundToNearestMinute } from '../lib/dateUtils';
- } from '../lib/formValidation';
+ import { supabase } from '../../lib/supabase';
+ import { combineDateAndTime, getESTISOString, roundToNearestMinute } from '../../lib/dateUtils';
+ } from '../../lib/formValidation';
```

### 6. ✅ `hooks/events/useEventFeedback.ts`
```diff
- import { supabase } from '../lib/supabase';
- import { checkAuthentication, handleAuthenticationRedirect } from '../lib/auth';
+ import { supabase } from '../../lib/supabase';
+ import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
```

## Directory Structure Reference

```
DSPapp/
├── lib/
│   ├── supabase.ts
│   ├── auth.ts
│   ├── dateUtils.ts
│   └── formValidation.ts
├── types/
│   ├── account.ts
│   └── hooks.ts
├── constants/
│   ├── accountConstants.ts
│   └── formConstants.ts
└── hooks/
    ├── index.ts                    (barrel export)
    ├── account/
    │   ├── index.ts
    │   ├── useAccountData.ts       ✅ Fixed
    │   └── useProfileEdit.ts       ✅ Fixed
    ├── appeals/
    │   ├── index.ts
    │   └── usePointAppeals.ts      ✅ Fixed
    ├── events/
    │   ├── index.ts
    │   ├── useEventForm.ts         ✅ Fixed
    │   └── useEventFeedback.ts     ✅ Fixed
    ├── shared/
    │   ├── index.ts
    │   └── useOfficerRole.ts       ✅ Fixed
    └── ui/
        ├── index.ts
        └── useModalManager.ts
```

## Import Path Rules

From `hooks/[feature]/[file].ts`:
- ✅ `../../lib/` → Go up 2 levels to reach lib/
- ✅ `../../types/` → Go up 2 levels to reach types/
- ✅ `../../constants/` → Go up 2 levels to reach constants/

From `hooks/index.ts` (barrel):
- ✅ `./account/` → Same level, into folder
- ✅ `./appeals/` → Same level, into folder
- ✅ `./events/` → Same level, into folder

From `app/[...]/[file].tsx`:
- ✅ `../../hooks/` → Import from barrel
- ✅ `../../hooks/account/` → Direct import (if needed)

## Status

✅ **All import paths fixed**  
✅ **0 TypeScript errors**  
✅ **App should now build successfully**

## Next Steps

Run the app to confirm:
```bash
npx expo start --tunnel
```

The error should be resolved and the app should build successfully!
