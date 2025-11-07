# DSP App - Clean Project Structure# DSPapp Project Structure



## Root Directory (Clean & Organized) ✅Complete file organization and architecture documentation for the Delta Sigma Phi mobile application.



```## 📱 Application Overview

DSPapp/

├── 📄 README.md                        # Main project documentationA React Native mobile app built with Expo for managing fraternity operations including events, attendance tracking, points system, and member management.

├── 📄 PRIVACY_POLICY.md                # Required for App Store

├── 📄 TERMS_OF_SERVICE.md              # Required for App Store---

├── 📄 CRITICAL_FIXES_COMPLETE.md       # ⭐ Latest fixes for production

├── 📄 CLEANUP_PLAN.md                  # This cleanup documentation## 📂 Root Directory Structure

│

├── 📁 app/                             # Expo Router screens```

│   ├── _layout.tsxDSPapp/

│   ├── index.tsx├── 📁 app/                    # Application routes (Expo Router file-based routing)

│   ├── (auth)/                         # Authentication├── 📁 assets/                 # Static assets (images, fonts, icons)

│   ├── (tabs)/                         # Member screens├── 📁 components/             # Reusable React components

│   ├── event/                          # Event details├── 📁 constants/              # App-wide constants

│   ├── officer/                        # Officer screens├── 📁 contexts/               # React Context providers

│   └── president/                      # President screens├── 📁 docs/                   # 📚 All documentation (NEW - organized)

│├── 📁 hooks/                  # Custom React hooks

├── 📁 components/                      # Reusable components├── 📁 lib/                    # Utility functions and libraries

├── 📁 hooks/                           # Custom hooks├── 📁 styles/                 # Shared stylesheet modules

├── 📁 lib/                             # Utilities├── 📁 supabase/              # Database migrations and functions

├── 📁 types/                           # TypeScript types├── 📁 types/                  # TypeScript type definitions

├── 📁 constants/                       # Constants├── 📁 android/                # Android native code

├── 📁 contexts/                        # React contexts├── 📁 ios/                    # iOS native code

├── 📁 styles/                          # Styles├── 📄 package.json            # Dependencies and scripts

├── 📁 assets/                          # Images, fonts├── 📄 tsconfig.json           # TypeScript configuration

├── 📁 ios/                             # iOS native├── 📄 app.config.js           # Expo configuration

├── 📁 docs/                            # ⭐ All documentation (organized)├── 📄 README.md               # Main project documentation

└── 📁 supabase/                        # Backend└── 📄 .gitignore              # Git ignore patterns

```

```

---

## Documentation Structure

## 🗺️ Detailed Directory Breakdown

```

docs/### `app/` - Application Routes

├── README.mdFile-based routing using Expo Router. Each file becomes a route.

├── archive/                            # ✅ Historical documentation

│   ├── ANALYTICS_REFACTOR_COMPLETE.md```

│   ├── POINTS_REFACTOR_COMPLETE.mdapp/

│   ├── ORGANIZATION_COMPLETE.md├── _layout.tsx                # Root layout wrapper

│   ├── POINTS_FIX_SUMMARY.md├── index.tsx                  # Root redirect handler

│   ├── PROFILE_FORM_FIXES.md│

│   └── PROJECT_STRUCTURE_OLD.md├── (auth)/                    # 🔐 Authentication screens (grouped route)

├── compliance/                         # ✅ Privacy & compliance│   ├── login.tsx             # Login screen

├── features/                           # ✅ Feature docs│   └── signup.tsx            # Registration screen

├── fixes/                              # ✅ Bug fixes│

└── guides/                             # ✅ Dev guides├── (tabs)/                    # 📱 Main app tabs (grouped route)

