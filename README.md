# The DSP App 🏛️
**Official Mobile Application for Delta Sigma Pi Professional Business Fraternity**

[![Expo](https://img.shields.io/badge/Expo-SDK%2051-blue.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.com/)

The DSP App is a comprehensive mobile platform designed to enhance professional development and fraternity life for Delta Sigma Pi members through digital engagement, business networking, and professional achievement tracking tools.

## 🎯 Purpose & Mission

This application serves as the central hub for Delta Sigma Pi chapter operations, providing:
- **Professional Development**: Career-focused event tracking and skill-building opportunities
- **Business Networking**: Connect with fellow professionals and alumni in the business community
- **Communication**: Real-time chapter updates, announcements, and professional content
- **Achievement System**: Points-based recognition for professional development and chapter involvement
- **Administrative Tools**: Officer management capabilities and chapter oversight
- **Career Advancement**: Features that support members' professional growth and business success

## ✨ Key Features

### 📅 Professional Event Management
- **Business Events**: Professional development workshops, networking events, and career seminars
- **Attendance Tracking**: QR code check-ins and automated professional development points
- **Calendar Integration**: Sync professional events with personal Google Calendar
- **Event History**: Complete record of professional development participation

### 🏆 Professional Achievement & Points System
- **Point Accumulation**: Earn points for professional development activities and chapter participation
- **Professional Ranking**: Chapter-wide leaderboards and peer comparison for professional growth
- **Achievement Badges**: Unlock milestones for career development, leadership, and business skills
- **Appeal Process**: Contest attendance records through officer review

### 👥 Professional Member Portal
- **Profile Management**: Professional information, academic details, and career status
- **Membership Verification**: Secure identity verification for members and pledges
- **Role-Based Access**: Different features for members, officers, and administrators
- **Privacy Controls**: Granular settings for professional information sharing and notifications

### 🔧 Officer & Leadership Tools
- **Event Management**: Create, modify, and track professional development event attendance
- **Member Analytics**: Comprehensive engagement statistics and professional development trends
- **Approval Systems**: Review and process member appeals and professional development requests
- **Administrative Dashboard**: Chapter overview and professional development management capabilities

### 📰 Professional Communication Hub
- **Newsletter Access**: Integrated chapter newsletter and professional development announcements
- **Push Notifications**: Real-time alerts for business events and important professional updates
- **Official Communications**: Direct channel for chapter leadership and professional development messages

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn package manager
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JackKarak/DSPapp.git
   cd DSPapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with required configuration:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_CALENDAR_API_KEY=your_google_calendar_key
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

### Running the App

Choose your preferred development environment:
- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal  
- **Physical Device**: Scan the QR code with Expo Go app
- **Web Browser**: Press `w` for web development

## 🏗️ Technical Architecture

### Frontend Stack
- **React Native**: Cross-platform mobile development
- **Expo SDK 51**: Development platform and toolchain
- **TypeScript**: Type-safe JavaScript development
- **Expo Router**: File-based navigation system
- **React Native Elements**: UI component library

### Backend & Services
- **Supabase**: PostgreSQL database with real-time capabilities
- **Row Level Security**: Database-level access control
- **Supabase Auth**: User authentication and session management
- **Google Calendar API**: Professional event synchronization (optional)

### Database Schema
```sql
-- Core tables
users (member profiles and authentication)
events (professional development events and business activities)
attendance (event check-in records)
appeals (attendance dispute system)
app_settings (configuration management)

-- Legacy migration tables
brother (historical member data)
pledge (pledge class information)
```

### Key Dependencies
```json
{
  "@expo/vector-icons": "^14.0.2",
  "@react-native-picker/picker": "^2.7.5",
  "@supabase/supabase-js": "^2.45.0",
  "expo-router": "~3.5.23",
  "react-native-qrcode-svg": "^6.3.1",
  "react-native-webview": "^13.8.6"
}
```

## 📱 App Structure

```
app/
├── (auth)/              # Authentication screens
│   ├── login.tsx        # Member login
│   └── signup.tsx       # New member registration
├── (tabs)/              # Main navigation tabs
│   ├── index.tsx        # Professional event dashboard
│   ├── attendance.tsx   # Attendance tracking
│   ├── points.tsx       # Professional development points and achievements
│   ├── account.tsx      # Profile management
│   └── newsletter.tsx   # Professional communications
├── officer/             # Officer-only features
│   ├── analytics.tsx    # Member engagement analytics
│   ├── events.tsx       # Professional event management
│   └── approve.tsx      # Appeal approvals
└── president/           # Presidential tools
    ├── analytics.tsx    # Chapter oversight
    └── override.tsx     # Administrative overrides
```

## 🔐 Security & Privacy

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Authentication**: Secure user verification and session management
- **Role-Based Access**: Granular permissions based on member status
- **Privacy Controls**: User-controlled information sharing settings

### Compliance
- **GDPR**: Full compliance for international members
- **COPPA**: Age verification and child privacy protection
- **FERPA**: Educational record privacy compliance
- **University Policies**: Adherence to institutional requirements

For detailed information, see our [Privacy Policy](PRIVACY_POLICY.md) and [Terms of Service](TERMS_OF_SERVICE.md).

## 🎓 User Roles & Permissions

| Role | Event Access | Officer Tools | Analytics | Member Data |
|------|-------------|---------------|-----------|-------------|
| **Pledge** | View & Attend | ❌ | Personal Only | Own Profile |
| **Member** | View & Attend | ❌ | Personal Only | Own Profile |
| **Officer** | Full Access | ✅ | Chapter Stats | Member Management |
| **Admin** | Full Access | ✅ | All Analytics | Full Access |

## 📊 Development & Deployment

### Development Workflow
```bash
# Start development server
npm start

# Type checking
npm run type-check

# Build for production
npm run build

# Run tests
npm test
```

### Deployment
- **iOS**: App Store distribution via Expo Application Services (EAS)
- **Android**: Google Play Store via EAS Build
- **Updates**: Over-the-air updates for non-native changes

### Environment Management
- **Development**: Local Supabase instance
- **Staging**: Supabase staging environment
- **Production**: Production Supabase with full security

## 🤝 Contributing

### For Developers
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TypeScript and React Native best practices
4. Ensure all tests pass and types are correct
5. Submit a pull request with detailed description

### For Chapter Officers
- Report bugs through the in-app feedback system
- Request features via chapter leadership channels
- Provide user experience feedback and suggestions

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Automated code quality and style enforcement
- **Prettier**: Consistent code formatting
- **Component Structure**: Functional components with hooks

## 📚 Documentation

- **[Privacy Policy](PRIVACY_POLICY.md)**: Data handling and user rights
- **[Terms of Service](TERMS_OF_SERVICE.md)**: Usage guidelines and legal terms
- **[Content Guidelines](CONTENT_MODERATION.md)**: Community standards
- **API Documentation**: Supabase schema and endpoints
- **User Guide**: In-app help and feature explanations

## 🆘 Support & Contact

### Technical Support
- **In-App**: Use the feedback system within the app
- **Email**: support@deltasigmaphi.org
- **Chapter Officers**: Contact your local technology coordinator

### Bug Reports
Please include:
- Device information (iOS/Android version)
- App version number
- Steps to reproduce the issue
- Screenshots if applicable

### Feature Requests
- Submit through chapter leadership
- Include detailed use case and expected behavior
- Consider impact on user experience and privacy

## 📄 License

This project is proprietary software owned by Delta Sigma Phi fraternity. Unauthorized reproduction, distribution, or modification is prohibited.

### Third-Party Licenses
This project uses various open-source libraries. See individual package licenses for details.

## 🏛️ About Delta Sigma Pi

Delta Sigma Pi is the premier professional business fraternity, founded in 1907, committed to fostering the study of business in universities and encouraging scholarship, social activity, and the association of students for their mutual advancement by research and practice. The DSP App embodies these values by facilitating meaningful professional connections, business skill development tracking, and career advancement opportunities.

**Mission**: To foster the study of business in universities; to encourage scholarship, social activity and the association of students for their mutual advancement by research and practice; to promote closer affiliation between the commercial world and students of commerce, and to further a higher standard of commercial ethics and culture and the civic and commercial welfare of the community.

---

**Developed with ❤️ for the professional men and women of Delta Sigma Pi**

*This application is continuously evolving to serve our professional business fraternity community better. Your feedback and involvement drive our improvements and innovations.*
