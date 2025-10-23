# Account Screen - Modular Structure

## Overview
The account screen has been refactored to follow the same clean, modular pattern as the points screen.

## Directory Structure

```
app/(tabs)/account/
├── index.tsx                 # Main entry point (946 lines)
├── hooks/                    # Custom hooks for data & logic
│   └── useAccountData.ts    # Data fetching & state management (ready for future use)
├── components/              # UI components (currently using shared components)
│   └── (future component files)
├── styles/                  # Centralized styles
│   └── accountStyles.ts    # All account-specific styles
└── README.md               # This file
```

## Current State

### ✅ Completed
- Created modular directory structure
- Organized imports with relative paths
- Created `useAccountData` hook (ready for extraction)
- Created centralized styles file
- All functionality preserved from original

### 📦 Using Shared Components
The account screen currently uses shared components from:
- `components/AccountSections/` - Profile, Analytics, Events, Appeals, TestBank
- `components/AccountModals/` - TestBank, PointAppeal, EventFeedback, DataConsent

### 🚀 Future Improvements

**Phase 2** - Extract logic to hook:
- Move state management to `useAccountData.ts`
- Move handlers to custom hooks
- Reduce main file from 946 → ~200 lines

**Phase 3** - Create local components:
- Move section components to `components/`
- Customize for account-specific needs
- Better component composition

**Phase 4** - Add constants:
- Create `constants/` folder
- Extract configuration values
- Add TypeScript types

## Benefits of Current Structure

1. **Organized** - Clear separation of concerns
2. **Maintainable** - Easy to find and update code
3. **Scalable** - Room to grow without cluttering
4. **Consistent** - Matches points screen pattern
5. **Testable** - Hooks and components can be tested separately

## Usage

The account screen is accessed via the tab navigator:
```tsx
import AccountScreen from './(tabs)/account';
```

All functionality remains identical to the previous version, but now with better organization for future development.

## Key Features

- **Profile Management** - Edit profile with 7-day cooldown
- **Data Consent** - GDPR-compliant data collection
- **Analytics Dashboard** - Personal achievement tracking
- **Event Management** - View attended events & provide feedback
- **Appeals System** - Submit point appeals with evidence
- **Test Bank** - Upload and manage test materials

## Next Steps

To continue the refactoring:
1. Gradually move logic from `index.tsx` to `useAccountData.ts`
2. Create focused components in `components/` folder
3. Extract constants to `constants/` folder
4. Add comprehensive TypeScript types