```│   ├── _layout.tsx           # Tab navigator layout

│   ├── index.tsx             # Events feed (Home)

## Cleanup Summary│   ├── points.tsx            # Points leaderboard

│   ├── newsletter.tsx        # Newsletter WebView

### ✅ Files Deleted│   ├── attendance.tsx        # Event check-in

1. `app/(tabs)/account.tsx.backup` - Old backup│   └── account.tsx           # User profile & settings

│

### ✅ Files Moved to docs/archive/├── event/                     # 🎉 Event detail pages

1. `ANALYTICS_REFACTOR_COMPLETE.md`│   └── [id].tsx              # Dynamic event detail page

2. `POINTS_REFACTOR_COMPLETE.md`│

3. `ORGANIZATION_COMPLETE.md`├── officer/                   # 👔 Officer-only pages

4. `POINTS_FIX_SUMMARY.md`│   ├── _layout.tsx           # Officer tab navigator

5. `PROFILE_FORM_FIXES.md`│   ├── index.tsx             # Officer dashboard

6. `PROJECT_STRUCTURE.md` (old version)│   ├── analytics.tsx         # Member analytics

│   ├── events.tsx            # Event management

### ✅ Files Kept in Root│   ├── historian.tsx         # Photo gallery

1. `README.md` - Main documentation│   ├── scholarship.tsx       # Test bank review

2. `PRIVACY_POLICY.md` - Legal requirement│   └── register.tsx          # Create events (officers)

3. `TERMS_OF_SERVICE.md` - Legal requirement│

4. `CRITICAL_FIXES_COMPLETE.md` - Latest production info ⭐└── president/                 # 👑 President-only pages

5. `CLEANUP_PLAN.md` - This file    ├── _layout.tsx           # President tab navigator

    ├── presidentindex.tsx    # President dashboard

## Result    ├── analytics.tsx         # Advanced analytics

    ├── approve.tsx           # Approve pending events

**Before Cleanup**: 11+ documentation files cluttering root    ├── override.tsx          # Point overrides

**After Cleanup**: 5 essential files in root ✅    └── register.tsx          # Create events (president)

```

All completed work and historical docs now in `docs/archive/`

**Route Access Control:**
- `(auth)/*` - Public routes
- `(tabs)/*` - Authenticated users only
- `officer/*` - Officers and President only
- `president/*` - President only

---

### `components/` - Reusable UI Components
Organized by feature domain.

```
components/
├── AccountModals/             # Modals for account features
│   ├── EventFeedbackModal.tsx    # Submit event feedback
│   ├── PointAppealModal.tsx      # Submit point appeal
│   └── TestBankModal.tsx         # Upload test bank files
│
├── AccountSections/           # Sections for account tab
│   ├── AnalyticsSection.tsx      # User analytics summary
│   ├── AppealsSection.tsx        # Point appeals list
│   ├── EventsSection.tsx         # Attended events list
│   ├── ProfileSection.tsx        # Profile information
│   └── TestBankSection.tsx       # Test bank submissions
│
├── AnalyticsComponents/       # Analytics visualization components
│   ├── index.ts                  # Barrel export
│   ├── MetricCard.tsx           # Single metric display
│   ├── PerformanceRow.tsx       # Member performance row
│   ├── EventRow.tsx             # Event analytics row
│   ├── DiversityCard.tsx        # Diversity metrics
│   ├── InsightCard.tsx          # Insight display
│   ├── DiversityScoreCard.tsx   # Diversity score
│   ├── AnalyticsSection.tsx     # Section wrapper
│   ├── DiversityPieChart.tsx    # Pie chart
│   ├── DistributionBarChart.tsx # Bar chart
│   └── CategoryPointsChart.tsx  # Category breakdown
│
├── AnalyticsComponents.tsx    # Legacy analytics (to be removed)
├── CalendarView.tsx           # Calendar grid view
├── CleanProfileComponents.tsx # Profile form components
├── DropdownSelect.tsx         # Reusable dropdown
├── ErrorBoundary.tsx          # Error boundary wrapper
├── EventCard.tsx              # Event card display
├── EventFilters.tsx           # Event filter UI
├── FeedbackNotification.tsx   # Feedback toast
├── FormComponents.tsx         # Form UI components
├── FormSections.tsx           # Form section wrappers
└── IOSCharts.tsx              # Chart components for iOS
```

---

### `constants/` - App-Wide Constants
Centralized constant values.

```
constants/
├── accountConstants.ts        # Account-related constants
├── colors.ts                 # Color palette
├── emojis.ts                 # Emoji constants (deprecated - being removed)
├── formConstants.ts          # Form validation constants
└── styles.ts                 # Shared style constants
```

---

### `contexts/` - React Context Providers
Global state management.

```
contexts/
└── AuthContext.tsx           # Authentication context (user session)
```

---

### `hooks/` - Custom React Hooks
Organized by feature domain for code reusability.

```
hooks/
├── index.ts                  # Barrel export for all hooks
│
├── account/                  # Account-related hooks
│   ├── useAccountData.ts
│   ├── useProfileEdit.ts
│   └── useTestBank.ts
│
├── analytics/                # Analytics hooks
│   ├── useAnalyticsData.ts
│   ├── useHealthMetrics.ts
│   ├── useMemberPerformance.ts
│   ├── useEventAnalytics.ts
│   ├── useCategoryBreakdown.ts
│   └── useDiversityMetrics.ts
│
├── appeals/                  # Point appeal hooks
│   └── useAppeals.ts
│
├── events/                   # Event-related hooks
│   ├── useEventForm.ts
│   ├── useEventList.ts
│   └── useEventDetails.ts
│
├── shared/                   # Shared utility hooks
│   ├── useAuth.ts
│   ├── useOfficerRole.ts
│   └── usePresidentRole.ts
│
└── ui/                       # UI-related hooks
    ├── useModal.ts
    └── useToast.ts
```

