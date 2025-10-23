# DSPapp Documentation

Welcome to the DSPapp documentation. This folder contains all organized documentation for the Delta Sigma Phi fraternity management application.

## 📁 Documentation Structure

### `/features/` - Feature Documentation
Current implementation details for major features:
- **EVENT_FEEDBACK_IMPLEMENTATION.md** - Event feedback system with ratings and questions
- **POINT_APPEAL_FEATURE.md** - Point appeal system for disputing attendance
- **TEST_BANK_UPLOAD_FIX.md** - Test bank file upload functionality
- **TEST_BANK_FILE_UPLOAD_FIX.md** - React Native file upload implementation
- **FILTER_UI_MODERNIZATION.md** - Modern filter UI without emojis

### `/guides/` - Development Guides
Essential guides for development and maintenance:
- **ERROR_BOUNDARY_GUIDE.md** - Error handling implementation
- **REGISTER_FORM_QUICK_REFERENCE.md** - Event registration form reference
- **TESTING_GUIDE.md** - Testing procedures and best practices
- **DEPLOYMENT_CHECKLIST.md** - Deployment steps and verification
- **CONTENT_MODERATION.md** - Content moderation policies
- **SECURITY_AUDIT_RESULTS.md** - Security audit findings

### `/archive/` - Historical Documentation
Older documentation kept for reference (completed work, bug fixes, optimization notes)

## 🗂️ Project Structure

```
DSPapp/
├── app/                    # Application routes (Expo Router)
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs (Index, Points, Newsletter, Attendance, Account)
│   ├── event/             # Event detail pages
│   ├── officer/           # Officer-only pages
│   └── president/         # President-only pages
│
├── components/            # Reusable UI components
│   ├── AccountModals/    # Modals for account features
│   ├── AccountSections/  # Account tab sections
│   └── AnalyticsComponents/ # Analytics visualization components
│
├── constants/            # App constants (colors, styles, emojis, form constants)
├── contexts/             # React contexts (AuthContext)
├── hooks/                # Custom React hooks
│   ├── account/         # Account-related hooks
│   ├── analytics/       # Analytics hooks
│   ├── appeals/         # Appeal hooks
│   ├── events/          # Event hooks
│   ├── shared/          # Shared hooks
│   └── ui/              # UI hooks
│
├── lib/                  # Utility libraries
│   ├── supabase.ts      # Supabase client
│   ├── auth.ts          # Authentication utilities
│   ├── dateUtils.ts     # Date/time handling (EST timezone)
│   ├── fileUpload.ts    # React Native file uploads
│   ├── formValidation.ts # Form validation
│   └── ...
│
├── styles/               # Shared styles
├── types/                # TypeScript type definitions
├── supabase/            # Supabase database
│   ├── functions/       # Edge functions
│   └── migrations/      # Database migrations
│
├── assets/              # Images, fonts, icons
├── android/             # Android native code
└── ios/                 # iOS native code
```

## 🎯 Key Features

### User Features
- **Event Management** - View, register, and check-in to events
- **Points System** - Track attendance points with leaderboard
- **Newsletter** - Read fraternity newsletters
- **Account Dashboard** - Personal analytics and event history
- **Event Feedback** - Submit ratings and feedback for attended events
- **Point Appeals** - Appeal missing attendance points
- **Test Bank** - Access and submit academic materials

### Officer Features
- **Member Management** - View and manage all members
- **Event Creation** - Create and manage events
- **Attendance Tracking** - Mark attendance manually
- **Analytics Dashboard** - View member and event statistics
- **Scholarship Management** - Review test bank submissions

### President Features
- **Event Approval** - Approve/deny events before publishing
- **Advanced Analytics** - Comprehensive fraternity analytics
- **Member Oversight** - View all member activity
- **Point Overrides** - Manually adjust member points
- **Appeal Reviews** - Approve/deny point appeals

## 🔧 Technology Stack

### Frontend
- **React Native** - Cross-platform mobile framework
- **Expo** - Development and build platform
- **TypeScript** - Type safety
- **Expo Router** - File-based routing

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Storage buckets
  - Edge functions

### Key Libraries
- `react-native-chart-kit` - Charts and visualizations
- `expo-document-picker` - File selection
- `@react-native-community/datetimepicker` - Date/time pickers
- `react-native-confetti-cannon` - Celebration effects

## 📱 App Navigation Structure

```
Main Tabs (All Users):
├── Index (Events Feed)
├── Points (Leaderboard)
├── Newsletter
├── Attendance (Check-in)
└── Account (Profile & Settings)

Officer Tabs (Officers Only):
├── Officer Home
├── Events Management
├── Analytics
├── Historian (Photo Gallery)
├── Scholarship (Test Bank)
└── Registration (Create Events)

President Tabs (President Only):
├── President Home
├── Approve Events
├── Analytics (Advanced)
├── Override Points
└── Registration (Create Events)
```

## 🗄️ Database Structure

### Core Tables
- `users` - User profiles and officer positions
- `events` - Event details and metadata
- `attendance` - Event attendance records
- `event_feedback` - User feedback for events
- `point_appeal` - Point appeal submissions
- `test_bank` - Academic material submissions
- `admin_feedback` - Admin announcements
- `app_settings` - Global app configuration

### Key Functions
- `get_account_dashboard(p_user_id)` - Fetch all account data in one call
- `get_points_dashboard(p_user_id)` - Fetch points leaderboard
- `calculate_user_points(p_user_id)` - Calculate total points for user

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Role-Based Access Control** - Officer and President permissions
- **Secure Authentication** - Supabase Auth with JWT
- **Input Validation** - Client and server-side validation
- **Content Moderation** - Admin review system

## 🚀 Getting Started

1. **Clone Repository**
   ```bash
   git clone https://github.com/JackKarak/DSPapp.git
   cd DSPapp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Add Supabase URL and anon key

4. **Run Development Server**
   ```bash
   npx expo start
   ```

5. **Run on Device**
   - Scan QR code with Expo Go app
   - Or press `a` for Android, `i` for iOS simulator

## 📖 Additional Resources

- **Main README.md** - Project overview and setup
- **PRIVACY_POLICY.md** - User privacy policy
- **TERMS_OF_SERVICE.md** - Terms of service

## 🤝 Contributing

This is a private fraternity management application. For feature requests or bug reports, contact the development team.

## 📝 Documentation Updates

When adding new features or making significant changes:
1. Document the feature in `/docs/features/`
2. Update relevant guides in `/docs/guides/`
3. Archive old documentation in `/docs/archive/`
4. Update this README with new information

---

Last Updated: October 23, 2025