---

### `lib/` - Utility Libraries
Core utility functions and service integrations.

```
lib/
├── supabase.ts               # Supabase client initialization
├── auth.ts                   # Authentication utilities
├── dateUtils.ts              # Date/time handling (EST timezone conversions)
├── fileUpload.ts             # React Native file upload utilities
├── formValidation.ts         # Form validation functions
├── googleCalendar.ts         # Google Calendar integration
├── logger.ts                 # Logging utilities
├── memoryManagement.ts       # Memory optimization utilities
├── performance.ts            # Performance monitoring
├── secureAuth.ts             # Secure authentication helpers
├── simpleCalendar.ts         # Simple calendar utilities
└── accountDeletion.ts        # Account deletion service
```

**Key Utilities:**
- `dateUtils.ts` - Handles all EST timezone conversions for consistency
- `fileUpload.ts` - React Native compatible file uploads to Supabase Storage
- `supabase.ts` - Centralized Supabase client with proper configuration

---

### `styles/` - Shared Stylesheets
Modular stylesheet files.

```
styles/
└── registerForm.styles.ts    # Event registration form styles
```

---

### `types/` - TypeScript Definitions
Centralized type definitions.

```
types/
├── account.ts                # Account-related types
├── analytics.ts              # Analytics types
└── hooks.ts                  # Hook-related types
```

---

### `supabase/` - Backend Configuration
Database migrations and serverless functions.

```
supabase/
├── functions/                # Edge functions (serverless)
│   └── (future functions here)
│
└── migrations/               # Database schema migrations
    ├── 20250101_account_deletion.sql
    ├── 20250131_create_event_feedback.sql
    ├── 20250201_create_app_settings.sql
    ├── 20250811_enable_attendance_policies.sql
    ├── 20250815_create_admin_feedback_table.sql
    ├── 20250824_create_test_bank_table.sql
    ├── 20250824_add_is_non_event.sql
    ├── 20250828_add_profile_update_tracking.sql
    ├── 20251015_create_pledge_brother_rls_policies.sql
    ├── 20251015_add_check_in_code_column.sql
    ├── 20251016_create_officer_analytics_dashboard.sql
    ├── 20251016_fix_calculate_user_points_function.sql
    ├── 20251017_create_account_dashboard.sql
    ├── 20251017_create_points_dashboard.sql
    └── 20251023_create_point_appeals_table.sql
```

---

### `docs/` - Documentation (NEW - Organized)
All project documentation organized by category.

```
docs/
├── README.md                 # Documentation index
│
├── features/                 # Current feature documentation
│   ├── EVENT_FEEDBACK_IMPLEMENTATION.md
│   ├── FILTER_UI_MODERNIZATION.md
│   ├── POINT_APPEAL_FEATURE.md
│   ├── TEST_BANK_FILE_UPLOAD_FIX.md
│   └── TEST_BANK_UPLOAD_FIX.md
│
├── guides/                   # Development guides
│   ├── CONTENT_MODERATION.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── ERROR_BOUNDARY_GUIDE.md
│   ├── REGISTER_FORM_QUICK_REFERENCE.md
│   ├── SECURITY_AUDIT_RESULTS.md
│   └── TESTING_GUIDE.md
│
└── archive/                  # Historical documentation
    ├── ACCOUNT_OPTIMIZATION_NEWSLETTER_PATTERNS.md
    ├── ACCOUNT_OPTIMIZED_INTEGRATION_NOTE.md
    ├── ACCOUNT_TAB_FIXES_SUMMARY.md
    ├── ANALYTICS_EFFICIENCY_ANALYSIS.md
    ├── ANALYTICS_FIX_QUICK.md
    ├── ANALYTICS_FIX_VISUAL.md
    ├── ANALYTICS_MODULARIZATION_COMPLETE.md
    ├── ANALYTICS_NUMBERS_FIX.md
    ├── ANALYTICS_PROPS_FIXED.md
    ├── APPROVE_BUG_FIXES.md
    ├── FILTER_UI_BEFORE_AFTER.md
    ├── FILTER_UI_IMPROVEMENTS.md
    ├── HOOKS_IMPORT_PATH_FIX.md
    ├── HOOKS_ORGANIZATION.md
    ├── HOOKS_REORGANIZATION_SUMMARY.md
    ├── INDEX_TAB_EFFICIENCY_ANALYSIS.md
    ├── NEWSLETTER_PATTERNS_SUMMARY.md
    ├── QUICK_START_NEWSLETTER_PATTERNS.md
    ├── TEST_BANK_BEFORE_AFTER.md
    ├── TEST_BANK_IMPROVEMENTS.md
    ├── TEST_BANK_SECTION_GUIDE.md
    └── TEST_BANK_VISUAL_GUIDE.md
```

---

## 🗄️ Database Architecture

### Core Tables
```sql
users                 -- User profiles, roles, officer positions
events                -- Event details, metadata, approval status
attendance            -- Event attendance records
event_feedback        -- User feedback for events (ratings, comments)
point_appeal          -- Point appeal submissions
test_bank             -- Academic material uploads
admin_feedback        -- Admin announcements
app_settings          -- Global app configuration
```

### Key Database Functions
```sql
get_account_dashboard(p_user_id)         -- Fetch all account data
get_points_dashboard(p_user_id)          -- Fetch leaderboard
calculate_user_points(p_user_id)         -- Calculate user points
get_officer_analytics_dashboard()        -- Officer analytics
```

---

## 🚀 Deployment Structure

### Build Configurations
- **Development** - Local testing with Expo Go
- **Preview** - Internal testing builds
- **Production** - App Store releases

### Configuration Files
- `app.config.js` - Expo app configuration
- `eas.json` - EAS Build configuration
- `package.json` - Dependencies and scripts

---

## 📊 Code Metrics

### Component Organization
- **30+ Reusable Components**
- **3 Major Feature Domains** (Account, Analytics, Events)
- **6 Modal Components** for user interactions

### Hook Organization
- **5 Feature Domains** (account, analytics, appeals, events, shared)
- **15+ Custom Hooks** for code reuse

### Route Organization
- **3 Main Sections** ((auth), (tabs), officer/president)
- **15+ Pages** across all sections

---

## 🔐 Security Layers

1. **Row Level Security (RLS)** - Database-level access control
2. **Role-Based Access** - Officer/President route protection
3. **Authentication** - Supabase Auth with JWT tokens
4. **Input Validation** - Client and server-side validation
5. **Secure Storage** - Encrypted local storage for sensitive data

---

## 🛠️ Development Workflow

### File Naming Conventions
- **Routes**: `kebab-case.tsx` (e.g., `event-details.tsx`)
- **Components**: `PascalCase.tsx` (e.g., `EventCard.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `dateUtils.ts`)
- **Types**: `camelCase.ts` (e.g., `account.ts`)
- **Documentation**: `SCREAMING_SNAKE_CASE.md`

### Import Organization
```typescript
// 1. React & React Native imports
import React, { useState } from 'react';
import { View, Text } from 'react-native';

// 2. Third-party libraries
import { useRouter } from 'expo-router';

// 3. Internal utilities & constants
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

// 4. Components
import { EventCard } from '../../components/EventCard';

// 5. Types
import type { Event } from '../../types/account';
```

---

## 📈 Performance Optimizations

### Implemented Optimizations
- **React.memo** - Prevent unnecessary re-renders
- **useMemo/useCallback** - Memoize expensive computations
- **FlatList** - Virtualized lists for large datasets
- **Code Splitting** - Route-based code splitting via Expo Router
- **Image Optimization** - Compressed assets
- **Database Optimization** - Single RPC calls vs multiple queries

### Memory Management
- Cleanup subscriptions in useEffect
- Debounce search inputs
- Lazy load images
- Clear timers and intervals

---

## 🎯 Future Improvements

### Code Organization
- [ ] Consolidate duplicate analytics components
- [ ] Create shared modal wrapper component
- [ ] Standardize error handling across all screens
- [ ] Implement comprehensive logging system

### Documentation
- [ ] Add JSDoc comments to all utilities
- [ ] Create API documentation
- [ ] Document all custom hooks
- [ ] Create component Storybook

### Testing
- [ ] Unit tests for utilities
- [ ] Integration tests for critical flows
- [ ] E2E tests for main user journeys

---

## 📚 Additional Resources

- [Main README](../README.md) - Project setup and overview
- [Documentation Index](docs/README.md) - All documentation
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated:** October 23, 2025  
**Version:** 3.0  
**Maintainer:** Development Team
